import { sortActiveTasks } from "./model";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  initial,
  saveTask,
  taskDue,
  localDate,
  recordAttempt,
  correctAttempt,
  deleteTask,
  addHabitEvent,
  type Task,
} from "./model";
import {
  calendarTasks,
  calendarMonth,
  calendarDaysForMonth,
} from "./calendarModel";
import { TaskCalendar } from "./TaskCalendar";
const now = +localDate("2026-11-01");
const task = (patch: Partial<Task> = {}): Task => ({
  id: "a",
  name: "Water",
  time: "09:00",
  description: "",
  repeat: "daily",
  days: [],
  date: "2026-11-01",
  category: "happy",
  careLinked: false,
  ...patch,
});
test("future start dates reuse recurrence without appearing early or changing the save", () => {
  let s = initial(now);
  for (const t of [
    task({ id: "daily", date: "2026-11-12" }),
    task({ id: "weekly", date: "2026-11-15", repeat: "weekly" }),
    task({ id: "once", date: "2026-11-20", repeat: "once" }),
  ])
    s = saveTask(s, t, now);
  const before = JSON.stringify(s);
  assert.equal(calendarTasks(s, "2026-11-01").length, 0);
  assert.equal(calendarTasks(s, "2026-11-11").length, 0);
  assert.deepEqual(
    calendarTasks(s, "2026-11-12").map((r) => r.task.id),
    ["daily"],
  );
  assert.ok(calendarTasks(s, "2026-11-15").some((r) => r.task.id === "weekly"));
  assert.ok(calendarTasks(s, "2026-11-22").some((r) => r.task.id === "weekly"));
  assert.ok(
    !calendarTasks(s, "2026-11-16").some((r) => r.task.id === "weekly"),
  );
  assert.ok(calendarTasks(s, "2026-11-20").some((r) => r.task.id === "once"));
  assert.ok(!calendarTasks(s, "2026-11-21").some((r) => r.task.id === "once"));
  assert.ok(s.tasks.every((t) => !taskDue(s, t, now)));
  assert.equal(JSON.stringify(s), before);
});
test("recurrence, pauses, skips and intervals come from existing scheduler", () => {
  let s = initial(now);
  s = saveTask(
    s,
    task({ id: "selected", repeat: "selected", days: [1, 3] }),
    now,
  );
  s = saveTask(
    s,
    task({ id: "interval", repeat: "interval", intervalDays: 3 }),
    now,
  );
  s = saveTask(
    s,
    task({ id: "after", repeat: "afterCompletion", intervalDays: 2 }),
    now,
  );
  s = recordAttempt(s, "after", "2026-11-01", "completed", now, "done");
  for (const date of [
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-07",
  ])
    for (const t of s.tasks)
      assert.equal(
        calendarTasks(s, date, "2026-11-01").some((r) => r.task.id === t.id),
        taskDue(s, t, +localDate(date)),
      );
  s = addHabitEvent(
    s,
    { taskId: "selected", date: "2026-11-02", kind: "skip", reason: "Rest" },
    now,
  );
  assert.ok(
    !calendarTasks(s, "2026-11-02").some((r) => r.task.id === "selected"),
  );
  s = addHabitEvent(
    s,
    {
      taskId: "interval",
      date: "2026-11-04",
      kind: "pause",
      until: "2026-11-10",
    },
    now,
  );
  assert.ok(
    !calendarTasks(s, "2026-11-04").some((r) => r.task.id === "interval"),
  );
});
test("one orb per task becomes hollow only at the full daily goal; corrections update it", () => {
  let s = saveTask(
    initial(now),
    task({ repetitions: "goal", dailyGoal: 3 }),
    now,
  );
  for (let i = 0; i < 3; i++) {
    const rows = calendarTasks(s, "2026-11-01", "2026-11-01");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].completed, false);
    assert.equal(rows[0].count, i);
    s = recordAttempt(s, "a", "2026-11-01", "completed", now, "done-" + i);
  }
  assert.equal(calendarTasks(s, "2026-11-01", "2026-11-01")[0].completed, true);
  s = correctAttempt(s, "done-2", "missed", now);
  const row = calendarTasks(s, "2026-11-01", "2026-11-01")[0];
  assert.equal(row.completed, false);
  assert.equal(row.count, 2);
  assert.equal(row.status, "Missed");
});
test("recorded history retains old names, priorities, goals and deleted tasks", () => {
  let s = saveTask(
    initial(now),
    task({
      name: "Old water",
      priority: "high",
      repetitions: "goal",
      dailyGoal: 2,
    }),
    now,
  );
  s = recordAttempt(s, "a", "2026-11-01", "completed", now, "one");
  s = recordAttempt(s, "a", "2026-11-01", "completed", now, "two");
  s = saveTask(
    s,
    {
      ...s.tasks[0],
      name: "New water",
      date: "2026-11-15",
      priority: "low",
      dailyGoal: 6,
    },
    now,
  );
  const before = JSON.stringify(s),
    row = calendarTasks(s, "2026-11-01", "2026-11-02")[0];
  assert.equal(row.task.name, "Old water");
  assert.equal(row.task.priority, "high");
  assert.equal(row.goal, 2);
  assert.equal(row.completed, true);
  assert.equal(JSON.stringify(s), before);
  s = deleteTask(s, "a", now);
  assert.equal(calendarTasks(s, "2026-11-01", "2026-11-02")[0].completed, true);
});
test("month grid handles year boundaries, leap February and local DST dates", () => {
  assert.equal(calendarMonth("2026-12-20", 1), "2027-01-01");
  assert.equal(calendarMonth("2027-01-20", -1), "2026-12-01");
  const leap = calendarDaysForMonth("2028-02-15");
  assert.equal(leap.filter(Boolean).length, 29);
  assert.equal(leap.length % 7, 0);
  const november = calendarDaysForMonth("2026-11-01").filter(Boolean);
  assert.equal(new Set(november).size, 30);
  assert.equal(november[0], "2026-11-01");
  assert.equal(november.at(-1), "2026-11-30");
});
test("calendar renders four orbs plus overflow, readable statuses, and a seven-day grid", () => {
  let s = initial(now);
  for (let i = 0; i < 6; i++)
    s = saveTask(
      s,
      task({
        id: "task-" + i,
        name: "Task " + i,
        repeat: "once",
        priority: i === 0 ? "high" : i === 5 ? "low" : "normal",
      }),
      now,
    );
  s = recordAttempt(s, "task-0", "2026-11-01", "completed", now, "complete");
  const before = JSON.stringify(s),
    html = renderToStaticMarkup(
      createElement(TaskCalendar, { s, today: "2026-11-01" }),
    );
  assert.ok(html.includes('calendar-more">+2'));
  assert.ok(html.includes("is-complete"));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes('aria-current="date"'));
  assert.ok(html.includes("6 tasks, 1 completed"));
  const selected = html.match(
    /<details[^>]*class="calendar-selected"[^>]*>/,
  )?.[0];
  assert.ok(selected);
  assert.ok(!selected.includes(" open"));
  assert.ok(html.includes("<summary>"));
  assert.ok(html.includes("Pending"));
  assert.ok(html.includes("Completed"));
  assert.ok(html.indexOf("Task 0</strong>") < html.indexOf("Task 5</strong>"));
  assert.equal(JSON.stringify(s), before);
});

test("calendar rows and four visible orbs follow the main list's priority/time order", () => {
  const s = initial(now);
  s.tasks = [
    task({ id: "low-late", priority: "low", time: "18:00" }),
    task({ id: "normal", priority: "normal", time: "07:00" }),
    task({ id: "high-late", priority: "high", time: "11:00" }),
    task({ id: "high-early", priority: "high", time: "08:00" }),
    task({ id: "low-early", priority: "low", time: "09:00" }),
  ];
  const rows = calendarTasks(s, "2026-11-01", "2026-11-01");
  assert.deepEqual(
    rows.map((r) => r.task.id),
    sortActiveTasks(s.tasks).map((t) => t.id),
  );
  assert.deepEqual(
    rows.map((r) => r.task.id),
    ["high-early", "high-late", "normal", "low-early", "low-late"],
  );
  const html = renderToStaticMarkup(
    createElement(TaskCalendar, { s, today: "2026-11-01" }),
  );
  const firstDay = html.match(
    /<span class="calendar-orbs">([\s\S]*?)<\/button>/,
  )![1];
  assert.deepEqual(
    [...firstDay.matchAll(/priority-(high|normal|low)/g)].map((m) => m[1]),
    ["high", "high", "normal", "low"],
  );
  assert.ok(firstDay.includes('calendar-more">+1'));
});

test("calendar exposes existing task editors and labels recurring series without resurrecting deleted tasks", () => {
  let s = initial(now);
  s = saveTask(s, task({ id: "one", repeat: "once", date: "2026-11-01" }), now);
  s = saveTask(s, task({ id: "series", name: "Series", repeat: "daily" }), now);
  const html = renderToStaticMarkup(
    createElement(TaskCalendar, { s, today: "2026-11-01", onEdit: () => {} }),
  );
  assert.ok(html.includes("Edit Task: Water"));
  assert.ok(html.includes("Edit Task Series: Series"));
  s = recordAttempt(s, "one", "2026-11-01", "completed", now, "old-one");
  s = deleteTask(s, "one", now);
  const removed = renderToStaticMarkup(
    createElement(TaskCalendar, { s, today: "2026-11-01", onEdit: () => {} }),
  );
  assert.ok(!removed.includes("Edit Task: Water"));
});
test("editing a future series retains its original ID, completions and reward ledger", () => {
  let s = saveTask(initial(now), task({ id: "series", repeat: "daily" }), now);
  s = recordAttempt(s, "series", "2026-11-01", "completed", now, "history");
  const outcomes = JSON.stringify(s.outcomes),
    ledger = JSON.stringify(s.rewardLedger);
  const original = s.tasks.find(
    (t) => t.id === calendarTasks(s, "2026-11-12")[0].task.id,
  )!;
  s = saveTask(
    s,
    {
      ...original,
      name: "Edited series",
      date: "2026-11-15",
      repeat: "weekly",
      priority: "high",
    },
    now,
  );
  assert.equal(s.tasks.length, 1);
  assert.equal(s.tasks[0].id, "series");
  assert.equal(calendarTasks(s, "2026-11-12").length, 0);
  assert.equal(calendarTasks(s, "2026-11-15")[0].task.name, "Edited series");
  assert.equal(JSON.stringify(s.outcomes), outcomes);
  assert.equal(JSON.stringify(s.rewardLedger), ledger);
});

test("deleted tasks disappear from current/future calendar but retain past records and rewards", () => {
  let s = saveTask(initial(now), task({ repeat: "daily" }), now);
  s = recordAttempt(s, "a", "2026-11-01", "completed", now, "kept-reward");
  const coins = s.coins,
    ledger = JSON.stringify(s.rewardLedger),
    outcomes = JSON.stringify(s.outcomes);
  s = deleteTask(s, "a", now);
  assert.equal(calendarTasks(s, "2026-11-01", "2026-11-01").length, 0);
  assert.equal(calendarTasks(s, "2026-11-02", "2026-11-01").length, 0);
  assert.equal(calendarTasks(s, "2026-11-01", "2026-11-02").length, 1);
  assert.equal(s.coins, coins);
  assert.equal(JSON.stringify(s.rewardLedger), ledger);
  assert.equal(JSON.stringify(s.outcomes), outcomes);
});

test("future calendar creation uses existing save path and does not become due today", () => {
  const s = saveTask(
    initial(now),
    task({ id: "future", repeat: "once", date: "2026-11-12" }),
    now,
  );
  assert.equal(s.tasks.length, 1);
  assert.equal(taskDue(s, s.tasks[0], now), false);
  assert.equal(
    calendarTasks(s, "2026-11-12", "2026-11-01")[0].task.id,
    "future",
  );
  const html = renderToStaticMarkup(
    createElement(TaskCalendar, { s, today: "2026-11-01", onAdd: () => {} }),
  );
  assert.ok(html.includes("+ Add Task"));
});
