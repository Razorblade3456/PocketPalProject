import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  taskReminderMode,
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
import {
  reconcileAlarms,
  alarmQueue,
  dismissAlarm,
  quietNow,
  setAlarmDeadline,
  nearestAlarm,
  formatCountdown,
  countdownProgress,
} from "./alarms";
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

test("relative alarms save one fixed timestamp and survive unrelated edits and refresh", () => {
  let s = setup();
  const task = setAlarmDeadline(
    s.tasks[0],
    "relative",
    20,
    false,
    noon + 12345,
  );
  assert.equal(task.relativeAlarmAt, noon + 12345 + 20 * minute);
  s = saveTask(s, task, noon + 12345);
  s = reconcileAlarms(s, noon + 12345);
  assert.equal(s.alarms!.length, 1);
  assert.equal(s.alarms![0].dueAt, task.relativeAlarmAt);
  assert.equal(s.alarms![0].status, "pending");
  const edited = setAlarmDeadline(
    { ...task, name: "Updated name" },
    "relative",
    50,
    false,
    noon + minute,
  );
  assert.equal(edited.relativeAlarmAt, task.relativeAlarmAt);
  s = saveTask(s, edited, noon + minute);
  const restored = parseState(JSON.parse(JSON.stringify(s)), noon + minute)!;
  assert.ok(restored);
  const next = reconcileAlarms(restored, noon + minute);
  assert.equal(next.alarms!.length, 1);
  assert.equal(next.alarms![0].dueAt, task.relativeAlarmAt);
  assert.equal(
    reconcileAlarms(next, task.relativeAlarmAt! - 1).alarms![0].status,
    "pending",
  );
  const ringing = reconcileAlarms(next, task.relativeAlarmAt!);
  assert.equal(alarmQueue(ringing).length, 1);
  assert.equal(
    alarmQueue(reconcileAlarms(ringing, task.relativeAlarmAt! + minute)).length,
    1,
  );
});
test("relative snooze and stop reuse the same alarm without rearming or affecting history", () => {
  let s = setup();
  s.tasks[0] = setAlarmDeadline(s.tasks[0], "relative", 5, false, noon);
  s = reconcileAlarms(s, noon + 5 * minute);
  const id = s.alarms![0].id;
  s = dismissAlarm(s, id, 10, noon + 5 * minute);
  assert.equal(nearestAlarm(s.alarms)!.dueAt, noon + 15 * minute);
  assert.equal(
    reconcileAlarms(s, noon + 14 * minute).alarms![0].status,
    "pending",
  );
  s = reconcileAlarms(s, noon + 15 * minute);
  assert.equal(alarmQueue(s).length, 1);
  s = dismissAlarm(s, id, 0, noon + 15 * minute);
  assert.equal(
    nearestAlarm(reconcileAlarms(s, noon + 16 * minute).alarms),
    undefined,
  );
  assert.equal(s.outcomes.length, 0);
  assert.equal(s.coins, 0);
});
test("relative alarms explicitly restart or switch back to wall-clock scheduling", () => {
  const t = setAlarmDeadline(setup().tasks[0], "relative", 20, false, noon);
  const restarted = setAlarmDeadline(t, "relative", 50, true, noon + minute);
  assert.equal(restarted.relativeAlarmAt, noon + 51 * minute);
  let s = setup();
  s.tasks = [t];
  s = reconcileAlarms(s, noon);
  s = saveTask(s, restarted, noon + minute);
  s = reconcileAlarms(s, noon + minute);
  assert.equal(s.alarms!.length, 1);
  assert.equal(s.alarms![0].dueAt, restarted.relativeAlarmAt);
  const clock = setAlarmDeadline(
    { ...restarted, time: "19:00" },
    "time",
    20,
    false,
    noon + minute,
  );
  assert.equal(clock.relativeAlarmAt, undefined);
  s = saveTask(s, clock, noon + minute);
  s = reconcileAlarms(s, noon + minute);
  assert.equal(s.alarms!.length, 1);
  assert.equal(s.alarms![0].dueAt, evening);
  for (const invalid of [0, -5, 1.5, NaN, Infinity, 525601])
    assert.throws(() => setAlarmDeadline(t, "relative", invalid, true, noon));
});
test("relative deadlines across midnight remain absolute and cancel on delete, skip or completion", () => {
  const beforeMidnight = +new Date(2026, 9, 30, 23, 50, 23);
  let s = setup();
  s.tasks[0] = setAlarmDeadline(
    { ...s.tasks[0], repeat: "selected", days: [1] },
    "relative",
    20,
    false,
    beforeMidnight,
  );
  s = reconcileAlarms(s, beforeMidnight);
  const due = beforeMidnight + 20 * minute;
  assert.equal(s.alarms!.length, 1);
  assert.equal(s.alarms![0].dueAt, due);
  assert.equal(reconcileAlarms(s, due - 1).alarms![0].dueAt, due);
  assert.equal(
    reconcileAlarms(
      deleteTask(s, s.tasks[0].id, beforeMidnight),
      beforeMidnight,
    ).alarms!.length,
    0,
  );
  const skipped = addHabitEvent(
    s,
    {
      taskId: s.tasks[0].id,
      date: dateKey(beforeMidnight),
      kind: "skip",
      reason: "Rest",
    },
    beforeMidnight,
  );
  assert.equal(reconcileAlarms(skipped, beforeMidnight).alarms!.length, 0);
  const regular = setup();
  regular.tasks[0] = setAlarmDeadline(
    regular.tasks[0],
    "relative",
    20,
    false,
    noon,
  );
  const completed = recordAttempt(
    reconcileAlarms(regular, noon),
    regular.tasks[0].id,
    dateKey(noon),
    "completed",
    noon + minute,
  );
  assert.equal(
    nearestAlarm(reconcileAlarms(completed, noon + minute).alarms),
    undefined,
  );
});
test("shared countdown formats absolute deadlines and chooses only an active nearest alarm", () => {
  assert.equal(formatCountdown(noon + 20 * minute, noon + 18000), "19:42");
  assert.equal(formatCountdown(noon + 1000, noon), "00:01");
  assert.equal(formatCountdown(noon, noon + minute), "00:00");
  assert.equal(formatCountdown(noon + 61 * minute, noon), "1:01:00");
  const s = setup();
  s.tasks[0] = setAlarmDeadline(s.tasks[0], "relative", 20, false, noon);
  const a = reconcileAlarms(s, noon).alarms![0];
  const b = {
    ...a,
    id: "later",
    taskId: "later-task",
    dueAt: noon + 50 * minute,
  };
  assert.equal(nearestAlarm([b, a])!.id, a.id);
  assert.equal(nearestAlarm([{ ...a, status: "stopped" }, b])!.id, b.id);
  assert.equal(nearestAlarm([a, b], "later-task")!.id, b.id);
  assert.equal(nearestAlarm([a, b], "deleted"), undefined);
});

test("existing time-alarm signatures remain compatible with pre-countdown saves", () => {
  const s = setup();
  const before = reconcileAlarms(s, noon);
  const t = s.tasks[0];
  const legacy = JSON.stringify([
    t.time,
    t.repeat,
    t.days,
    t.date,
    t.intervalDays,
    t.alarmEnabledAt,
    t.time,
    [],
  ]);
  assert.equal(before.alarms![0].schedule, legacy);
  const stopped = dismissAlarm(before, before.alarms![0].id, 0, noon);
  assert.equal(alarmQueue(reconcileAlarms(stopped, evening)).length, 0);
  assert.equal(reconcileAlarms(stopped, evening).alarms!.length, 1);
});

test("a relative deadline after midnight still belongs to the task occurrence being completed", () => {
  const at = +new Date(2026, 9, 30, 23, 50, 23);
  let s = setup({ repeat: "once", date: dateKey(at) });
  s.tasks[0] = setAlarmDeadline(s.tasks[0], "relative", 20, false, at);
  s = reconcileAlarms(s, at);
  assert.equal(s.alarms![0].date, dateKey(at));
  const completed = recordAttempt(
    s,
    s.tasks[0].id,
    dateKey(at),
    "completed",
    at + minute,
  );
  assert.equal(
    nearestAlarm(reconcileAlarms(completed, at + minute).alarms),
    undefined,
  );
});

test("each saved reminder/alarm flag combination selects exactly one notification path", () => {
  for (const importantAlarm of [false, true])
    for (const reminderEnabled of [false, true, undefined]) {
      const s = setup({ importantAlarm, reminderEnabled });
      const mode = taskReminderMode(s.tasks[0]);
      assert.equal(
        mode,
        importantAlarm
          ? "alarm"
          : reminderEnabled === false
            ? "off"
            : "reminder",
      );
      const alarms = alarmQueue(reconcileAlarms(s, evening));
      assert.equal(alarms.length, importantAlarm ? 1 : 0);
      assert.ok(!(mode === "reminder" && alarms.length));
      const restored = parseState(JSON.parse(JSON.stringify(s)), noon)!;
      assert.equal(restored.tasks[0].reminderEnabled, reminderEnabled);
      assert.equal(taskReminderMode(restored.tasks[0]), mode);
    }
});

test("visual countdown uses persisted real start and deadline with a continuous color progression", () => {
  let s = setup();
  s.tasks[0] = setAlarmDeadline(s.tasks[0], "relative", 20, false, noon);
  s = reconcileAlarms(s, noon);
  const alarm = s.alarms![0];
  assert.equal(alarm.startedAt, noon);
  assert.deepEqual(countdownProgress(alarm, noon), {
    percent: 100,
    color: "rgb(168, 196, 107)",
  });
  assert.deepEqual(countdownProgress(alarm, noon + 10 * minute), {
    percent: 50,
    color: "rgb(209, 177, 95)",
  });
  assert.deepEqual(countdownProgress(alarm, noon + 17 * minute), {
    percent: 15,
    color: "rgb(217, 141, 89)",
  });
  assert.deepEqual(countdownProgress(alarm, noon + 20 * minute), {
    percent: 0,
    color: "rgb(202, 103, 116)",
  });
  assert.equal(countdownProgress(alarm, noon - minute)!.percent, 100);
  assert.equal(countdownProgress(alarm, noon + 30 * minute)!.percent, 0);
  s = parseState(JSON.parse(JSON.stringify(s)), noon + 10 * minute)!;
  assert.equal(
    countdownProgress(s.alarms![0], noon + 10 * minute)!.percent,
    50,
  );
});
test("snoozing saves a new start so the visual bar resets and survives refresh", () => {
  let s = reconcileAlarms(setup(), evening);
  const id = s.alarms![0].id;
  s = dismissAlarm(s, id, 10, evening + 1234);
  const alarm = s.alarms![0];
  assert.equal(alarm.startedAt, evening + 1234);
  assert.equal(alarm.dueAt, evening + 1234 + 10 * minute);
  assert.equal(countdownProgress(alarm, evening + 1234)!.percent, 100);
  s = parseState(JSON.parse(JSON.stringify(s)), evening + 1234 + 5 * minute)!;
  assert.equal(
    countdownProgress(s.alarms![0], evening + 1234 + 5 * minute)!.percent,
    50,
  );
  assert.equal(alarmQueue(reconcileAlarms(s, alarm.dueAt)).length, 1);
});
test("legacy relative alarms recover known starts without resetting dates; unknown old snoozes are not fabricated", () => {
  let s = setup();
  s.tasks[0] = setAlarmDeadline(s.tasks[0], "relative", 20, false, noon);
  s = reconcileAlarms(s, noon);
  delete s.alarms![0].startedAt;
  const restored = reconcileAlarms(s, noon + 10 * minute);
  assert.equal(restored.alarms![0].id, s.alarms![0].id);
  assert.equal(restored.alarms![0].dueAt, s.alarms![0].dueAt);
  assert.equal(
    countdownProgress(restored.alarms![0], noon + 10 * minute)!.percent,
    50,
  );
  s = dismissAlarm(restored, restored.alarms![0].id, 5, noon + 20 * minute);
  delete s.alarms![0].startedAt;
  assert.equal(
    countdownProgress(
      reconcileAlarms(s, noon + 21 * minute).alarms![0],
      noon + 21 * minute,
    ),
    null,
  );
});
