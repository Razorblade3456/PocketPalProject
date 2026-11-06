import {
  dailyCareBonus,
  mergeDailyCareBonuses,
  sortActiveTasks,
  correctAttempt,
  buyAndUseBasic,
} from "./model";
import { TaskAdvancedFields, TaskPriority } from "./HabitTools";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  initial,
  dateKey,
  recordAttempt,
  taskFinishedToday,
  taskProgressGoal,
  goalFor,
  rewardLimitFor,
  addHabitEvent,
  parseState,
  buyItem,
  useSupply,
  type Task,
  type State,
  type PetKind,
} from "./model";
import { SUPPLIES, EXTRA_SUPPLY_IDS } from "./catalog";
import { ItemArt } from "./ItemArt";
import { Pet } from "./Pets";
const n = +new Date(2026, 9, 30, 12);
const task = (patch: Partial<Task> = {}): Task => ({
  id: "t",
  name: "Task",
  description: "",
  time: "12:00",
  date: dateKey(n),
  repeat: "daily",
  days: [],
  category: "happy",
  createdAt: n,
  ...patch,
});
function funded(): State {
  let s = initial(n);
  s.tasks = [task({ repetitions: "goal", dailyGoal: 100 })];
  for (let i = 0; i < 100; i++)
    s = recordAttempt(s, "t", dateKey(n), "completed", n, "fund-" + i);
  return s;
}
test("multiple-entry progress uses a daily target without changing scheduling or reward policy", () => {
  for (const target of [3, 6]) {
    let s = initial(n);
    s.tasks = [task({ repetitions: "multiple", dailyGoal: target })];
    assert.equal(goalFor(s.tasks[0]), 1);
    assert.equal(taskProgressGoal(s.tasks[0]), target);
    assert.equal(rewardLimitFor(s, s.tasks[0]), 3);
    for (let i = 0; i < target; i++) {
      assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(n)), false);
      s = recordAttempt(s, "t", dateKey(n), "completed", n, "progress-" + i);
    }
    assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(n)), true);
    assert.equal(s.coins, 15);
  }
  assert.equal(
    taskProgressGoal(task({ repetitions: "multiple", dailyGoal: 1 })),
    3,
  );
  let s = initial(n);
  s.tasks = [task({ repetitions: "goal", dailyGoal: 6 })];
  s = recordAttempt(s, "t", dateKey(n), "completed", n, "one");
  s = recordAttempt(s, "t", dateKey(n), "completed", n, "two");
  assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(n)), false);
});
test("unlimited done-for-day is explicit, reversible, saved, and never pays coins", () => {
  let s = initial(n);
  s.tasks = [task({ repetitions: "unlimited" })];
  s = recordAttempt(s, "t", dateKey(n), "completed", n, "entry");
  const before = JSON.stringify(s.outcomes),
    coins = s.coins;
  assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(n)), false);
  s = addHabitEvent(
    s,
    { taskId: "t", date: dateKey(n), kind: "finishDay" },
    n,
    "finish",
  );
  assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(n)), true);
  s = parseState(JSON.parse(JSON.stringify(s)), n)!;
  assert.ok(s);
  assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(n)), true);
  s = addHabitEvent(
    s,
    { taskId: "t", date: dateKey(n), kind: "reopenDay" },
    n,
    "reopen",
  );
  assert.equal(taskFinishedToday(s, s.tasks[0], dateKey(n)), false);
  assert.equal(s.coins, coins);
  assert.equal(JSON.stringify(s.outcomes), before);
});
test("older current-version inventories gain only zero entries for new products", () => {
  const s = funded();
  const old = JSON.parse(JSON.stringify(buyItem(s, "water", n, "old-water")));
  for (const id of EXTRA_SUPPLY_IDS) delete old.inventory[id];
  const restored = parseState(old, n)!;
  assert.ok(restored);
  assert.equal(restored.inventory.water, 1);
  for (const id of EXTRA_SUPPLY_IDS) assert.equal(restored.inventory[id], 0);
  assert.deepEqual(restored.tasks, s.tasks);
  assert.deepEqual(restored.outcomes, s.outcomes);
  assert.equal(restored.coins, s.coins - SUPPLIES.water.price);
});
test("all ten new products purchase, consume, persist and render on every pet", () => {
  for (const kind of ["mochi", "pippin", "crumb", "rattle"] as PetKind[])
    for (const item of EXTRA_SUPPLY_IDS) {
      const base = funded();
      base.pet = kind;
      const bought = buyItem(base, item, n, "buy"),
        used = useSupply(bought, item, n, "use");
      assert.equal(bought.coins, base.coins - SUPPLIES[item].price);
      assert.equal(used.inventory[item], 0);
      assert.ok(parseState(JSON.parse(JSON.stringify(used)), n));
      assert.equal(
        used.care[SUPPLIES[item].category],
        Math.min(
          100,
          base.care[SUPPLIES[item].category] +
            SUPPLIES[item].boost +
            (SUPPLIES[item].category === "happy" ? SUPPLIES[item].morale : 0),
        ),
      );
      const art = renderToStaticMarkup(createElement(ItemArt, { item }));
      assert.ok(art.includes("<path"));
      const pet = renderToStaticMarkup(
        createElement(Pet, { kind, level: 0, care: used.care, feeding: item }),
      );
      assert.equal((pet.match(/data-active-face=/g) || []).length, 1);
      assert.equal((pet.match(/class="[^"]*pet-arm /g) || []).length, 2);
      assert.ok(
        pet.includes(
          SUPPLIES[item].category === "water"
            ? "is-drinking"
            : SUPPLIES[item].category === "clean"
              ? "is-cleaning"
              : SUPPLIES[item].category === "happy"
                ? "is-playing"
                : "is-eating",
        ),
      );
      if (SUPPLIES[item].tab === "treats") assert.ok(SUPPLIES[item].price > 6);
    }
});

test("daily care bonus is six coins, once per visited local day, with no health or jar changes", () => {
  let s = initial(n);
  const care = { ...s.care };
  s = dailyCareBonus(s, n);
  assert.equal(s.coins, 6);
  assert.deepEqual(s.care, care);
  assert.equal(s.completions.length, 0);
  assert.equal(s.outcomes.length, 0);
  assert.equal(dailyCareBonus(s, n + 1000), s);
  const restored = parseState(JSON.parse(JSON.stringify(s)), n)!;
  assert.ok(restored);
  assert.equal(dailyCareBonus(restored, n).coins, 6);
  const later = dailyCareBonus(restored, +new Date(2026, 10, 4, 12));
  assert.equal(later.coins, 12);
  assert.equal(later.rewardLedger?.length, 2);
  assert.equal(dailyCareBonus(later, n).coins, 12);
});
test("simultaneous tab grants and stale saves merge the same receipt only once", () => {
  const base = initial(n),
    a = dailyCareBonus(base, n),
    b = dailyCareBonus(base, n + 10);
  const merged = mergeDailyCareBonuses(a, b);
  assert.equal(merged.coins, 6);
  assert.equal(merged.rewardLedger?.length, 1);
  const stale = mergeDailyCareBonuses(base, merged);
  assert.equal(stale.coins, 6);
  assert.equal(dailyCareBonus(stale, n).coins, 6);
  assert.ok(parseState(JSON.parse(JSON.stringify(stale)), n));
});
test("six bonus coins buy one food, water and soap, and corrections preserve recorded costs", () => {
  let s = dailyCareBonus(initial(n), n);
  for (const item of ["food", "water", "soap"] as const) {
    assert.equal(SUPPLIES[item].price, 2);
    s = buyAndUseBasic(s, item, n, item);
    assert.equal(s.inventory[item], 0);
  }
  assert.equal(s.coins, 0);
  assert.equal(s.debt, 0);
  assert.equal(s.care.food, 100);
  assert.equal(s.care.water, 100);
  assert.equal(s.care.clean, 100);
  assert.equal(
    dailyCareBonus(parseState(JSON.parse(JSON.stringify(s)), n)!, n).coins,
    0,
  );
  let old = funded();
  old = buyItem(old, "food", n, "old-price");
  old.careEvents = old.careEvents.map((e) =>
    e.kind === "buy" ? { ...e, cost: 5 } : e,
  );
  const loaded = parseState(JSON.parse(JSON.stringify(old)), n)!;
  assert.ok(loaded);
  assert.equal(loaded.coins, 495);
  assert.equal(loaded.inventory.food, 1);
  const corrected = correctAttempt(loaded, "fund-0", "missed", n);
  assert.equal(corrected.coins, 490);
  assert.equal(corrected.inventory.food, 1);
});
test("active tasks sort priority then time, without mutating saved order or repetition progress", () => {
  const tasks = [
    task({ id: "low", priority: "low", time: "08:00" }),
    task({ id: "normal", time: "07:00" }),
    task({ id: "high-late", priority: "high", time: "18:00" }),
    task({ id: "high-early", priority: "high", time: "09:00" }),
    task({ id: "untimed-a", time: "" }),
    task({ id: "untimed-b", time: "" }),
  ];
  const before = JSON.stringify(tasks);
  assert.deepEqual(
    sortActiveTasks(tasks).map((t) => t.id),
    ["high-early", "high-late", "normal", "untimed-a", "untimed-b", "low"],
  );
  assert.equal(JSON.stringify(tasks), before);
  assert.equal(
    sortActiveTasks(
      tasks.map((t) => (t.id === "low" ? { ...t, priority: "high" } : t)),
    )[0].id,
    "low",
  );
});
test("compact task editor preserves hidden legacy caps and duration while showing priority", () => {
  const t = task({ durationMinutes: 30, rewardCap: 2 });
  const before = JSON.stringify(t);
  const html = renderToStaticMarkup(
    createElement(TaskAdvancedFields, { task: t, update: () => {} }),
  );
  assert.ok(!html.includes("Duration (minutes)"));
  assert.ok(!html.includes("Daily rewarded completions"));
  assert.ok(!html.includes("priority-select"));
  const picker = renderToStaticMarkup(
    createElement(TaskPriority, { task: t, update: () => {} }),
  );
  for (const label of ["High", "Normal", "Low"])
    assert.ok(picker.includes(label + " priority"));
  assert.equal((picker.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal(JSON.stringify(t), before);
});

test("priority picker preserves saved selection and defaults missing priorities to Normal", () => {
  for (const priority of [undefined, "high", "normal", "low"] as const) {
    const t = task({ priority });
    const before = JSON.stringify(t);
    const html = renderToStaticMarkup(
      createElement(TaskPriority, { task: t, update: () => {} }),
    );
    const label =
      priority === "high" ? "High" : priority === "low" ? "Low" : "Normal";
    assert.ok(
      html.includes('aria-label="' + label + ' priority" aria-pressed="true"'),
    );
    assert.equal((html.match(/<button/g) || []).length, 3);
    assert.equal(JSON.stringify(t), before);
  }
});
