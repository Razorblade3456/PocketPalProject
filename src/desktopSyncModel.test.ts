import { test } from "node:test";
import assert from "node:assert/strict";
import { OUTFIT_IDS } from "./catalog";
import { desktopDisplayPayload } from "./desktopSyncModel";
import { initial, type Task } from "./model";

test("desktop projection contains selected pet, care, outfit and the actual alarm without private save data", () => {
  const s = initial(1000);
  s.pet = "crumb";
  s.name = "Crumbster";
  s.equipped = { head: OUTFIT_IDS[0] };
  s.tasks = [{ id: "task", name: "Study", description: "private notes", time: "18:00", repeat: "once", date: "2026-11-06", days: [], category: "happy", priority: "high" } satisfies Task];
  s.completions = [{ taskId: "task", name: "private history", category: "happy", at: 1, date: "2026-11-06" }];
  s.rewardLedger = [{ id: "secret-reward", entryId: "private-ledger", amount: 5, at: 1 }];
  const alarm = { id: "alarm", taskId: "task", date: "2026-11-06", schedule: "sig", scheduledAt: 100, startedAt: 50, dueAt: 100, status: "pending" as const };
  const out = desktopDisplayPayload(s, [alarm], 500);
  assert.equal(out.pet.kind, "crumb");
  assert.equal(out.pet.name, "Crumbster");
  assert.equal(out.pet.equipped?.head, OUTFIT_IDS[0]);
  assert.equal(out.alarm?.name, "Study");
  assert.equal(out.alarm?.priority, "high");
  const json = JSON.stringify(out);
  assert.equal(json.includes("private notes"), false);
  assert.equal(json.includes("private history"), false);
  assert.equal(json.includes("secret-reward"), false);
  assert.equal(json.includes("private-ledger"), false);
  assert.equal(out.syncedAt, 500);
});

test("snooze changes the synchronized target; stopped and disabled alarms clear the display timer", () => {
  const s = initial(1000);
  const task: Task = { id: "t", name: "Homework", description: "", time: "18:00", repeat: "daily", date: "2026-11-06", days: [], category: "happy" };
  s.tasks = [task];
  const pending = { id: "a", taskId: "t", date: "2026-11-06", schedule: "sig", scheduledAt: 2000, startedAt: 1000, dueAt: 2000, status: "pending" as const };
  const snoozed = { ...pending, startedAt: 1500, dueAt: 301500 };
  assert.equal(desktopDisplayPayload(s, [snoozed], 1500).alarm?.dueAt, 301500);
  assert.equal(desktopDisplayPayload(s, [{ ...snoozed, status: "stopped" }], 1500).alarm, null);
  s.settings.alarmsEnabled = false;
  assert.equal(desktopDisplayPayload(s, [pending], 1500).alarm, null);
});
