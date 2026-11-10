import { load } from "./model";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  recordAttempt,
  recordTaskCompletion,
  correctAttempt,
  deleteAttempt,
  undoLatest,
  taskCounts,
  goalFor,
  rewardKey,
  buyItem,
  buyAndUseBasic,
  taskFinishedToday,
  equipOutfit,
  OUTFITS,
  OUTFIT_IDS,
  SUPPLY_IDS,
  emptyInventory,
  decay,
  complete,
  due,
  stage,
  dateKey,
  shiftDate,
  localDate,
  validState,
  parseState,
  setOutcome,
  saveTask,
  deleteTask,
  addCollection,
  updateCollection,
  deleteCollection,
  changeSettings,
  revive,
  streak,
  BALANCE,
  headPat,
  buySupply,
  useSupply,
  petRhythm,
  sortTodayTasks,
  taskDue,
  addVacationRange,
  removeVacationDay,
  isVacationDay,
  taskPeriod,
  taskDeadlineLabel,
  SUPPLIES,
  type State,
  type Task,
  type Care,
} from "./model";
import { jarBalls } from "./jarModel";
const now = +new Date(2026, 9, 25, 12),
  hour = 3600000;
const task = (id = "a", patch: Partial<Task> = {}): Task => ({
  id,
  name: "Water " + id,
  description: "",
  time: "08:00",
  repeat: "daily",
  days: [],
  date: dateKey(now),
  category: "water",
  createdAt: now,
  ...patch,
});
function setup(
  n = now,
  care: Care = { food: 85, water: 85, clean: 90, happy: 90 },
) {
  const s = initial(n);
  s.care = { ...care };
  s.baseline.care = { ...care };
  s.tasks = [task("a", { date: dateKey(n), createdAt: n })];
  return s;
}
const reload = (s: State, n = now) => {
  const result = parseState(JSON.parse(JSON.stringify(s)), n);
  assert.ok(result);
  return result;
};
test("new users get 24 hours of passive decay grace", () => {
  const s = setup();
  s.tasks = [];
  assert.deepEqual(decay(s, now + 23 * hour).care, s.care);
});
test("passive decay is timestamp based and refresh idempotent", () => {
  const s = setup(now - 72 * hour);
  s.tasks = [];
  const a = decay(s, now);
  assert.ok(Math.abs(a.care.water - (85 - 48 * 1.1)) < 0.00001);
  assert.deepEqual(decay(a, now).care, a.care);
  assert.deepEqual(reload(a).care, a.care);
});
test("all six health stages remain available", () => {
  for (const [value, expected] of [
    [90, 0],
    [60, 1],
    [40, 2],
    [20, 3],
    [5, 4],
    [0, 5],
  ]) {
    const s = setup();
    s.settings.cozy = false;
    s.care = { food: value, water: value, clean: value, happy: value };
    assert.equal(stage(s), expected);
  }
});
test("positive earns 5 coins without direct care, while a miss applies -8", () => {
  const s = setup();
  const positive = complete(s, "a", now);
  assert.equal(positive.care.water, 85);
  assert.equal(positive.coins, 5);
  assert.equal(positive.care.happy, 90);
  assert.equal(positive.completions.length, 1);
  const negative = setOutcome(s, "a", dateKey(now), "missed", now);
  assert.equal(negative.care.water, 77);
  assert.equal(negative.completions.length, 0);
});
test("repeat clicks cannot stack rewards or penalties", () => {
  const s = setup();
  const a = complete(s, "a", now);
  assert.deepEqual(complete(a, "a", now).care, a.care);
  assert.equal(complete(a, "a", now).completions.length, 1);
  const b = setOutcome(s, "a", dateKey(now), "missed", now);
  assert.deepEqual(
    setOutcome(b, "a", dateKey(now), "missed", now).care,
    b.care,
  );
  assert.equal(b.outcomes.length, 1);
});
test("undo at the 100 cap restores the original value, rather than subtracting 10", () => {
  const s = setup();
  s.care.water = s.baseline.care.water = 97;
  const recorded = complete(s, "a", now);
  const a = parseState(
    {
      ...recorded,
      version: 2,
      outcomes: recorded.outcomes.map(({ rewardCare, rewardCoins, ...o }) => o),
    },
    now,
  )!;
  assert.equal(a.care.water, 100);
  const b = setOutcome(a, "a", dateKey(now), "pending", now);
  assert.equal(b.care.water, 97);
  assert.equal(b.completions.length, 0);
  assert.equal(b.outcomes[0].status, "pending");
  assert.deepEqual(reload(b).care, b.care);
});
test("both outcome switches reverse the original effect and preserve one occurrence", () => {
  const s = setup();
  let a = complete(s, "a", now);
  a = setOutcome(a, "a", dateKey(now), "missed", now);
  assert.equal(a.care.water, 77);
  assert.equal(a.completions.length, 0);
  a = complete(a, "a", now);
  assert.equal(a.care.water, 85);
  assert.equal(a.coins, 5);
  assert.equal(a.completions.length, 1);
  assert.equal(a.outcomes.length, 1);
  a = setOutcome(a, "a", dateKey(now), "pending", now);
  assert.equal(a.care.water, 85);
});
test("multiple capped transactions replay correctly when an earlier one is undone", () => {
  const s = setup();
  s.tasks.push(task("b"));
  let a = complete(s, "a", now);
  a = complete(a, "b", now + 100);
  a = parseState(
    {
      ...a,
      version: 2,
      outcomes: a.outcomes.map(({ rewardCare, rewardCoins, ...o }) => o),
    },
    now + 100,
  )!;
  assert.equal(a.care.water, 100);
  a = setOutcome(a, "a", dateKey(now), "pending", now + 100);
  assert.equal(a.care.water, 95);
  assert.equal(a.completions.length, 1);
});
test("daily, weekly, selected weekdays, one-time and start dates use local calendar days", () => {
  assert.equal(
    due(
      task("a", { repeat: "weekly" }),
      +localDate(shiftDate(dateKey(now), 1)),
    ),
    false,
  );
  assert.equal(
    due(
      task("a", { repeat: "weekly" }),
      +localDate(shiftDate(dateKey(now), 7)),
    ),
    true,
  );
  assert.equal(
    due(task("a", { repeat: "selected", days: [new Date(now).getDay()] }), now),
    true,
  );
  assert.equal(
    due(task("a", { repeat: "once" }), +localDate(shiftDate(dateKey(now), 1))),
    false,
  );
  assert.equal(
    due(task("a", { date: shiftDate(dateKey(now), 1) }), now),
    false,
  );
});
test("automatic misses reconcile multiple days once and reset today to pending", () => {
  const s = setup();
  const later = +localDate(shiftDate(dateKey(now), 3));
  const a = decay(s, later);
  assert.equal(a.outcomes.length, 3);
  assert.ok(a.outcomes.every((o) => o.status === "missed" && o.automatic));
  assert.equal(a.completions.length, 0);
  const b = reload(a, later);
  assert.equal(b.outcomes.length, 3);
  assert.deepEqual(b.care, a.care);
  const c = complete(b, "a", later);
  assert.equal(c.outcomes.length, 4);
  assert.equal(c.completions[0].date, dateKey(later));
});
test("days without scheduled tasks have no penalties", () => {
  const s = setup();
  s.tasks = [
    task("once", { repeat: "once" }),
    task("selected", { repeat: "selected", days: [new Date(now).getDay()] }),
  ];
  const a = decay(s, +localDate(shiftDate(dateKey(now), 3)));
  assert.equal(a.outcomes.length, 2);
  assert.ok(a.outcomes.every((o) => o.date === dateKey(now)));
});
test("a backdated new task cannot be missed before its creation", () => {
  let s = setup();
  s.tasks = [];
  const created = +localDate(shiftDate(dateKey(now), 4));
  s = saveTask(s, task("new", { date: dateKey(now) }), created);
  assert.equal(s.tasks[0].createdAt, created);
  const a = decay(s, +localDate(shiftDate(dateKey(now), 5)));
  assert.equal(a.outcomes.length, 1);
  assert.equal(a.outcomes[0].date, dateKey(created));
});
test("past-day correction changes the original jar and does not create a reward today", () => {
  const later = +localDate(shiftDate(dateKey(now), 2));
  const a = decay(setup(), later);
  const b = setOutcome(a, "a", dateKey(now), "completed", later);
  assert.equal(b.completions.length, 1);
  assert.equal(b.completions[0].date, dateKey(now));
  assert.ok(b.care.water > a.care.water);
  assert.equal(b.outcomes.length, 2);
  const c = setOutcome(b, "a", dateKey(now), "pending", later);
  assert.equal(c.completions.length, 0);
  assert.equal(reload(c, later).outcomes[0].status, "pending");
  assert.equal(decay(c, later + 1000).outcomes[0].status, "pending");
});
test("edits and deletions settle old schedules and preserve historical snapshots", () => {
  const later = +localDate(shiftDate(dateKey(now), 2));
  let s = saveTask(
    setup(),
    task("a", {
      name: "New name",
      category: "food",
      repeat: "selected",
      days: [],
    }),
    later,
  );
  assert.equal(s.outcomes.length, 2);
  assert.equal(s.outcomes[0].name, "Water a");
  assert.equal(s.outcomes[0].category, "water");
  s = deleteTask(s, "a", later);
  assert.equal(s.tasks.length, 0);
  s = setOutcome(s, "a", dateKey(now), "completed", later);
  assert.equal(s.completions[0].name, "Water a");
  assert.equal(s.completions[0].category, "water");
});
test("many misses have a daily and per-category cushion; undo redistributes it deterministically", () => {
  const s = setup();
  s.tasks = Array.from({ length: 30 }, (_, i) =>
    task(String(i), { category: i < 15 ? "water" : "food" }),
  );
  let a = s;
  for (const t of s.tasks) a = setOutcome(a, t.id, dateKey(now), "missed", now);
  const loss = s.care.water - a.care.water + s.care.food - a.care.food;
  assert.equal(loss, BALANCE.maxMissedPerDay);
  assert.ok(s.care.water - a.care.water <= BALANCE.maxMissedPerCategoryPerDay);
  a = setOutcome(a, "0", dateKey(now), "pending", now);
  assert.equal(s.care.water - a.care.water + s.care.food - a.care.food, 24);
  assert.deepEqual(reload(a).care, a.care);
});
test("single missed task cannot kill a weak pet; cozy mode always keeps energy", () => {
  let s = setup(now, { food: 1, water: 1, clean: 1, happy: 1 });
  s.settings.cozy = false;
  s.baseline.cozy = false;
  const a = setOutcome(s, "a", dateKey(now), "missed", now);
  assert.notEqual(stage(a), 5);
  assert.equal(a.care.water, 1);
  const cozy = decay(setup(), now + 30 * 86400000);
  assert.equal(stage(cozy), 4);
  assert.ok(Object.values(cozy.care).every((v) => v >= 5));
});
test("extended passive neglect allows death and revival retains task outcomes", () => {
  let s = setup();
  s = changeSettings(s, { cozy: false }, now);
  s = decay(s, now + 30 * 86400000);
  assert.equal(stage(s), 5);
  const count = s.outcomes.length;
  s = revive(s, now + 30 * 86400000);
  assert.equal(stage(s), 0);
  assert.equal(s.outcomes.length, count);
  assert.equal(s.care.water, 90);
  assert.equal(reload(s, now + 30 * 86400000).care.water, 90);
});
test("settings are timestamped, so correction does not retroactively apply new decay speed", () => {
  let s = setup();
  s.tasks = [];
  s = changeSettings(s, { speed: 2 }, now + 30 * hour);
  const a = decay(s, now + 36 * hour);
  assert.ok(Math.abs(a.care.water - (85 - 6 * 1.1 - 6 * 2 * 1.1)) < 1e-6);
  assert.deepEqual(reload(a, now + 36 * hour).care, a.care);
});
test("DST spring and autumn transitions are calendar days, not 24-hour jumps", () => {
  for (const start of [new Date(2026, 2, 7, 12), new Date(2026, 9, 31, 12)]) {
    const n = +start;
    const s = setup(n);
    const end = +localDate(shiftDate(dateKey(n), 3));
    const a = decay(s, end);
    assert.equal(a.outcomes.length, 3);
    assert.equal(new Set(a.outcomes.map((o) => o.date)).size, 3);
    assert.ok(a.outcomes.every((o) => dateKey(o.at) === o.date));
  }
});
test("migration retains name, care, settings, old jars and achievements without retroactive penalties", () => {
  const current = setup();
  const { baseline, careEvents, outcomes, pet, settledThrough, ...old } =
    current;
  const legacy = {
    ...old,
    version: 1,
    completions: [
      {
        taskId: "a",
        name: "Old water",
        category: "water",
        at: now - 86400000,
        date: shiftDate(dateKey(now), -1),
      },
    ],
    achievements: ["First Meal"],
    name: "Beloved pal",
    updated: now,
  };
  const a = parseState(legacy, now)!;
  assert.ok(a);
  assert.equal(a.pet, "mochi");
  assert.equal(a.name, "Beloved pal");
  assert.deepEqual(a.care, legacy.care);
  assert.equal(a.completions.length, 1);
  assert.equal(a.outcomes.filter((o) => o.status === "missed").length, 0);
  assert.ok(validState(a));
  assert.deepEqual(reload(a).care, a.care);
  const b = setOutcome(a, "a", shiftDate(dateKey(now), -1), "pending", now);
  assert.equal(b.completions.length, 0);
  assert.equal(b.care.water, 57);
  assert.deepEqual(
    complete(a, "a", now)
      .completions.map((c) => c.date)
      .sort(),
    [shiftDate(dateKey(now), -1), dateKey(now)].sort(),
  );
});
test("backup validation rejects malformed dates, duplicate occurrences, bad pets and bad timelines", () => {
  assert.equal(validState(setup()), true);
  assert.equal(validState({ version: 1 }), false);
  assert.equal(validState({ ...setup(), pet: "recolor" }), false);
  assert.equal(
    validState({ ...setup(), tasks: [task("a", { date: "2026-02-31" })] }),
    false,
  );
  const a = complete(setup(), "a", now);
  assert.equal(
    validState({ ...a, outcomes: [a.outcomes[0], a.outcomes[0]] }),
    false,
  );
  assert.equal(
    validState({
      ...a,
      careEvents: [{ kind: "settings", at: now, speed: 100, cozy: true }],
    }),
    false,
  );
});
test("streaks, jar history and achievements remain derived from positive outcomes", () => {
  let s = complete(setup(), "a", now);
  assert.equal(streak(s, now), 1);
  assert.ok(s.achievements.includes("First Meal"));
  assert.ok(s.achievements.includes("Full Jar"));
  s = setOutcome(s, "a", dateKey(now), "missed", now);
  assert.equal(streak(s, now), 0);
  assert.equal(s.completions.length, 0);
  assert.ok(s.achievements.includes("First Meal"));
});
test("same-millisecond transactions preserve action order through revive and correction", () => {
  let s = revive(setup(), now);
  s = complete(s, "a", now);
  s = useSupply(buySupply(s, "water", now), "water", now);
  assert.equal(s.care.water, 100);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  assert.equal(s.care.water, 100);
  assert.equal(s.debt, 2);
  assert.deepEqual(reload(s).care, s.care);
});
test("missed-task floor is reversible without manufacturing care", () => {
  let s = setup(now, { food: 1, water: 3, clean: 1, happy: 1 });
  s.settings.cozy = s.baseline.cozy = false;
  s = setOutcome(s, "a", dateKey(now), "missed", now);
  assert.equal(s.care.water, 1);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  assert.equal(s.care.water, 3);
});
test("a task undone today becomes an automatic miss at day end, but a past-day undo stays pending", () => {
  let s = complete(setup(), "a", now);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  const tomorrow = +localDate(shiftDate(dateKey(now), 1));
  s = decay(s, tomorrow);
  assert.equal(s.outcomes[0].status, "missed");
  assert.equal(s.outcomes[0].automatic, true);
  assert.equal(dateKey(s.outcomes[0].at), dateKey(now));
  s = setOutcome(s, "a", dateKey(now), "pending", tomorrow);
  s = decay(reload(s, tomorrow), tomorrow + hour);
  assert.equal(s.outcomes[0].status, "pending");
  assert.equal(s.outcomes.length, 1);
});
test("coins reverse on undo and switches, with no duplicate earnings after refresh", () => {
  let s = complete(setup(), "a", now);
  assert.equal(s.coins, 5);
  s = reload(s);
  s = complete(s, "a", now);
  assert.equal(s.coins, 5);
  s = setOutcome(s, "a", dateKey(now), "missed", now);
  assert.equal(s.coins, 0);
  assert.equal(s.debt, 0);
  s = complete(s, "a", now);
  assert.equal(s.coins, 5);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  assert.equal(s.coins, 0);
});
test("purchasing stocks inventory without improving care", () => {
  const earned = complete(setup(), "a", now);
  const s = buySupply(earned, "water", now);
  assert.equal(s.coins, 3);
  assert.equal(s.inventory.water, 1);
  assert.deepEqual(s.care, earned.care);
  assert.equal(s.completions.length, 1);
  assert.deepEqual(reload(s), s);
});
test("each supply improves the correct need by 15 and happiness by 4", () => {
  for (const item of ["food", "water", "soap"] as const) {
    let s = setup(now, { food: 50, water: 50, clean: 50, happy: 50 });
    s.tasks.push(task("b"));
    s = complete(complete(s, "a", now), "b", now);
    s = buySupply(s, item, now);
    assert.equal(s.inventory[item], 1);
    s = useSupply(s, item, now);
    assert.equal(s.care[SUPPLIES[item].category], 65);
    assert.equal(s.care.happy, 54);
    assert.equal(s.inventory[item], 0);
    for (const category of ["food", "water", "clean"] as const)
      if (category !== SUPPLIES[item].category)
        assert.equal(s.care[category], 50);
    assert.ok(validState(s));
  }
});
test("insufficient funds and empty inventory cannot create items, debt or care", () => {
  let s = setup();
  const before = JSON.stringify(s);
  s = buySupply(s, "food", now);
  s = useSupply(s, "water", now);
  assert.equal(JSON.stringify(s), before);
});
test("using supplies caps care at 100 and cannot consume more than owned", () => {
  let s = setup(now, { food: 99, water: 99, clean: 99, happy: 99 });
  s = useSupply(buySupply(complete(s, "a", now), "food", now), "food", now);
  assert.equal(s.care.food, 100);
  assert.equal(s.care.happy, 100);
  const events = s.careEvents.length;
  s = useSupply(s, "food", now);
  assert.equal(s.careEvents.length, events);
  assert.equal(s.inventory.food, 0);
});
test("undoing spent coins reserves a shortfall without erasing inventory or care", () => {
  let s = buySupply(complete(setup(), "a", now), "food", now);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  assert.equal(s.coins, 0);
  assert.equal(s.debt, 2);
  assert.equal(s.inventory.food, 1);
  s = useSupply(s, "food", now);
  assert.equal(s.care.food, 100);
  assert.equal(s.inventory.food, 0);
  assert.equal(s.debt, 2);
  s = complete(s, "a", now);
  assert.equal(s.coins, 3);
  assert.equal(s.debt, 0);
  assert.equal(s.inventory.food, 0);
  assert.equal(buySupply(s, "food", now).inventory.food, 1);
});
test("repeated outcome toggles cannot duplicate supplies or erase spent-coin reservations", () => {
  let s = buySupply(complete(setup(), "a", now), "food", now, "same-purchase");
  for (let i = 0; i < 20; i++) {
    s = setOutcome(s, "a", dateKey(now), "pending", now);
    assert.equal(s.debt, 2);
    s = complete(s, "a", now);
    s = buySupply(s, "food", now, "same-purchase");
  }
  assert.equal(s.inventory.food, 1);
  assert.equal(s.coins, 3);
  assert.equal(s.careEvents.filter((e) => e.kind === "buy").length, 1);
});
test("new earnings settle a reservation before new coins become spendable", () => {
  let s = buySupply(complete(setup(), "a", now), "water", now);
  s = setOutcome(s, "a", dateKey(now), "missed", now);
  assert.equal(s.debt, 2);
  s.tasks.push(task("b"));
  s = complete(s, "b", now);
  assert.equal(s.coins, 3);
  assert.equal(s.debt, 0);
  assert.equal(s.inventory.water, 1);
  assert.deepEqual(reload(s), s);
});
test("past-date correction reverses currency without moving its jar ball into today", () => {
  const tomorrow = +localDate(shiftDate(dateKey(now), 1));
  let s = complete(setup(), "a", now);
  s = buySupply(s, "water", now);
  s = setOutcome(s, "a", dateKey(now), "pending", tomorrow);
  assert.equal(s.coins, 0);
  assert.equal(s.debt, 2);
  assert.equal(s.completions.length, 0);
  s = setOutcome(s, "a", dateKey(now), "completed", tomorrow);
  assert.equal(s.coins, 3);
  assert.equal(s.completions[0].date, dateKey(now));
  assert.deepEqual(reload(s, tomorrow).inventory, s.inventory);
});
test("dead pets keep their supplies until revival", () => {
  let s = buySupply(complete(setup(), "a", now), "water", now);
  s = changeSettings(s, { cozy: false }, now);
  s = decay(s, now + 20 * 86400000);
  assert.equal(stage(s), 5);
  const next = useSupply(s, "water", now + 20 * 86400000);
  assert.equal(next.inventory.water, 1);
  assert.equal(next.careEvents.length, s.careEvents.length);
  assert.equal(revive(next, now + 20 * 86400000).inventory.water, 1);
});
test("sleep boundaries follow actual local time, independently of any theme setting", () => {
  for (const [hours, minutes, expected] of [
    [5, 59, true],
    [6, 0, false],
    [20, 59, false],
    [21, 0, true],
    [0, 0, true],
  ] as const) {
    const n = +new Date(2026, 9, 25, hours, minutes);
    assert.equal(petRhythm(n).sleeping, expected);
    for (const theme of ["day", "night", "auto"] as const) {
      const s = changeSettings(initial(n), { theme }, n);
      assert.equal(petRhythm(s.updated).sleeping, expected);
    }
  }
  assert.equal(petRhythm(+new Date(2026, 9, 25, 19, 30)).calm, true);
});
test("changing only the website theme does not settle or alter pet care", () => {
  const before = initial(now);
  const after = changeSettings(
    before,
    { theme: "night" },
    now + 3 * 86400000,
  );
  assert.equal(after.settings.theme, "night");
  assert.deepEqual(after.care, before.care);
  assert.deepEqual(after.careEvents, before.careEvents);
  assert.deepEqual(after.outcomes, before.outcomes);
  assert.equal(stage(after), stage(before));
});
test("migration from version 2 preserves existing capped care and grants one coin reward per old completion", () => {
  const base = setup();
  base.baseline.care.water = base.care.water = 97;
  const entry = complete(base, "a", now);
  const { coins, debt, inventory, ...old } = entry;
  const v2 = {
    ...old,
    version: 2,
    outcomes: entry.outcomes.map(({ rewardCare, rewardCoins, ...o }) => o),
  };
  let s = parseState(v2, now)!;
  assert.equal(s.care.water, 100);
  assert.equal(s.coins, 5);
  assert.equal(s.pet, base.pet);
  assert.deepEqual(reload(s).care, s.care);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  assert.equal(s.care.water, 97);
  assert.equal(s.coins, 0);
  assert.ok(validState(s));
});
test("backup validation rejects forged item names, duplicate transactions and impossible inventory use", () => {
  const s = buySupply(complete(setup(), "a", now), "water", now);
  const e = s.careEvents[0];
  assert.equal(
    validState({ ...s, careEvents: [{ ...e, item: "toString" }] }),
    false,
  );
  assert.equal(validState({ ...s, careEvents: [e, e] }), false);
  assert.equal(
    validState({
      ...s,
      careEvents: [
        {
          kind: "use",
          item: "water",
          at: now,
          sequence: e.sequence,
          id: "bad",
          boost: 15,
          morale: 4,
        },
      ],
    }),
    false,
  );
  assert.equal(validState({ ...s, coins: -1 }), false);
});
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Pet } from "./Pets";
test("all three pet drawings render every stage with unique late-stage damage and dead ghosts", () => {
  for (const kind of ["mochi", "pippin", "crumb"] as const) {
    for (let level = 0; level < 6; level++) {
      const html = renderToStaticMarkup(
        createElement(Pet, { kind, level, preview: true }),
      );
      assert.ok(html.includes("stage-" + level));
      assert.equal(
        html.includes('data-damage-species="' + kind + '"'),
        level >= 3,
      );
      assert.equal(html.includes('class="ghost"'), level === 5);
      assert.ok(html.includes("<svg"));
    }
  }
});
test("derived wallet caches cannot buy supplies without earned currency", () => {
  const forged = { ...setup(), coins: 1000 };
  const s = buySupply(forged, "food", now);
  assert.equal(s.coins, 0);
  assert.equal(s.inventory.food, 0);
});
test("head pats give only happiness and persist without changing wallet or inventory", () => {
  let s = setup(now, { food: 50, water: 50, clean: 50, happy: 50 });
  s = headPat(s, now);
  assert.deepEqual(s.care, { food: 50, water: 50, clean: 50, happy: 53 });
  assert.equal(s.coins, 0);
  assert.equal(s.completions.length, 0);
  assert.deepEqual(s.inventory, emptyInventory());
  assert.ok(validState(s));
  assert.deepEqual(reload(s).care, s.care);
});
test("head pats cap at 100, avoid empty ledger entries and cannot revive dead pets", () => {
  let s = setup(now, { food: 70, water: 70, clean: 70, happy: 99 });
  s = headPat(s, now);
  assert.equal(s.care.happy, 100);
  const count = s.careEvents.length;
  assert.equal(headPat(s, now).careEvents.length, count);
  s = setup(now, { food: 0, water: 0, clean: 0, happy: 0 });
  s.baseline.cozy = s.settings.cozy = false;
  assert.equal(headPat(s, now).care.happy, 0);
  assert.equal(headPat(s, now).careEvents.length, 0);
});
test("head-pat happiness survives task undo without granting food or water", () => {
  let s = headPat(complete(setup(), "a", now), now);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  assert.equal(s.care.happy, 93);
  assert.equal(s.care.water, 85);
  assert.equal(s.care.food, 85);
  assert.equal(s.coins, 0);
});
test("tired drawings keep open eyes for every species while awake", () => {
  for (const kind of ["mochi", "pippin", "crumb"] as const) {
    const html = renderToStaticMarkup(
      createElement(Pet, { kind, level: 1, preview: true, sleep: false }),
    );
    assert.ok(
      html.includes(
        kind === "mochi" ? 'class="eyes"' : 'data-eye-state="open"',
      ),
    );
    assert.equal(html.includes("z z"), false);
  }
});
test("re-completing version-2 history grants coins without restoring old direct care", () => {
  const old = complete(setup(), "a", now);
  let s = parseState(
    {
      ...old,
      version: 2,
      outcomes: old.outcomes.map(({ rewardCare, rewardCoins, ...o }) => o),
    },
    now,
  )!;
  assert.equal(s.care.water, 95);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  assert.equal(s.care.water, 85);
  s = complete(s, "a", now);
  assert.equal(s.care.water, 85);
  assert.equal(s.care.happy, 90);
  assert.equal(s.coins, 5);
});
test("re-completing version-1 history never restores its old food, water or happiness reward", () => {
  const source = setup();
  let s = parseState(
    {
      ...source,
      version: 1,
      completions: [
        {
          taskId: "a",
          name: "Old water",
          category: "water",
          at: now,
          date: dateKey(now),
        },
      ],
    },
    now,
  )!;
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  const before = { ...s.care };
  s = complete(s, "a", now);
  assert.deepEqual(s.care, before);
  assert.equal(s.coins, 5);
  assert.ok(validState(s));
  assert.deepEqual(reload(s).care, s.care);
});
function earn(s: State, count: number, n = now) {
  // Explicitly fund purchase-focused tests under the configurable economy.
  s = {
    ...s,
    tasks: s.tasks.map((t) =>
      t.id === "a" ? { ...t, rewardCap: Math.min(count, 100) } : t,
    ),
  };
  for (let i = 0; i < count; i++)
    s = recordAttempt(s, "a", dateKey(n), "completed", n, "earn-" + i);
  return s;
}
test("approved basic care buys and consumes once, preserves prices/effects, and survives refresh", () => {
  for (const item of ["food", "water", "soap"] as const) {
    const before = earn(setup(), 4);
    const next = buyAndUseBasic(before, item, now, "approved");
    assert.equal(next.coins, before.coins - SUPPLIES[item].price);
    assert.equal(next.inventory[item], 0);
    assert.equal(next.care[SUPPLIES[item].category], 100);
    assert.equal(next.care.happy, 94);
    assert.equal(next.careEvents.filter((e) => e.kind === "buy").length, 1);
    assert.equal(next.careEvents.filter((e) => e.kind === "use").length, 1);
    assert.deepEqual(buyAndUseBasic(next, item, now, "approved"), next);
    assert.deepEqual(reload(next), next);
  }
});
test("approved quick care uses newly stocked inventory and never charges when funds or health prevent use", () => {
  const funded = earn(setup(), 4);
  const stocked = buyItem(funded, "food", now, "existing-stock");
  const used = buyAndUseBasic(stocked, "food", now, "approved");
  assert.equal(used.coins, stocked.coins);
  assert.equal(used.inventory.food, 0);
  assert.equal(used.careEvents.filter((e) => e.kind === "buy").length, 1);
  const poor = setup();
  assert.deepEqual(
    buyAndUseBasic(poor, "food", now, "too-poor"),
    decay(poor, now),
  );
  const dead = {
    ...funded,
    settings: { ...funded.settings, cozy: false },
    baseline: {
      ...funded.baseline,
      cozy: false,
      care: { food: 0, water: 0, clean: 0, happy: 0 },
    },
  };
  assert.deepEqual(buyAndUseBasic(dead, "soap", now, "dead"), decay(dead, now));
});
test("finished-today grouping is derived from the daily target and reverses after undo/corrections", () => {
  let s = setup();
  s.tasks[0] = { ...s.tasks[0], repetitions: "goal", dailyGoal: 3 };
  for (let i = 0; i < 3; i++) {
    assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(now)), false);
    s = recordAttempt(s, "a", dateKey(now), "completed", now, `finish-${i}`);
  }
  const snapshot = JSON.stringify(s);
  assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(now)), true);
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(
    taskFinishedToday(
      s,
      { ...s.tasks[0], repetitions: "unlimited" },
      dateKey(now),
    ),
    false,
  );
  assert.equal(
    taskFinishedToday(s, s.tasks[0], shiftDate(dateKey(now), 1)),
    false,
  );
  const undone = undoLatest(s, "a", dateKey(now), now);
  assert.equal(taskFinishedToday(undone, undone.tasks[0], dateKey(now)), false);
  const corrected = correctAttempt(s, "finish-2", "missed", now);
  assert.equal(
    taskFinishedToday(corrected, corrected.tasks[0], dateKey(now)),
    false,
  );
});
test("each intentional positive and negative press is a unique independent entry", () => {
  let s = setup();
  for (let i = 0; i < 3; i++)
    s = recordAttempt(s, "a", dateKey(now), "completed", now, "positive-" + i);
  s = recordAttempt(s, "a", dateKey(now), "missed", now, "negative");
  assert.equal(s.coins, 15);
  assert.equal(s.completions.length, 3);
  assert.equal(s.care.water, 77);
  assert.equal(taskCounts(s, "a", dateKey(now)).completed, 3);
  assert.equal(taskCounts(s, "a", dateKey(now)).missed, 1);
  assert.equal(new Set(s.outcomes.map((o) => o.id)).size, 4);
  assert.equal(new Set(s.completions.map(rewardKey)).size, 3);
  assert.ok(validState(s));
  assert.deepEqual(reload(s), s);
});
test("replaying the same press ID cannot duplicate an entry, including after deletion", () => {
  let s = recordAttempt(
    setup(),
    "a",
    dateKey(now),
    "completed",
    now,
    "request",
  );
  s = recordAttempt(s, "a", dateKey(now), "completed", now, "request");
  assert.equal(s.coins, 5);
  s = deleteAttempt(s, "request", now);
  s = recordAttempt(s, "a", dateKey(now), "completed", now, "request");
  assert.equal(s.coins, 0);
  assert.equal(s.outcomes.length, 1);
});
test("undo removes only the latest entry and preserves previous jar balls", () => {
  let s = earn(setup(), 3);
  s = recordAttempt(s, "a", dateKey(now), "missed", now, "miss");
  s = undoLatest(s, "a", dateKey(now), now);
  assert.equal(s.care.water, 85);
  assert.equal(s.coins, 15);
  assert.equal(s.completions.length, 3);
  s = undoLatest(s, "a", dateKey(now), now);
  assert.equal(s.coins, 10);
  assert.equal(s.completions.length, 2);
  assert.equal(taskCounts(s, "a", dateKey(now)).completed, 2);
});
test("correcting or deleting a particular entry changes only that entry", () => {
  let s = earn(setup(), 3);
  const firstBall = s.outcomes[0].ballId;
  s = correctAttempt(s, "earn-1", "missed", now);
  assert.equal(s.coins, 10);
  assert.equal(s.care.water, 77);
  assert.equal(s.completions.length, 2);
  assert.equal(s.completions[0].ballId, firstBall);
  s = correctAttempt(s, "earn-1", "completed", now);
  assert.equal(s.coins, 15);
  assert.equal(s.care.water, 85);
  s = deleteAttempt(s, "earn-0", now);
  assert.equal(s.coins, 10);
  assert.equal(s.completions.length, 2);
  assert.equal(s.outcomes[0].deleted, true);
  assert.equal(s.outcomes[1].date, dateKey(now));
});
test("custom goals generate only unaccounted missing slots once at local day end", () => {
  let s = setup();
  s.tasks[0] = { ...s.tasks[0], repetitions: "goal", dailyGoal: 8 };
  s = earn(s, 3);
  s = recordAttempt(s, "a", dateKey(now), "missed", now, "manual-miss");
  const tomorrow = +localDate(shiftDate(dateKey(now), 1));
  s = decay(s, tomorrow);
  assert.equal(s.outcomes.filter((o) => o.automatic).length, 4);
  assert.equal(s.outcomes.length, 8);
  assert.equal(s.coins, 15);
  assert.equal(taskCounts(s, "a", dateKey(tomorrow)).completed, 0);
  assert.equal(taskCounts(s, "a", dateKey(now)).missed, 5);
  assert.deepEqual(reload(s, tomorrow), s);
});
test("unlimited tasks never generate automatic missed attempts, even over many days", () => {
  const s = setup();
  s.tasks[0].repetitions = "unlimited";
  const after = decay(s, now + 10 * 86400000);
  assert.equal(goalFor(s.tasks[0]), 0);
  assert.equal(after.outcomes.length, 0);
});
test("once and multiple modes have a daily minimum but allow intentional entries beyond it", () => {
  for (const repetitions of ["once", "multiple"] as const) {
    let s = setup();
    s.tasks[0].repetitions = repetitions;
    s = earn(s, 4);
    s = decay(s, +localDate(shiftDate(dateKey(now), 1)));
    assert.equal(s.completions.length, 4);
    assert.equal(s.coins, 20);
    assert.equal(s.outcomes.filter((o) => o.automatic).length, 0);
  }
});
test("goals reached or exceeded have no extra automatic penalties", () => {
  let s = setup();
  s.tasks[0] = { ...s.tasks[0], repetitions: "goal", dailyGoal: 3 };
  s = earn(s, 5);
  s = decay(s, +localDate(shiftDate(dateKey(now), 1)));
  assert.equal(s.outcomes.length, 5);
  assert.equal(s.coins, 15);
});
test("a manually missed once-per-day goal is not penalized again at midnight", () => {
  let s = recordAttempt(setup(), "a", dateKey(now), "missed", now, "manual");
  s = decay(s, +localDate(shiftDate(dateKey(now), 1)));
  assert.equal(s.outcomes.length, 1);
  assert.equal(s.outcomes[0].automatic, false);
});
test("goal changes settle earlier days under their original configuration", () => {
  let s = setup();
  s.tasks[0] = { ...s.tasks[0], repetitions: "goal", dailyGoal: 3 };
  const tomorrow = +localDate(shiftDate(dateKey(now), 1));
  s = saveTask(s, { ...s.tasks[0], dailyGoal: 8 }, tomorrow);
  assert.equal(s.outcomes.length, 3);
  assert.ok(s.outcomes.every((o) => o.task.dailyGoal === 3));
  s = decay(s, +localDate(shiftDate(dateKey(now), 2)));
  assert.equal(s.outcomes.length, 11);
});
test("premium foods consume one item and apply their own care and happiness effects", () => {
  for (const item of [
    "burger",
    "pizza",
    "cake",
    "icecream",
    "cookie",
    "smoothie",
    "pancakes",
  ] as const) {
    let s = earn(setup(now, { food: 20, water: 20, clean: 20, happy: 20 }), 6);
    s = buySupply(s, item, now);
    assert.equal(s.inventory[item], 1);
    const coins = s.coins;
    s = useSupply(s, item, now);
    assert.equal(s.inventory[item], 0);
    assert.equal(s.care[SUPPLIES[item].category], 20 + SUPPLIES[item].boost);
    assert.equal(s.care.happy, 20 + SUPPLIES[item].morale);
    assert.equal(s.coins, coins);
    assert.ok(validState(s));
    assert.deepEqual(reload(s), s);
  }
});
test("purchase and consumption request IDs are idempotent and stock cannot go below zero", () => {
  let s = earn(setup(), 5);
  s = buySupply(s, "burger", now, "buy-request");
  s = buySupply(s, "burger", now, "buy-request");
  assert.equal(s.coins, 10);
  assert.equal(s.inventory.burger, 1);
  s = useSupply(s, "burger", now, "use-request");
  const after = s.careEvents.length;
  s = useSupply(s, "burger", now, "use-request");
  s = useSupply(s, "burger", now, "other-use");
  assert.equal(s.inventory.burger, 0);
  assert.equal(s.careEvents.length, after);
});
test("outfits remain owned after refresh, cannot be purchased twice, and require ownership to equip", () => {
  let s = earn(setup(), 30);
  const before = s.coins;
  s = equipOutfit(s, "crown", now);
  assert.deepEqual(s.equipped, {});
  s = buyItem(s, "beanie", now);
  assert.equal(s.coins, before - 25);
  assert.deepEqual(s.ownedOutfits, ["beanie"]);
  const paid = s.coins;
  s = buyItem(s, "beanie", now);
  assert.equal(s.coins, paid);
  s = equipOutfit(s, "beanie", now);
  assert.equal(s.equipped.head, "beanie");
  assert.deepEqual(reload(s), s);
});
test("compatible wardrobe combinations persist and same-slot outfits replace one another", () => {
  let s = earn(setup(), 60);
  for (const item of [
    "beanie",
    "scarf",
    "crown",
    "backpack",
    "pajamas",
  ] as const)
    s = buyItem(s, item, now);
  for (const item of ["beanie", "scarf", "backpack", "pajamas"] as const)
    s = equipOutfit(s, item, now);
  assert.equal(Object.keys(s.equipped).length, 4);
  s = equipOutfit(s, "crown", now);
  assert.equal(s.equipped.head, "crown");
  assert.equal(s.equipped.neck, "scarf");
  s = equipOutfit(s, "scarf", now);
  assert.equal(s.equipped.neck, undefined);
  assert.equal(s.equipped.head, "crown");
  assert.deepEqual(reload(s).equipped, s.equipped);
  s = equipOutfit(s, null, now);
  assert.deepEqual(s.equipped, {});
});
test("undoing a funding occurrence preserves bought clothing and used food, and reserves spent coins", () => {
  let s = earn(setup(), 6);
  s = buyItem(s, "beanie", now);
  s = buySupply(s, "food", now);
  s = useSupply(s, "food", now);
  s = equipOutfit(s, "beanie", now);
  s = deleteAttempt(s, "earn-0", now);
  assert.equal(s.coins, 0);
  assert.equal(s.debt, 2);
  assert.equal(s.care.food, 100);
  assert.equal(s.equipped.head, "beanie");
  assert.equal(s.ownedOutfits.length, 1);
  s = correctAttempt(s, "earn-1", "missed", now);
  assert.equal(s.debt, 7);
  assert.equal(s.inventory.food, 0);
  assert.ok(validState(s));
});
test("version-3 saves migrate single results, purchased essentials and head pats without data loss", () => {
  let s = headPat(buySupply(complete(setup(), "a", now), "water", now), now);
  const { ownedOutfits, equipped, ...old } = s;
  const raw = {
    ...old,
    version: 3,
    inventory: { food: 0, water: 1, soap: 0 },
    outcomes: s.outcomes.map(({ id, ballId, penalty, deleted, ...o }) => o),
    completions: s.completions.map(({ id, ballId, ...c }) => c),
  };
  const migrated = parseState(raw, now)!;
  assert.ok(migrated);
  assert.equal(migrated.version, 4);
  assert.equal(migrated.coins, 3);
  assert.equal(migrated.inventory.water, 1);
  assert.equal(migrated.inventory.burger, 0);
  assert.deepEqual(migrated.care, s.care);
  assert.equal(migrated.outcomes.length, 1);
  assert.ok(migrated.outcomes[0].id);
  assert.ok(validState(migrated));
  assert.deepEqual(reload(migrated), migrated);
});
test("every outfit renders on all three species through all six health stages", () => {
  for (const kind of ["mochi", "pippin", "crumb"] as const)
    for (const item of OUTFIT_IDS)
      for (let level = 0; level < 6; level++) {
        const html = renderToStaticMarkup(
          createElement(Pet, {
            kind,
            level,
            preview: true,
            equipped: { [OUTFITS[item].slot]: item },
          }),
        );
        assert.ok(
          html.includes('data-outfit="' + item + '"'),
          kind + " " + item + " " + level,
        );
      }
});
test("hundreds of repeated entries retain unique ball IDs and round-trip without duplicate rewards", () => {
  const s = earn(setup(), 150);
  assert.equal(s.coins, 500);
  assert.equal(s.outcomes.filter((o) => o.status === "completed").length, 150);
  assert.equal(s.completions.length, 100);
  assert.equal(new Set(s.completions.map(rewardKey)).size, 100);
  assert.ok(validState(s));
  assert.deepEqual(reload(s), s);
});

test("reminder-only mode freezes care across refresh and resumes without catch-up", () => {
  let s = initial(now);
  s = decay(s, now + 30 * hour);
  const at = now + 30 * hour;
  s = changeSettings(s, { petCare: false }, at);
  const care = { ...s.care };
  s = decay(s, at + 300 * hour);
  assert.deepEqual(s.care, care);
  assert.equal(stage(s), 0);
  assert.deepEqual(headPat(s, at + 300 * hour).care, care);
  const loaded = parseState(JSON.parse(JSON.stringify(s)), at + 300 * hour)!;
  assert.ok(loaded);
  assert.deepEqual(loaded.care, care);
  const resumed = changeSettings(loaded, { petCare: true }, at + 300 * hour);
  assert.deepEqual(resumed.care, care);
  assert.ok(decay(resumed, at + 301 * hour).care.food < care.food);
  assert.equal(resumed.outcomes.length, loaded.outcomes.length);
});
test("new notification defaults do not replace existing saved settings", () => {
  const fresh = initial(now);
  assert.equal(fresh.settings.reminders, true);
  assert.equal(fresh.settings.alarmSound, true);
  assert.equal(fresh.settings.alarmsEnabled, true);
  const old = initial(now);
  old.settings.reminders = false;
  delete old.settings.alarmSound;
  delete old.settings.alarmsEnabled;
  const loaded = parseState(JSON.parse(JSON.stringify(old)), now)!;
  assert.ok(loaded);
  assert.equal(loaded.settings.reminders, false);
  assert.equal(loaded.settings.alarmSound, undefined);
});
test("care-linked missed attempts during reminder-only mode never reduce care or return on resume", () => {
  let s = initial(now);
  s.tasks = [task("pause-care", { careLinked: true })];
  s = changeSettings(s, { petCare: false }, now);
  const care = { ...s.care };
  s = recordAttempt(s, "pause-care", dateKey(now), "missed", now + hour);
  assert.deepEqual(s.care, care);
  s = changeSettings(s, { petCare: true }, now + 2 * hour);
  assert.deepEqual(s.care, care);
  assert.equal(s.outcomes.length, 1);
});

test("older additive catalog, task and settings fields load without losing progress", () => {
  let saved = earn(setup(), 6);
  saved = buyItem(saved, "beanie", now, "legacy-hat");
  saved = buyItem(saved, "water", now, "legacy-water");
  saved.pet = "rattle";
  saved.settings.reminders = false;
  const old = JSON.parse(JSON.stringify(saved));
  for (const key of SUPPLY_IDS)
    if (!["food", "water", "soap"].includes(key)) delete old.inventory[key];
  delete old.settings.theme;
  delete old.settings.motion;
  old.tasks.forEach((t: any) => {
    delete t.description;
    delete t.days;
  });
  old.outcomes.forEach((o: any) => {
    delete o.task.description;
    delete o.task.days;
  });
  const before = JSON.stringify(old),
    restored = parseState(old, now)!;
  assert.ok(restored);
  assert.equal(JSON.stringify(old), before);
  assert.equal(restored.pet, "rattle");
  assert.equal(restored.coins, saved.coins);
  assert.deepEqual(restored.inventory, saved.inventory);
  assert.deepEqual(restored.ownedOutfits, saved.ownedOutfits);
  assert.deepEqual(restored.care, saved.care);
  assert.deepEqual(restored.rewardLedger, saved.rewardLedger);
  assert.deepEqual(
    restored.outcomes.map((o) => o.id),
    saved.outcomes.map((o) => o.id),
  );
  assert.equal(restored.settings.reminders, false);
  assert.equal(restored.tasks[0].repeat, saved.tasks[0].repeat);
});
test("unreadable saves never overwrite local storage, while repairs first preserve raw bytes", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  const values = new Map<string, string>();
  const writes: string[] = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => {
        writes.push(k);
        values.set(k, v);
      },
    },
  });
  try {
    for (const raw of [
      "",
      '{"version":',
      JSON.stringify({ ...initial(), version: 99 }),
      JSON.stringify({ ...initial(), settings: [] }),
      JSON.stringify({
        ...initial(),
        inventory: { ...emptyInventory(), food: -1 },
      }),
    ]) {
      values.clear();
      writes.length = 0;
      values.set("pocketpal-v1", raw);
      assert.throws(() => load());
      assert.equal(values.get("pocketpal-v1"), raw);
      assert.deepEqual(writes, []);
    }
    values.clear();
    writes.length = 0;
    const old = JSON.parse(JSON.stringify(initial()));
    delete old.inventory.pizza;
    const raw = JSON.stringify(old);
    values.set("pocketpal-v1", raw);
    const restored = load();
    assert.equal(restored.inventory.pizza, 0);
    assert.equal(values.get("pocketpal-v1"), raw);
    assert.equal(values.get("pocketpal-before-compatibility-repair"), raw);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("legacy version-one companion identity survives migration", () => {
  const raw = { ...setup(), version: 1, pet: "pippin" };
  const restored = parseState(raw, now);
  assert.ok(restored);
  assert.equal(restored.pet, "pippin");
});

test("Up Next creates one real task with an alarm on full completion and transfers the remaining sequence", () => {
  const date = dateKey(now);
  let s = addCollection(initial(now), {
    id: "home",
    name: "Home",
    icon: "home",
    color: "sage",
  });
  s = saveTask(
    s,
    task("laundry", {
      repeat: "once",
      collectionId: "home",
      upNext: [
        {
          id: "dry",
          name: "Move clothes to dryer",
          priority: "high",
          alarmMinutes: 40,
          alarm: true,
        },
        {
          id: "fold",
          name: "Fold clothes",
          priority: "low",
          alarmMinutes: 15,
          alarm: false,
        },
      ],
    }),
    now,
  );
  const originalCoins = s.coins,
    originalHistory = s.outcomes.length;
  s = recordTaskCompletion(s, "laundry", date, now, "completion-1");
  assert.equal(s.tasks.length, 2);
  assert.equal(s.tasks[0].upNextActivatedAt, now);
  assert.equal(s.tasks[0].upNext?.length, 2);
  const next = s.tasks[1];
  assert.equal(next.id, "up-next:completion-1");
  assert.equal(next.name, "Move clothes to dryer");
  assert.equal(next.collectionId, "home");
  assert.equal(next.date, date);
  assert.equal(next.repeat, "once");
  assert.equal(taskDue(s, next, now), true);
  assert.equal(taskFinishedToday(s, next, date), false);
  assert.equal(next.priority, "high");
  assert.equal(next.relativeAlarmAt, now + 40 * 60000);
  assert.equal(next.upNext?.[0].name, "Fold clothes");
  assert.equal(s.coins, originalCoins + 5);
  assert.equal(s.outcomes.length, originalHistory + 1);
  s = recordTaskCompletion(s, "laundry", date, now, "completion-1");
  assert.equal(s.tasks.length, 2);
  s = recordTaskCompletion(s, next.id, date, now + 40 * 60000, "completion-2");
  assert.equal(s.tasks.length, 3);
  assert.equal(s.tasks[2].name, "Fold clothes");
  assert.equal(s.tasks[2].collectionId, "home");
  assert.equal(s.tasks[2].priority, "low");
  assert.equal(s.tasks[2].relativeAlarmAt, undefined);
  assert.equal(s.tasks[2].importantAlarm, false);
  s = recordTaskCompletion(
    s,
    s.tasks[2].id,
    date,
    now + 55 * 60000,
    "completion-3",
  );
  assert.equal(s.tasks.length, 3);
});
test("Up Next legacy shared delay migrates without changing per-item delays", () => {
  const saved = saveTask(
    initial(now),
    task("legacy-chain", { repeat: "once" }),
    now,
  );
  const old = {
    ...saved,
    tasks: [
      {
        ...saved.tasks[0],
        upNextAlarmMinutes: 25,
        upNext: [
          {
            id: "legacy-a",
            name: "First",
            priority: "normal",
            alarm: true,
          },
          {
            id: "legacy-b",
            name: "Second",
            priority: "low",
            alarm: true,
            alarmMinutes: 50,
          },
        ],
      },
    ],
  } as unknown as State;
  const restored = parseState(old, now);
  assert.ok(restored);
  assert.deepEqual(
    restored.tasks[0].upNext?.map((item) => item.alarmMinutes),
    [25, 50],
  );
});
test("Pick Up Here notes persist while unfinished and clear only at the full target", () => {
  const date = dateKey(now);
  let s = saveTask(
    initial(now),
    task("resume", {
      repeat: "once",
      repetitions: "multiple",
      dailyGoal: 2,
      resumeNote: "Chapter 6, question 12.",
      upNext: [
        {
          id: "after-resume",
          name: "Review answers",
          priority: "normal",
          alarmMinutes: 10,
          alarm: true,
        },
      ],
    }),
    now,
  );
  s = parseState(JSON.parse(JSON.stringify(s)), now)!;
  assert.equal(s.tasks[0].resumeNote, "Chapter 6, question 12.");
  s = recordTaskCompletion(s, "resume", date, now, "resume-partial");
  assert.equal(s.tasks[0].resumeNote, "Chapter 6, question 12.");
  s = recordTaskCompletion(s, "resume", date, now + 60000, "resume-final");
  assert.equal(s.tasks[0].resumeNote, undefined);
  assert.equal(s.tasks[1].resumeNote, undefined);
});
test("today task ordering keeps active work before Up Next and all missed work last", () => {
  const date = dateKey(now);
  let s = initial(now);
  const ordinaryLow = task("ordinary-low", {
    repeat: "once",
    priority: "low",
    date,
  });
  const ordinaryHigh = task("ordinary-high", {
    repeat: "once",
    priority: "high",
    date,
  });
  const chainedHigh = task("up-next:chain", {
    repeat: "once",
    priority: "high",
    date,
  });
  const missedHigh = task("missed-high", {
    repeat: "once",
    priority: "high",
    date,
  });
  const missedNormal = task("missed-normal", {
    repeat: "once",
    priority: "normal",
    date,
  });
  for (const item of [
    ordinaryLow,
    ordinaryHigh,
    chainedHigh,
    missedHigh,
    missedNormal,
  ])
    s = saveTask(s, item, now);
  s = recordAttempt(s, missedHigh.id, date, "missed", now, "missed-high-1");
  s = recordAttempt(s, missedNormal.id, date, "missed", now, "missed-normal-1");
  assert.deepEqual(
    sortTodayTasks(s, s.tasks, date).map((item) => item.id),
    [
      ordinaryHigh.id,
      ordinaryLow.id,
      chainedHigh.id,
      missedHigh.id,
      missedNormal.id,
    ],
  );
});
test("Up Next waits for the full target, saves across refresh and never regenerates after undo", () => {
  const date = dateKey(now),
    minute = 60000;
  let s = saveTask(
    initial(now),
    task("parent", {
      repeat: "once",
      repetitions: "multiple",
      dailyGoal: 2,
      upNext: [
        {
          id: "later",
          name: "Later",
          priority: "normal",
          alarmMinutes: 45,
          alarm: true,
        },
      ],
    }),
    now,
  );
  s = recordTaskCompletion(s, "parent", date, now, "partial");
  assert.equal(s.tasks.length, 1);
  assert.equal(s.tasks[0].upNextActivatedAt, undefined);
  s = recordTaskCompletion(s, "parent", date, now + minute, "full");
  assert.equal(s.tasks.length, 2);
  const loaded = parseState(JSON.parse(JSON.stringify(s)))!;
  assert.ok(loaded);
  assert.equal(loaded.tasks[1].relativeAlarmAt, now + minute + 45 * 60000);
  const undone = undoLatest(loaded, "parent", date, now + 2 * minute);
  assert.equal(undone.tasks.length, 2);
  assert.ok(undone.tasks.some((t) => t.id === "up-next:full"));
  assert.equal(
    recordTaskCompletion(undone, "parent", date, now + 3 * minute, "again")
      .tasks.length,
    2,
  );
});
test("Up Next data is optional for old tasks and invalid queue lengths are rejected", () => {
  const s = saveTask(initial(now), task("legacy"), now);
  assert.ok(parseState(JSON.parse(JSON.stringify(s))));
  const bad = {
    ...s,
    tasks: [
      task("bad", {
        upNext: Array.from({ length: 6 }, (_, i) => ({
          id: String(i),
          name: "Next",
          priority: "normal" as const,
          alarmMinutes: 5,
          alarm: true,
        })),
      }),
    ],
  };
  assert.equal(validState(bad), false);
});

test("collections round-trip in backups, preserve task history, and ungroup tasks on deletion", () => {
  const date = dateKey(now),
    original = task("rent", { repeat: "daily" });
  let s = addCollection(initial(now), {
    id: "finance-id",
    name: "Finance",
    icon: "wallet",
    color: "burgundy",
  });
  s = saveTask(s, { ...original, collectionId: "finance-id" }, now);
  s = recordTaskCompletion(s, "rent", date, now, "rent-done");
  const restored = parseState(JSON.parse(JSON.stringify(s)), now);
  assert.ok(restored);
  assert.deepEqual(restored.collections, s.collections);
  assert.equal(restored.tasks[0].collectionId, "finance-id");
  assert.equal(restored.outcomes.length, 1);
  assert.equal(restored.rewardLedger?.length, 1);

  const renamed = updateCollection(restored, "finance-id", {
    name: "Money",
    icon: "sparkles",
    color: "orange",
  });
  assert.deepEqual(renamed.collections?.[0], {
    id: "finance-id",
    name: "Money",
    icon: "sparkles",
    color: "orange",
  });
  const withoutGroup = deleteCollection(renamed, "finance-id");
  assert.equal(withoutGroup.collections?.length, 0);
  assert.equal(withoutGroup.tasks[0].collectionId, undefined);
  assert.equal(withoutGroup.outcomes.length, 1);
  assert.deepEqual(withoutGroup.rewardLedger, renamed.rewardLedger);
});

test("older saves without collections load with an empty optional collection list", () => {
  let old = saveTask(
    initial(now),
    task("legacy-task", { collectionId: "missing-collection" }),
    now,
  ) as State & { collections?: State["collections"] };
  delete old.collections;
  const restored = parseState(JSON.parse(JSON.stringify(old)), now);
  assert.ok(restored);
  assert.deepEqual(restored.collections, []);
  assert.equal(restored.tasks.length, 1);
  assert.equal(restored.tasks[0].collectionId, undefined);
});
test("tutorial completion setting round-trips and remains optional for existing saves", () => {
  const s = initial(now);
  const old = JSON.parse(JSON.stringify(s));
  assert.ok(parseState(old));
  s.settings.tutorialSeen = true;
  assert.equal(parseState(JSON.parse(JSON.stringify(s)))?.settings.tutorialSeen, true);
  s.settings.tutorialSeen = "yes" as unknown as boolean;
  assert.equal(parseState(JSON.parse(JSON.stringify(s))), null);
});
test("vacation ranges save current/future dates and cannot rewrite settled dates", () => {
  const today = "2026-10-25",
    n = +localDate(today);
  let s = saveTask(initial(n), task("daily", { date: today, createdAt: n }), n);
  s = addVacationRange(s, today, today, n);
  assert.equal(isVacationDay(s, today), true);
  assert.equal(removeVacationDay(s, today, n).vacationDays?.length, 0);
  const range = addVacationRange(s, "2026-10-27", "2026-10-26", n);
  assert.deepEqual(range.vacationDays?.sort(), [today, "2026-10-26", "2026-10-27"]);
  assert.deepEqual(
    parseState(JSON.parse(JSON.stringify(range)))?.vacationDays,
    range.vacationDays,
  );
  assert.equal(addVacationRange(s, "2026-10-24", today, n), s);
  assert.equal(
    removeVacationDay(s, today, +localDate("2026-10-26")),
    s,
    "past vacation entries stay locked after settlement",
  );
  const missedOnRest = recordAttempt(s, "daily", today, "missed", n, "rest-miss");
  assert.equal(missedOnRest.outcomes.some((o) => o.id === "rest-miss"), false);
  const completedOnRest = recordAttempt(
    s,
    "daily",
    today,
    "completed",
    n,
    "rest-complete",
  );
  assert.equal(completedOnRest.completions.length, 1);
  assert.equal(
    correctAttempt(completedOnRest, "rest-complete", "missed", n)
      .outcomes[0].status,
    "completed",
    "a vacation completion cannot be converted into a missed penalty",
  );
  const settled = decay(s, +localDate("2026-10-26"));
  assert.equal(settled.outcomes.length, 0);
  assert.equal(settled.completions.length, 0);
  assert.equal(jarBalls(settled, today).length, 0);
});
test("weekly-any period uses Monday through Sunday and settles only one miss", () => {
  const monday = "2026-10-19",
    friday = "2026-10-23",
    sunday = "2026-10-25",
    nextMonday = "2026-10-26",
    n = +localDate(monday),
    flexible = task("week", {
      repeat: "weeklyAny",
      date: monday,
      createdDate: monday,
      createdAt: n,
      repetitions: "unlimited",
    });
  assert.deepEqual(taskPeriod(flexible, friday), { start: monday, end: sunday });
  assert.equal(taskDeadlineLabel(flexible, friday), "Due Sunday");
  let s = saveTask(initial(n), flexible, n);
  s = recordAttempt(s, "week", friday, "completed", +localDate(friday), "week-done");
  s = decay(s, +localDate(nextMonday));
  assert.equal(s.outcomes.filter((o) => o.status === "missed").length, 0);
  assert.equal(taskCounts(s, "week", sunday).completed, 1);
  assert.equal(taskFinishedToday(s, flexible, sunday), true);
  assert.equal(taskCounts(s, "week", nextMonday).completed, 0);

  const unfinished = saveTask(
    initial(n),
    task("unfinished", { repeat: "weeklyAny", date: monday, createdDate: monday, createdAt: n }),
    n,
  );
  const settled = decay(unfinished, +localDate(nextMonday));
  assert.equal(
    settled.outcomes.filter((o) => o.taskId === "unfinished" && o.status === "missed").length,
    1,
  );
  assert.equal(settled.outcomes.find((o) => o.taskId === "unfinished")?.date, sunday);
  assert.equal(decay(settled, +localDate("2026-10-27")).outcomes.length, 1);
});
test("weekly vacation windows are excused only when all available days are covered", () => {
  const monday = "2026-10-19",
    sunday = "2026-10-25",
    nextMonday = "2026-10-26",
    n = +localDate(monday),
    weekly = task("week", { repeat: "weeklyAny", date: monday, createdDate: monday, createdAt: n });
  let full = saveTask(initial(n), weekly, n);
  full = addVacationRange(full, monday, sunday, n);
  assert.equal(decay(full, +localDate(nextMonday)).outcomes.length, 0);

  let partial = saveTask(initial(n), weekly, n);
  partial = addVacationRange(partial, monday, "2026-10-23", n);
  const settled = decay(partial, +localDate(nextMonday));
  assert.equal(settled.outcomes.filter((o) => o.status === "missed").length, 1);
});
test("monthly-any task has one month-end outcome and refresh begins the next period", () => {
  const first = "2026-11-01",
    last = "2026-11-30",
    next = "2026-12-01",
    n = +localDate(first),
    monthly = task("month", {
      repeat: "monthlyAny",
      date: first,
      createdDate: first,
      createdAt: n,
      repetitions: "goal",
      dailyGoal: 5,
    });
  assert.deepEqual(taskPeriod(monthly, "2026-11-12"), { start: first, end: last });
  assert.equal(taskDeadlineLabel(monthly, "2026-11-12"), "Due Nov 30");
  const s = saveTask(initial(n), monthly, n);
  const settled = decay(s, +localDate(next));
  assert.equal(settled.outcomes.filter((o) => o.status === "missed").length, 1);
  assert.equal(taskCounts(settled, "month", last).missed, 1);
  assert.equal(taskCounts(settled, "month", next).missed, 0);

  let completed = saveTask(initial(n), monthly, n);
  completed = recordAttempt(
    completed,
    "month",
    "2026-11-18",
    "completed",
    +localDate("2026-11-18"),
    "month-done",
  );
  assert.equal(
    decay(completed, +localDate(next)).outcomes.filter((o) => o.status === "missed").length,
    0,
  );

  let excused = saveTask(initial(n), monthly, n);
  excused = addVacationRange(excused, first, last, n);
  assert.equal(decay(excused, +localDate(next)).outcomes.length, 0);
});
