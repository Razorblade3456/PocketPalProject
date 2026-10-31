import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  saveTask,
  recordAttempt,
  correctAttempt,
  deleteAttempt,
  decay,
  dateKey,
  localDate,
  shiftDate,
  taskDue,
  due,
  calendarDays,
  goalFor,
  taskCounts,
  buySupply,
  useSupply,
  parseState,
  validState,
  changeRewardPolicy,
  addHabitEvent,
  pausedOn,
  toggleFocus,
  setStep,
  stepIsDone,
  reminderFor,
  type State,
  type Task,
} from "./model";
const n = +localDate("2026-10-29"),
  day = dateKey(n),
  at = (offset: number) => +localDate(shiftDate(day, offset));
const make = (patch: Partial<Task> = {}) =>
  saveTask(
    initial(n),
    {
      id: "a",
      name: "A little habit",
      description: "",
      time: "09:00",
      repeat: "daily",
      days: [],
      date: day,
      category: "happy",
      careLinked: false,
      ...patch,
    },
    n,
  );
const press = (
  s: State,
  count: number,
  status: "completed" | "missed" = "completed",
  time = n,
  prefix = "tap",
) => {
  for (let i = 0; i < count; i++)
    s = recordAttempt(s, "a", dateKey(time), status, time, `${prefix}:${i}`);
  return s;
};
const roundtrip = (s: State, time = n) => {
  assert.ok(validState(s));
  const restored = parseState(JSON.parse(JSON.stringify(s)), time);
  assert.ok(restored);
  assert.deepEqual(restored, s);
  return restored;
};

test("default economy caps coins and balls at three while keeping all 20 positive actions", () => {
  const s = press(make(), 20);
  assert.equal(s.coins, 15);
  assert.equal(s.completions.length, 3);
  assert.equal(taskCounts(s, "a", day).completed, 20);
  assert.equal(s.outcomes.length, 20);
  roundtrip(s);
});
test("custom goal rewards only its target; additional entries and negatives stay independent", () => {
  let s = press(make({ repetitions: "goal", dailyGoal: 6 }), 9);
  s = press(s, 3, "missed", n, "miss");
  assert.equal(s.coins, 30);
  assert.equal(s.completions.length, 6);
  assert.equal(taskCounts(s, "a", day).completed, 9);
  assert.equal(taskCounts(s, "a", day).missed, 3);
  assert.equal(s.care.happy, 90);
});
test("unlimited has a finite currency quota and never gains automatic misses", () => {
  let s = press(make({ repetitions: "unlimited" }), 10);
  s = decay(s, at(7));
  assert.equal(s.coins, 15);
  assert.equal(s.outcomes.filter((o) => o.automatic).length, 0);
});
test("per-task reward cap and zero-reward tracking work", () => {
  assert.equal(press(make({ rewardCap: 1 }), 8).coins, 5);
  assert.equal(press(make({ rewardCap: 0 }), 8).coins, 0);
  assert.equal(press(make({ rewardCap: 0 }), 8).outcomes.length, 8);
});
test("same transaction ID never duplicates an action, reward or jar ball", () => {
  let s = recordAttempt(make(), "a", day, "completed", n, "same");
  s = recordAttempt(s, "a", day, "completed", n, "same");
  assert.equal(s.outcomes.length, 1);
  assert.equal(s.rewardLedger?.length, 1);
  s = deleteAttempt(s, "same", n);
  s = recordAttempt(s, "a", day, "completed", n, "same");
  assert.equal(s.coins, 0);
  assert.equal(s.outcomes.length, 1);
});
test("twenty positive-negative corrections append adjustments without producing profit", () => {
  let s = press(make(), 1);
  let prefix = [...(s.rewardLedger || [])];
  for (let i = 0; i < 20; i++) {
    s = correctAttempt(s, "tap:0", "missed", n);
    assert.deepEqual(s.rewardLedger?.slice(0, prefix.length), prefix);
    prefix = [...(s.rewardLedger || [])];
    s = correctAttempt(s, "tap:0", "completed", n);
    assert.equal(s.coins, 5);
  }
  assert.equal(
    s.rewardLedger?.reduce((v, e) => v + e.amount, 0),
    5,
  );
  assert.equal(s.completions.length, 1);
  roundtrip(s);
});
test("correcting funded income after purchase and consumption reserves debt and never duplicates goods", () => {
  let s = press(make({ rewardCap: 1 }), 1);
  s = buySupply(s, "food", n, "purchase");
  s = useSupply(s, "food", n, "consume");
  const food = s.care.food;
  s = correctAttempt(s, "tap:0", "missed", n);
  assert.equal(s.debt, 5);
  assert.equal(s.inventory.food, 0);
  assert.equal(s.care.food, food);
  s = correctAttempt(s, "tap:0", "completed", n);
  assert.equal(s.coins, 0);
  assert.equal(s.debt, 0);
  assert.equal(s.inventory.food, 0);
  assert.equal(s.careEvents.filter((e) => e.kind === "buy").length, 1);
  roundtrip(s);
});
test("undoing an eligible result promotes an already tracked extra without exceeding the cap", () => {
  let s = press(make({ rewardCap: 2 }), 3);
  s = deleteAttempt(s, "tap:0", n);
  assert.equal(s.coins, 10);
  assert.equal(s.completions.length, 2);
  assert.ok(s.completions.some((c) => c.id === "tap:2"));
  roundtrip(s);
});
test("policy edits affect new entries and preserve old reward rate snapshots", () => {
  let s = press(make(), 2);
  s = changeRewardPolicy(s, { coins: 8, dailyCap: 3 }, n);
  s = recordAttempt(s, "a", day, "completed", n, "new");
  assert.equal(s.coins, 18);
  s = recordAttempt(s, "a", day, "completed", n, "extra");
  assert.equal(s.coins, 18);
  assert.equal(s.outcomes.find((o) => o.id === "tap:0")?.rewardRate, 5);
  roundtrip(s);
});
test("daily reward limits reset on a new local calendar date", () => {
  let s = press(make(), 7);
  s = press(s, 7, "completed", at(1), "tomorrow");
  assert.equal(s.coins, 30);
  assert.equal(s.completions.length, 6);
});
test("every X days uses the start-date calendar anchor", () => {
  const s = make({ repeat: "interval", intervalDays: 3 });
  for (let i = 0; i < 10; i++)
    assert.equal(taskDue(s, s.tasks[0], at(i)), i % 3 === 0);
});
test("after-completion recurrence resets its anchor after a corrected completion", () => {
  let s = make({ repeat: "afterCompletion", intervalDays: 3 });
  s = press(s, 1);
  assert.equal(taskDue(s, s.tasks[0], at(2)), false);
  assert.equal(taskDue(s, s.tasks[0], at(3)), true);
  s = press(s, 1, "completed", at(3), "next");
  assert.equal(taskDue(s, s.tasks[0], at(5)), false);
  assert.equal(taskDue(s, s.tasks[0], at(6)), true);
  s = correctAttempt(s, "next:0", "pending", at(3));
  assert.equal(taskDue(s, s.tasks[0], at(4)), false);
});
test("weekly, selected weekdays and one-time schedules retain their local dates", () => {
  const weekly = make({ repeat: "weekly" }),
    selected = make({ repeat: "selected", days: [0, 6] }),
    once = make({ repeat: "once" });
  assert.ok(taskDue(weekly, weekly.tasks[0], at(7)));
  assert.ok(!taskDue(weekly, weekly.tasks[0], at(1)));
  assert.ok(taskDue(selected, selected.tasks[0], +localDate("2026-10-31")));
  assert.ok(!taskDue(once, once.tasks[0], at(1)));
});
test("DST boundaries use calendar days rather than 24-hour elapsed periods", () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const start = +localDate("2026-10-31");
    const s = saveTask(
      initial(start),
      {
        id: "a",
        name: "DST",
        description: "",
        time: "09:00",
        repeat: "interval",
        intervalDays: 2,
        days: [],
        date: "2026-10-31",
        category: "happy",
      },
      start,
    );
    assert.equal(calendarDays("2026-11-02", "2026-10-31"), 2);
    assert.ok(taskDue(s, s.tasks[0], +localDate("2026-11-02")));
    assert.ok(!taskDue(s, s.tasks[0], +localDate("2026-11-01")));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test("creation-date snapshots prevent penalties before task creation even after timezone changes", () => {
  const s = make({ date: "2026-01-01" });
  assert.ok(!taskDue(s, s.tasks[0], at(-1)));
  assert.equal(s.tasks[0].createdDate, day);
});
test("finite goals count manual misses and only auto-record genuine shortfalls once", () => {
  let s = press(make({ repetitions: "goal", dailyGoal: 6 }), 2);
  s = press(s, 1, "missed", n, "miss");
  s = decay(s, at(1));
  assert.equal(s.outcomes.filter((o) => o.automatic).length, 3);
  const count = s.outcomes.length;
  s = decay(s, at(1));
  assert.equal(s.outcomes.length, count);
  roundtrip(s, at(1));
});
test("skip with a reason suppresses automatic penalties but keeps prior actions", () => {
  let s = press(make({ repetitions: "goal", dailyGoal: 6 }), 1);
  s = addHabitEvent(
    s,
    { kind: "skip", taskId: "a", date: day, reason: "Sick" },
    n,
    "skip",
  );
  assert.ok(!taskDue(s, s.tasks[0], n));
  s = decay(s, at(1));
  assert.equal(s.outcomes.length, 1);
  assert.equal(s.coins, 5);
  assert.equal(s.habitEvents?.[0].reason, "Sick");
});
test("vacation pause covers inclusive dates and resumes afterward without backfilled misses", () => {
  let s = addHabitEvent(
    make(),
    {
      kind: "pause",
      taskId: "a",
      date: day,
      until: shiftDate(day, 3),
      reason: "Vacation",
    },
    n,
  );
  s = decay(s, at(4));
  assert.equal(s.outcomes.length, 0);
  assert.ok(taskDue(s, s.tasks[0], at(4)));
  assert.ok(!pausedOn(s, "a", shiftDate(day, 4)));
});
test("indefinite pause and explicit resume respect prior paused dates", () => {
  let s = addHabitEvent(make(), { kind: "pause", taskId: "a", date: day }, n);
  s = addHabitEvent(
    s,
    { kind: "resume", taskId: "a", date: shiftDate(day, 3) },
    at(3),
  );
  assert.equal(s.outcomes.length, 0);
  assert.ok(taskDue(s, s.tasks[0], at(3)));
});
test("rescheduling moves only one occurrence, with no penalty on its original day", () => {
  let s = addHabitEvent(
    make({ repeat: "once" }),
    { kind: "reschedule", taskId: "a", date: day, until: shiftDate(day, 2) },
    n,
  );
  assert.ok(!taskDue(s, s.tasks[0], n));
  assert.ok(taskDue(s, s.tasks[0], at(2)));
  s = decay(s, at(2));
  assert.equal(s.outcomes.length, 0);
  s = press(s, 1, "completed", at(2));
  assert.equal(s.coins, 5);
});
test("snoozing overrides just today’s reminder and is recorded in history", () => {
  const s = addHabitEvent(
    make(),
    { kind: "snooze", taskId: "a", date: day, time: "16:30" },
    n,
  );
  assert.equal(reminderFor(s, s.tasks[0], day), "16:30");
  assert.equal(reminderFor(s, s.tasks[0], shiftDate(day, 1)), "09:00");
  roundtrip(s);
});
test("Today’s 3 is optional, capped at three and local-date specific", () => {
  let s = make();
  for (const id of ["a", "b", "c", "d"]) s = toggleFocus(s, id, day);
  assert.deepEqual(s.focusDays?.[day], ["a", "b", "c"]);
  assert.equal(s.focusDays?.[shiftDate(day, 1)], undefined);
  s = toggleFocus(s, "b", day);
  assert.deepEqual(s.focusDays?.[day], ["a", "c"]);
  roundtrip(s);
});
test("tiny steps contribute exactly one parent reward without per-step coins", () => {
  let s = make({
    steps: [
      { id: "one", name: "Open book" },
      { id: "two", name: "Read a page" },
    ],
  });
  s = setStep(s, "a", "one", true, day, n, "step1");
  assert.equal(s.coins, 0);
  s = setStep(s, "a", "two", true, day, n, "step2");
  assert.equal(s.coins, 5);
  assert.equal(s.outcomes.length, 1);
  for (let i = 0; i < 4; i++) {
    s = setStep(s, "a", "two", false, day, n, "off" + i);
    s = setStep(s, "a", "two", true, day, n, "on" + i);
  }
  assert.equal(s.coins, 5);
  assert.equal(s.outcomes.length, 1);
  assert.ok(stepIsDone(s, "a", "two", day));
  roundtrip(s);
});
test("tiny steps do not award a second parent completion after a manual positive", () => {
  let s = press(make({ steps: [{ id: "one", name: "Tiny step" }] }), 1);
  s = setStep(s, "a", "one", true, day, n);
  assert.equal(s.coins, 5);
  assert.equal(taskCounts(s, "a", day).completed, 1);
});
test("editing keeps original outcome snapshots, ledger and tiny-step history", () => {
  let s = press(make(), 1);
  const ledger = [...(s.rewardLedger || [])];
  s = saveTask(
    s,
    { ...s.tasks[0], name: "New name", repeat: "interval", intervalDays: 5 },
    n,
  );
  assert.equal(s.outcomes[0].name, "A little habit");
  assert.deepEqual(s.rewardLedger, ledger);
  roundtrip(s);
});
test("older saves keep existing rewards, goods and care when the ledger is first introduced", () => {
  let s = press(make({ rewardCap: 10 }), 10);
  s = buySupply(s, "food", n);
  const old = JSON.parse(JSON.stringify(s));
  delete old.rewardLedger;
  delete old.rewardPolicy;
  delete old.habitEvents;
  delete old.focusDays;
  old.outcomes.forEach((o: any) => {
    delete o.rewardRate;
    delete o.rewardLimit;
  });
  const restored = parseState(old, n)!;
  assert.ok(restored);
  assert.equal(restored.coins, 45);
  assert.equal(restored.inventory.food, 1);
  assert.deepEqual(restored.care, s.care);
  assert.equal(
    restored.rewardLedger?.reduce((sum, e) => sum + e.amount, 0),
    50,
  );
  roundtrip(restored);
});
test("malformed habit policies and unknown ledger entries are rejected safely", () => {
  const s = make();
  assert.ok(!parseState({ ...s, rewardPolicy: { coins: -1, dailyCap: 3 } }, n));
  assert.ok(
    !parseState(
      {
        ...s,
        rewardLedger: [{ id: "bad", entryId: "unknown", amount: 5, at: n }],
      },
      n,
    ),
  );
  assert.ok(!parseState({ ...s, tasks: {} }, n));
});

test("skips and reschedules can be corrected by restoring today without erasing history", () => {
  let s = addHabitEvent(
    make({ repeat: "once" }),
    { kind: "skip", taskId: "a", date: day, reason: "Rest" },
    n,
  );
  s = addHabitEvent(s, { kind: "restore", taskId: "a", date: day }, n);
  assert.ok(taskDue(s, s.tasks[0], n));
  s = addHabitEvent(
    s,
    { kind: "reschedule", taskId: "a", date: day, until: shiftDate(day, 2) },
    n,
  );
  assert.ok(taskDue(s, s.tasks[0], at(2)));
  s = addHabitEvent(s, { kind: "restore", taskId: "a", date: day }, n);
  assert.ok(taskDue(s, s.tasks[0], n));
  assert.ok(!taskDue(s, s.tasks[0], at(2)));
  assert.equal(s.habitEvents?.length, 4);
  roundtrip(s);
});

test("compatibility outcome corrections also respect a coins-only task without a care link", async () => {
  const { setOutcome } = await import("./model");
  const before = make();
  const after = setOutcome(before, "a", day, "missed", n);
  assert.deepEqual(after.care, before.care);
  assert.equal(after.outcomes[0].penalty, 0);
});

test("deleting a focused task frees today’s focus slot while keeping older focus history", async () => {
  const { deleteTask } = await import("./model");
  let s = toggleFocus(make(), "a", day);
  s = toggleFocus(s, "a", shiftDate(day, -1));
  s = deleteTask(s, "a", n);
  assert.deepEqual(s.focusDays?.[day], []);
  assert.deepEqual(s.focusDays?.[shiftDate(day, -1)], ["a"]);
});

test("step row edits preserve IDs, checked history, older penalties and more than 30 steps", () => {
  let s = make({
    careLinked: true,
    category: "water",
    steps: [
      { id: "keep", name: "Read chapter" },
      { id: "remove", name: "Old step" },
    ],
  });
  s = setStep(s, "a", "keep", true, day, n, "checked");
  const events = [...(s.habitEvents || [])];
  s = saveTask(
    s,
    {
      ...s.tasks[0],
      steps: [
        { id: "keep", name: "Read chapter four" },
        ...Array.from({ length: 35 }, (_, i) => ({
          id: `new-${i}`,
          name: `Step ${i + 1}`,
        })),
      ],
    },
    n,
  );
  s = roundtrip(s);
  assert.equal(s.tasks[0].steps!.length, 36);
  assert.ok(stepIsDone(s, "a", "keep", day));
  assert.deepEqual(s.habitEvents, events);
  assert.equal(s.tasks[0].careLinked, true);
  assert.equal(s.tasks[0].category, "water");
  assert.equal(s.coins, 0);
  for (const step of s.tasks[0].steps!)
    s = setStep(s, "a", step.id, true, day, n, "done-" + step.id);
  assert.equal(s.coins, 5);
  assert.equal(taskCounts(s, "a", day).completed, 1);
  s = setStep(s, "a", "keep", false, day, n, "undo-check");
  s = setStep(s, "a", "keep", true, day, n, "redo-check");
  assert.equal(s.coins, 5);
  assert.equal(s.outcomes.length, 1);
  roundtrip(s);
});
