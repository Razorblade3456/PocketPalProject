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
  assert.equal(restored.coins, s.coins - 4);
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
