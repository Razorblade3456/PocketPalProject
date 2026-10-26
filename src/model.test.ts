import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
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
test("positive and negative give exactly +10 or -8 in the selected category", () => {
  const s = setup();
  const positive = complete(s, "a", now);
  assert.equal(positive.care.water, 95);
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
  const a = complete(s, "a", now);
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
  assert.equal(a.care.water, 95);
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
  assert.equal(s.care.water, 100);
  s = setOutcome(s, "a", dateKey(now), "pending", now);
  assert.equal(s.care.water, 90);
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
