import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  decay,
  complete,
  due,
  stage,
  dateKey,
  validState,
  type Task,
} from "./model";
const now = new Date(2026, 9, 25, 12).getTime();
const task: Task = {
  id: "a",
  name: "Water",
  description: "",
  time: "08:00",
  repeat: "daily",
  days: [],
  date: dateKey(now),
  category: "water",
};
test("new users receive a full day grace period", () => {
  const s = initial();
  assert.equal(decay(s, s.created + 23 * 3600000).care.water, 85);
});
test("decay uses elapsed timestamps without double charging", () => {
  const s = {
    ...initial(),
    created: now - 72 * 3600000,
    updated: now - 10 * 3600000,
  };
  const a = decay(s, now);
  assert.equal(a.care.water, 74);
  assert.deepEqual(decay(a, now).care, a.care);
});
test("one reward per task and local date, repeats next day", () => {
  const s = { ...initial(), tasks: [task], created: now, updated: now };
  const a = complete(s, "a", now);
  assert.equal(a.completions.length, 1);
  assert.equal(complete(a, "a", now + 100).completions.length, 1);
  assert.equal(complete(a, "a", now + 86400000).completions.length, 2);
});
test("weekly, selected and one-time schedules", () => {
  assert.equal(due({ ...task, repeat: "weekly" }, now + 86400000), false);
  assert.equal(due({ ...task, repeat: "weekly" }, now + 7 * 86400000), true);
  assert.equal(due({ ...task, repeat: "selected", days: [0] }, now), true);
  assert.equal(due({ ...task, repeat: "once" }, now + 86400000), false);
});
test("cozy mode prevents death; ordinary mode permits death after extended neglect", () => {
  const s = {
    ...initial(),
    created: now - 20 * 86400000,
    updated: now - 10 * 86400000,
  };
  assert.equal(stage(decay(s, now)), 4);
  assert.equal(
    stage(decay({ ...s, settings: { ...s.settings, cozy: false } }, now)),
    5,
  );
});
test("all six health stages exist", () => {
  for (const [value, expected] of [
    [90, 0],
    [60, 1],
    [40, 2],
    [20, 3],
    [5, 4],
    [0, 5],
  ]) {
    const s = initial();
    s.settings.cozy = false;
    s.care = { food: value, water: value, clean: value, happy: value };
    assert.equal(stage(s), expected);
  }
});
test("backup validation rejects malformed data", () => {
  assert.equal(validState(initial()), true);
  assert.equal(validState({ version: 1 }), false);
  assert.equal(validState({ ...initial(), tasks: [{}] }), false);
});
test("completions preserve historical names and achievements", () => {
  const s = { ...initial(), tasks: [task], created: now, updated: now };
  const a = complete(s, "a", now);
  assert.equal(a.completions[0].name, "Water");
  assert.ok(a.achievements.includes("Full Jar"));
  assert.ok(a.achievements.includes("First Meal"));
});
test("completion calculates elapsed decay before checking death", () => {
  const s = {
    ...initial(),
    tasks: [task],
    created: now - 30 * 86400000,
    updated: now - 20 * 86400000,
  };
  s.settings.cozy = false;
  assert.equal(complete(s, "a", now).completions.length, 0);
});
