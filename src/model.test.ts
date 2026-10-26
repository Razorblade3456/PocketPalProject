import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  recordAttempt,
  correctAttempt,
  deleteAttempt,
  undoLatest,
  taskCounts,
  goalFor,
  rewardKey,
  buyItem,
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
  changeSettings,
  revive,
  streak,
  BALANCE,
  headPat,
  buySupply,
  useSupply,
  petRhythm,
  SUPPLIES,
  type State,
  type Task,
  type Care,
} from "./model";
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
  assert.equal(s.debt, 4);
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
  assert.equal(s.coins, 1);
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
  assert.equal(s.debt, 5);
  assert.equal(s.inventory.food, 1);
  s = useSupply(s, "food", now);
  assert.equal(s.care.food, 100);
  assert.equal(s.inventory.food, 0);
  assert.equal(s.debt, 5);
  s = complete(s, "a", now);
  assert.equal(s.coins, 0);
  assert.equal(s.debt, 0);
  assert.equal(s.inventory.food, 0);
  assert.equal(buySupply(s, "food", now).inventory.food, 0);
});
test("repeated outcome toggles cannot duplicate supplies or erase spent-coin reservations", () => {
  let s = buySupply(complete(setup(), "a", now), "food", now);
  for (let i = 0; i < 20; i++) {
    s = setOutcome(s, "a", dateKey(now), "pending", now);
    assert.equal(s.debt, 5);
    s = complete(s, "a", now);
    s = buySupply(s, "food", now);
  }
  assert.equal(s.inventory.food, 1);
  assert.equal(s.coins, 0);
  assert.equal(s.careEvents.filter((e) => e.kind === "buy").length, 1);
});
test("new earnings settle a reservation before new coins become spendable", () => {
  let s = buySupply(complete(setup(), "a", now), "water", now);
  s = setOutcome(s, "a", dateKey(now), "missed", now);
  assert.equal(s.debt, 4);
  s.tasks.push(task("b"));
  s = complete(s, "b", now);
  assert.equal(s.coins, 1);
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
  assert.equal(s.debt, 4);
  assert.equal(s.completions.length, 0);
  s = setOutcome(s, "a", dateKey(now), "completed", tomorrow);
  assert.equal(s.coins, 1);
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
  for (let i = 0; i < count; i++)
    s = recordAttempt(s, "a", dateKey(n), "completed", n, "earn-" + i);
  return s;
}
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
  assert.equal(s.coins, 25);
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
  assert.equal(s.debt, 5);
  assert.equal(s.care.food, 100);
  assert.equal(s.equipped.head, "beanie");
  assert.equal(s.ownedOutfits.length, 1);
  s = correctAttempt(s, "earn-1", "missed", now);
  assert.equal(s.debt, 10);
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
  assert.equal(migrated.coins, 1);
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
  assert.equal(s.coins, 750);
  assert.equal(s.completions.length, 150);
  assert.equal(new Set(s.completions.map(rewardKey)).size, 150);
  assert.ok(validState(s));
  assert.deepEqual(reload(s), s);
});
