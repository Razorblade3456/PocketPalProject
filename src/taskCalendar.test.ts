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
test("flexible calendar tasks stay singular across their window and show the deadline", () => {
  let s = saveTask(
    initial(now),
    task({
      id: "weekly-any",
      name: "Read one chapter",
      repeat: "weeklyAny",
      date: "2026-10-26",
      createdDate: "2026-10-26",
    }),
    now,
  );
  const monday = calendarTasks(s, "2026-11-02")[0],
    sunday = calendarTasks(s, "2026-11-08")[0];
  assert.equal(monday.task.id, "weekly-any");
  assert.equal(sunday.task.id, "weekly-any");
  assert.equal(monday.deadline, "Due Sunday");
  assert.equal(sunday.deadline, "Due Sunday");
  s = { ...s, vacationDays: ["2026-11-02"] };
  const html = renderToStaticMarkup(
    createElement(TaskCalendar, { s, today: "2026-11-02" }),
  );
  assert.ok(html.includes('class="calendar-day is-today"'));
  assert.ok(html.includes('aria-current="date"'));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(html.includes("vacation day"));
  assert.ok(html.includes("Vacation Day — tasks can rest today."));
  assert.ok(html.includes("☾"));
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
test("monthly specific tasks appear only on the selected or clamped calendar date", () => {
  let s = initial(now);
  s = saveTask(
    s,
    task({
      id: "monthly-day",
      date: "2026-11-01",
      repeat: "monthly",
      dayOfMonth: 31,
    }),
    now,
  );
  assert.ok(!calendarTasks(s, "2026-11-01").some((row) => row.task.id === "monthly-day"));
  assert.ok(!calendarTasks(s, "2026-11-29").some((row) => row.task.id === "monthly-day"));
  assert.ok(calendarTasks(s, "2026-11-30").some((row) => row.task.id === "monthly-day"));
  assert.ok(calendarTasks(s, "2026-12-31").some((row) => row.task.id === "monthly-day"));
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

import { jarBalls, priorityBallColors } from "./jarModel";
import { deleteAttempt } from "./model";
import { Jar } from "./Jar";
test("jar colors use immutable recorded priority and legacy records retain default styling", () => {
  for (const priority of ["high", "normal", "low"] as const) {
    let s = saveTask(initial(now), task({ priority }), now);
    s = recordAttempt(s, "a", "2026-11-01", "completed", now, "color");
    s = saveTask(
      s,
      { ...s.tasks[0], priority: priority === "low" ? "high" : "low" },
      now,
    );
    const ball = jarBalls(s, "2026-11-01")[0];
    assert.equal(ball.priority, priority);
    const html = renderToStaticMarkup(createElement(Jar, { balls: [ball] }));
    assert.ok(html.includes(priorityBallColors[priority]));
    const before = JSON.stringify(s);
    jarBalls(s, "2026-11-01");
    assert.equal(JSON.stringify(s), before);
    delete s.outcomes[0].task.priority;
    assert.equal(jarBalls(s, "2026-11-01")[0].priority, "normal");
    s.outcomes[0].task.priority = "invalid" as Task["priority"];
    assert.equal(jarBalls(s, "2026-11-01")[0].priority, "normal");
  }
});
test("manual skull balls preserve success totals, coins and care; undo removes them; automatic misses excluded", () => {
  let s = saveTask(initial(now), task({ priority: "high" }), now);
  s = recordAttempt(s, "a", "2026-11-01", "missed", now, "miss");
  const coins = s.coins,
    care = JSON.stringify(s.care),
    completions = s.completions.length;
  const balls = jarBalls(s, "2026-11-01");
  assert.equal(balls.length, 1);
  assert.equal(balls[0].missed, true);
  assert.ok(
    renderToStaticMarkup(createElement(Jar, { balls })).includes("jar-skull"),
  );
  assert.ok(
    renderToStaticMarkup(createElement(Jar, { balls })).includes("#25232a"),
  );
  assert.equal(s.coins, coins);
  assert.equal(JSON.stringify(s.care), care);
  assert.equal(s.completions.length, completions);
  assert.equal(
    jarBalls(
      { ...s, outcomes: s.outcomes.map((o) => ({ ...o, automatic: true })) },
      "2026-11-01",
    ).length,
    0,
  );
  assert.equal(jarBalls(deleteAttempt(s, "miss", now), "2026-11-01").length, 0);
  s = correctAttempt(s, "miss", "completed", now);
  assert.equal(jarBalls(s, "2026-11-01")[0].missed, undefined);
});

import { HistoricalJar } from "./TaskCalendar";
import { parseState } from "./model";
test("past calendar jar reconstructs recorded colors and skulls without changing saved state", () => {
  let s = initial(now);
  for (const priority of ["high", "normal", "low"] as const) {
    s = saveTask(s, task({ id: priority, priority }), now);
    s = recordAttempt(
      s,
      priority,
      "2026-11-01",
      "completed",
      now,
      "done-" + priority,
    );
  }
  s = recordAttempt(s, "high", "2026-11-01", "missed", now + 1, "miss-one");
  s = recordAttempt(s, "low", "2026-11-01", "missed", now + 2, "miss-two");
  s = saveTask(s, { ...s.tasks[0], priority: "low" }, now + 3);
  const earnedCoins = s.coins,
    historyCount = s.outcomes.length;
  s = deleteTask(s, "normal", now + 3);
  assert.equal(s.coins, earnedCoins);
  assert.equal(s.outcomes.length, historyCount);
  assert.equal(s.completions.filter((c) => c.taskId === "normal").length, 1);
  const before = JSON.stringify(s);
  const html = renderToStaticMarkup(
    createElement(HistoricalJar, {
      s,
      date: "2026-11-01",
      today: "2026-11-02",
    }),
  );
  assert.ok(html.includes("2 completed"));
  assert.ok(html.includes("2 missed"));
  assert.equal((html.match(/data-ball-key=/g) || []).length, 4);
  assert.equal((html.match(/jar-skull/g) || []).length, 2);
  for (const color of [priorityBallColors.high, priorityBallColors.low])
    assert.ok(html.includes(color));
  assert.ok(html.includes("static-jar"));
  assert.equal(JSON.stringify(s), before);
  s = deleteAttempt(s, "miss-one", now + 4);
  const updated = renderToStaticMarkup(
    createElement(HistoricalJar, {
      s,
      date: "2026-11-01",
      today: "2026-11-02",
    }),
  );
  assert.equal((updated.match(/data-ball-key=/g) || []).length, 3);
  assert.ok(updated.includes("1 missed"));
  const restored = parseState(JSON.parse(JSON.stringify(s)))!;
  assert.ok(restored);
  assert.equal(jarBalls(restored, "2026-11-01").length, 3);
});
test("deleting a multi-ball or missed task hides only its balls from current and archived jars", () => {
  const date = "2026-11-01";
  let s = initial(now);
  for (const id of ["repeat", "keep", "missed"])
    s = saveTask(
      s,
      task({ id, repeat: "once", date, createdDate: "2026-11-01" }),
      now,
    );
  s = recordAttempt(s, "repeat", date, "completed", now, "repeat-1");
  s = recordAttempt(s, "repeat", date, "completed", now + 1, "repeat-2");
  s = recordAttempt(s, "keep", date, "completed", now + 2, "keep-1");
  s = recordAttempt(s, "missed", date, "missed", now + 3, "missed-1");
  const coins = s.coins,
    outcomeIds = s.outcomes.map((o) => o.id);
  s = deleteTask(s, "repeat", now + 4);
  assert.deepEqual(jarBalls(s, date).map((ball) => ball.taskId), ["keep", "missed"]);
  assert.equal(s.coins, coins);
  assert.deepEqual(s.outcomes.map((o) => o.id), outcomeIds);
  s = deleteTask(s, "missed", now + 5);
  const balls = jarBalls(s, date);
  assert.equal(balls.length, 1);
  assert.equal(balls[0].taskId, "keep");
  const html = renderToStaticMarkup(
    createElement(HistoricalJar, {
      s,
      date,
      today: "2026-11-02",
    }),
  );
  assert.ok(html.includes("1 completed"));
  assert.ok(html.includes("0 missed"));
  assert.equal((html.match(/data-ball-key=/g) || []).length, 1);
  assert.equal(s.outcomes.length, outcomeIds.length);
  assert.equal(s.coins, coins);
});
test("calendar preview never fabricates jars for today, future dates, or empty historical days", () => {
  const s = initial(now);
  for (const date of ["2026-11-02", "2026-11-03"]) {
    assert.equal(
      renderToStaticMarkup(
        createElement(HistoricalJar, { s, date, today: "2026-11-02" }),
      ),
      "",
    );
  }
  const html = renderToStaticMarkup(
    createElement(HistoricalJar, {
      s,
      date: "2026-10-31",
      today: "2026-11-02",
    }),
  );
  assert.ok(html.includes("No recorded activity"));
  assert.ok(!html.includes("jar-glass"));
});

import {
  calendarEvent,
  calendarFile,
  googleCalendarUrl,
} from "./calendarExport";
test("calendar exports use selected occurrence, local time, encoded details and a 15-minute placeholder without mutation", () => {
  const s = saveTask(
    initial(now),
    task({
      name: "Laundry & rest / café",
      description: "Line one\nLine two, semi; slash\\",
      repeat: "daily",
    }),
    now,
  );
  const before = JSON.stringify(s),
    t = s.tasks[0],
    date = "2026-11-12";
  const event = calendarEvent(s, t, date),
    expected = localDate(date);
  expected.setHours(9, 0, 0, 0);
  const utc = (n: number) =>
    new Date(n).toISOString().replace(/[-:]/g, "").replace(".000Z", "Z");
  assert.equal(event.start, utc(+expected));
  assert.equal(event.end, utc(+expected + 15 * 60000));
  const url = new URL(googleCalendarUrl(s, t, date));
  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("text"), t.name);
  assert.equal(url.searchParams.get("details"), t.description);
  assert.equal(url.searchParams.get("dates"), event.start + "/" + event.end);
  const file = calendarFile(s, t, date, now);
  assert.ok(file.includes("DTSTART:" + event.start));
  assert.ok(!file.includes("RRULE"));
  assert.ok(
    file.includes("DESCRIPTION:Line one\\nLine two\\, semi\\; slash\\\\"),
  );
  assert.ok(file.includes("UID:a-2026-11-12@pocketpal.local"));
  assert.ok(file.endsWith("END:VCALENDAR\r\n"));
  assert.equal(JSON.stringify(s), before);
});
test("all-day exports use exclusive next local date and timed exports preserve local hours across DST boundaries", () => {
  const s = initial(now),
    t = task({ time: "" });
  const file = calendarFile(s, t, "2026-12-31", now);
  assert.ok(file.includes("DTSTART;VALUE=DATE:20261231"));
  assert.ok(file.includes("DTEND;VALUE=DATE:20270101"));
  assert.equal(
    new URL(googleCalendarUrl(s, t, "2026-12-31")).searchParams.get("dates"),
    "20261231/20270101",
  );
  for (const date of ["2026-03-07", "2026-03-08", "2026-11-01", "2026-11-02"]) {
    const e = calendarEvent(s, task({ time: "08:30" }), date);
    const iso = e.start.replace(
      /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
      "$1-$2-$3T$4:$5:$6Z",
    );
    const local = new Date(iso);
    assert.equal(local.getHours(), 8);
    assert.equal(local.getMinutes(), 30);
    assert.equal(local.getDate(), Number(date.slice(-2)));
  }
});
test("iCalendar folds UTF-8 lines safely and prevents injected properties from task text", () => {
  const s = initial(now),
    t = task({
      name: "☁".repeat(100),
      description: "hello\r\nBEGIN:VEVENT\u0000",
    });
  const file = calendarFile(s, t, "2026-11-01", now);
  for (const line of file.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.equal((file.match(/^BEGIN:VEVENT$/gm) || []).length, 1);
  assert.ok(!file.includes("\u0000"));
  const unfolded = file.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("SUMMARY:" + t.name));
  const html = renderToStaticMarkup(
    createElement(TaskCalendar, {
      s: saveTask(s, task(), now),
      today: "2026-11-01",
    }),
  );
  assert.ok(html.includes("Add to Calendar: Water"));
  assert.ok(html.includes("Google Calendar"));
  assert.ok(html.includes("Download Calendar File (.ics)"));
  assert.ok(html.includes("Calendar export is one-way."));
});
