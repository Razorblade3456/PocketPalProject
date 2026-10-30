import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  dateKey,
  shiftDate,
  localDate,
  parseState,
  saveTask,
  deleteTask,
  addHabitEvent,
  recordAttempt,
  type State,
  type Task,
} from "./model";
import { reconcileAlarms, alarmQueue, dismissAlarm, quietNow } from "./alarms";
const noon = +new Date(2026, 9, 30, 12),
  minute = 60000;
function setup(patch: Partial<Task> = {}): State {
  const s = initial(noon);
  s.tasks = [
    {
      id: "alarm",
      name: "Homework",
      description: "",
      time: "19:00",
      date: dateKey(noon),
      repeat: "daily",
      days: [],
      category: "happy",
      createdAt: noon,
      importantAlarm: true,
      alarmEnabledAt: noon,
      ...patch,
    },
  ];
  return s;
}
const evening = +new Date(2026, 9, 30, 19);
test("important alarms use local task time, queue once, and do not mutate task/currency history", () => {
  const s = setup(),
    before = JSON.stringify(s),
    pending = reconcileAlarms(s, noon);
  assert.equal(pending.alarms?.[0].scheduledAt, evening);
  assert.equal(alarmQueue(pending).length, 0);
  const due = reconcileAlarms(pending, evening);
  assert.equal(alarmQueue(due).length, 1);
  assert.equal(reconcileAlarms(due, evening), due);
  assert.equal(JSON.stringify(s), before);
  for (const key of [
    "outcomes",
    "completions",
    "careEvents",
    "tasks",
    "coins",
  ] as const)
    assert.deepEqual(due[key], s[key]);
});
test("stopped alarms persist across refresh without completing tasks or duplicating", () => {
  let s = reconcileAlarms(setup(), evening);
  s = dismissAlarm(s, s.alarms![0].id, 0, evening);
  const refreshed = parseState(JSON.parse(JSON.stringify(s)), evening)!;
  assert.ok(refreshed);
  assert.equal(
    alarmQueue(reconcileAlarms(refreshed, evening + minute)).length,
    0,
  );
  assert.equal(refreshed.alarms!.length, 1);
  assert.equal(refreshed.outcomes.length, 0);
});
test("5, 10 and 30 minute snoozes stop ringing, persist and ring again exactly once", () => {
  for (const delay of [5, 10, 30] as const) {
    let s = reconcileAlarms(setup(), evening),
      id = s.alarms![0].id;
    s = dismissAlarm(s, id, delay, evening);
    assert.equal(alarmQueue(s).length, 0);
    s = parseState(JSON.parse(JSON.stringify(s)), evening)!;
    assert.equal(
      alarmQueue(reconcileAlarms(s, evening + delay * minute - 1)).length,
      0,
    );
    s = reconcileAlarms(s, evening + delay * minute);
    assert.equal(alarmQueue(s).length, 1);
    assert.equal(s.alarms!.length, 1);
  }
});
test("snooze across midnight keeps its original occurrence and new day's schedule", () => {
  const at = +new Date(2026, 9, 30, 23, 55);
  let s = reconcileAlarms(setup({ time: "23:55" }), at);
  s = dismissAlarm(s, s.alarms![0].id, 10, at);
  s = reconcileAlarms(s, at + 10 * minute);
  assert.equal(alarmQueue(s).length, 1);
  assert.equal(alarmQueue(s)[0].date, dateKey(noon));
  assert.equal(s.alarms!.length, 2);
});
test("closed-session catch-up discovers overdue alarms and preserves a deterministic queue", () => {
  let s = setup();
  s.tasks.push({ ...s.tasks[0], id: "second", name: "Exam", time: "18:00" });
  s = reconcileAlarms(s, noon);
  s = reconcileAlarms(s, +new Date(2026, 9, 31, 20));
  assert.equal(alarmQueue(s).length, 4);
  assert.equal(alarmQueue(s)[0].taskId, "second");
  assert.equal(
    reconcileAlarms(s, +new Date(2026, 9, 31, 20)).alarms!.length,
    4,
  );
});
test("task deletion, edits, skip, pause and occurrence reschedule cancel stale alarms", () => {
  const due = reconcileAlarms(setup(), evening);
  assert.equal(
    reconcileAlarms(deleteTask(due, "alarm", evening), evening).alarms!.length,
    0,
  );
  const edited = saveTask(due, { ...due.tasks[0], time: "20:00" }, evening);
  const moved = reconcileAlarms(edited, evening);
  assert.equal(alarmQueue(moved).length, 0);
  assert.equal(moved.alarms![0].scheduledAt, evening + 60 * minute);
  for (const kind of ["skip", "pause", "reschedule"] as const) {
    const changed = addHabitEvent(
      due,
      {
        taskId: "alarm",
        date: dateKey(noon),
        kind,
        reason: "Rest",
        ...(kind === "reschedule"
          ? { until: shiftDate(dateKey(noon), 1) }
          : {}),
      },
      evening,
    );
    assert.equal(alarmQueue(reconcileAlarms(changed, evening)).length, 0, kind);
  }
});
test("all recurrence types and created dates reuse taskDue, without ordinary or completed alarms", () => {
  for (const repeat of [
    "daily",
    "weekly",
    "selected",
    "once",
    "interval",
    "afterCompletion",
  ] as const) {
    const s = setup({
      repeat,
      days: [new Date(noon).getDay()],
      intervalDays: 2,
    });
    assert.equal(alarmQueue(reconcileAlarms(s, evening)).length, 1, repeat);
  }
  assert.equal(
    alarmQueue(reconcileAlarms(setup({ importantAlarm: false }), evening))
      .length,
    0,
  );
  assert.equal(
    alarmQueue(
      reconcileAlarms(setup({ date: shiftDate(dateKey(noon), 1) }), evening),
    ).length,
    0,
  );
  const done = recordAttempt(
    setup(),
    "alarm",
    dateKey(noon),
    "completed",
    noon,
    "done",
  );
  assert.equal(alarmQueue(reconcileAlarms(done, evening)).length, 0);
});
test("quiet hours respect local clock, overnight and same-time full-day intervals", () => {
  const settings = {
    ...initial().settings,
    quietHours: true,
    quietStart: "21:00",
    quietEnd: "07:00",
  };
  assert.equal(quietNow(settings, +new Date(2026, 9, 30, 22)), true);
  assert.equal(quietNow(settings, +new Date(2026, 9, 30, 6)), true);
  assert.equal(quietNow(settings, noon), false);
  assert.equal(quietNow({ ...settings, quietHours: false }, evening), false);
  assert.equal(
    quietNow({ ...settings, quietStart: "12:00", quietEnd: "12:00" }, noon),
    true,
  );
});
test("timezone changes rebase untriggered wall-clock alarms; snooze remains elapsed time", () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    const n = +new Date(2026, 2, 8, 0, 30),
      s = initial(n);
    s.tasks = [
      {
        ...setup().tasks[0],
        date: dateKey(n),
        createdAt: n,
        alarmEnabledAt: n,
        time: "02:30",
      },
    ];
    let pending = reconcileAlarms(s, n);
    assert.equal(new Date(pending.alarms![0].dueAt).getHours(), 3);
    process.env.TZ = "America/New_York";
    pending = reconcileAlarms(pending, n);
    assert.equal(
      pending.alarms![0].scheduledAt,
      +new Date(`${pending.alarms![0].date}T02:30:00`),
    );
    const id = pending.alarms![0].id,
      snoozed = dismissAlarm(pending, id, 30, n);
    process.env.TZ = "America/Los_Angeles";
    assert.equal(
      reconcileAlarms(snoozed, n).alarms!.find((a) => a.id === id)!.dueAt,
      n + 30 * minute,
    );
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("alarm data validates without requiring a save migration", () => {
  const s = reconcileAlarms(setup(), evening);
  assert.ok(parseState(JSON.parse(JSON.stringify(s)), evening));
  assert.equal(
    parseState({ ...s, alarms: [{ ...s.alarms![0], dueAt: "bad" }] }, evening),
    null,
  );
  assert.equal(
    parseState({ ...s, settings: { ...s.settings, alarmVolume: 4 } }, evening),
    null,
  );
  assert.ok(parseState(initial(noon), noon));
});
