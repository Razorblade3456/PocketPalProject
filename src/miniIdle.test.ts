import { countdownMood, countdownIdleChoices } from "./miniIdle";
import { dismissAlarm, type AlarmRecord } from "./alarms";
import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MiniPet } from "./MiniPet";
import { initial, type PetKind } from "./model";
import { excellentCare } from "./careVisuals";
import { miniIdleChoices, nextMiniIdle, miniIdleDelay } from "./miniIdle";
const kinds: PetKind[] = ["mochi", "pippin", "crumb", "rattle"];
test("mini personalities yield to sleep, death, low health, hunger and thirst", () => {
  for (const kind of kinds) {
    assert.deepEqual(miniIdleChoices(kind, excellentCare, 0, true), []);
    assert.deepEqual(miniIdleChoices(kind, excellentCare, 5, false), []);
    assert.ok(
      !miniIdleChoices(kind, excellentCare, 3, false).some((x) =>
        ["bounce", "hop", "stumble", "laugh", "smoke"].includes(x),
      ),
    );
    assert.deepEqual(
      miniIdleChoices(kind, { ...excellentCare, food: 50 }, 1, false),
      [kind === "pippin" ? "wrap" : "tummy"],
    );
    assert.deepEqual(
      miniIdleChoices(kind, { ...excellentCare, water: 20 }, 1, false),
      ["look"],
    );
  }
  assert.deepEqual(
    miniIdleChoices("rattle", { ...excellentCare, happy: 40 }, 1, false),
    ["cross", "sideeye", "tap"],
  );
  assert.ok(
    miniIdleChoices("pippin", excellentCare, 1, false).includes("yawn"),
  );
});
test("single idle selection avoids immediate repeats and waits 8–20 seconds", () => {
  for (const kind of kinds) {
    const choices = miniIdleChoices(kind, excellentCare, 0, false);
    for (const previous of choices)
      for (const fraction of [0, 0.2, 0.5, 0.99])
        assert.notEqual(
          nextMiniIdle(choices, previous, () => fraction),
          previous,
        );
  }
  assert.equal(nextMiniIdle([], null), null);
  assert.equal(nextMiniIdle(["tummy"], "tummy"), "tummy");
  assert.equal(
    miniIdleDelay(() => 0),
    8000,
  );
  assert.ok(miniIdleDelay(() => 0.9999) < 20000);
});
test("all Mini pets retain two existing arms and one exclusive face in every health/sleep/care state", () => {
  for (const pet of kinds)
    for (let level = 0; level <= 5; level++)
      for (const sleep of [false, true])
        for (const feeding of [null, "food", "water", "soap"] as const) {
          const s = {
            ...initial(),
            pet,
            care: { food: 27, water: 48, clean: 65, happy: 35 },
          };
          const html = renderToStaticMarkup(
            createElement(MiniPet, {
              s,
              level,
              sleep,
              calm: false,
              host: {} as Window,
              feeding,
            }),
          );
          assert.equal(
            (html.match(/class="[^"]*pet-arm /g) || []).length,
            2,
            `${pet}/${level}/${sleep}/${feeding}`,
          );
          assert.equal((html.match(/data-active-face=/g) || []).length, 1);
          assert.ok(!html.includes("mini-mochi-close"));
          assert.ok(!html.includes("mini-stats"));
          assert.ok(html.includes('data-mini-idle="rest"'));
        }
});

test("countdown moods use the existing percentage boundaries and reset on snooze", () => {
  const now = Date.now(),
    alarm: AlarmRecord = {
      id: "alarm",
      taskId: "a",
      date: "2026-11-02",
      schedule: "test",
      scheduledAt: now + 100000,
      startedAt: now,
      dueAt: now + 100000,
      status: "pending",
    };
  assert.equal(countdownMood(alarm, now + 49999), "chill");
  assert.equal(countdownMood(alarm, now + 50000), "nervous");
  assert.equal(countdownMood(alarm, now + 80000), "nervous");
  assert.equal(countdownMood(alarm, now + 80001), "anxious");
  assert.equal(countdownMood(alarm, now + 100001), "anxious");
  assert.equal(countdownMood({ ...alarm, status: "stopped" }, now), "chill");
  assert.equal(countdownMood({ ...alarm, startedAt: undefined }, now), "chill");
  assert.equal(countdownMood(undefined, now), "chill");
  const snoozed = dismissAlarm(
    { ...initial(now), alarms: [alarm] },
    alarm.id,
    5,
    now + 90000,
  );
  assert.equal(countdownMood(snoozed.alarms![0], now + 90000), "chill");
  assert.ok(
    miniIdleDelay(() => 0, "anxious") < miniIdleDelay(() => 0, "nervous"),
  );
  assert.ok(
    miniIdleDelay(() => 0, "nervous") < miniIdleDelay(() => 0, "chill"),
  );
});
test("all countdown stages reuse one full-body face and two arms, yielding to sleep/death", () => {
  for (const pet of kinds)
    for (const [ratio, mood] of [
      [0.7, "chill"],
      [0.3, "nervous"],
      [0.1, "anxious"],
    ] as const) {
      const now = Date.now(),
        s = { ...initial(now), pet, care: { ...excellentCare } };
      const alarm: AlarmRecord = {
        id: "alarm",
        taskId: "a",
        date: "2026-11-02",
        schedule: "test",
        scheduledAt: now + ratio * 1000000,
        startedAt: now - (1 - ratio) * 1000000,
        dueAt: now + ratio * 1000000,
        status: "pending",
      };
      assert.ok(
        countdownIdleChoices(
          pet,
          miniIdleChoices(pet, excellentCare, 0, false),
          mood,
        ).length,
      );
      for (const [level, sleep] of [
        [0, false],
        [0, true],
        [5, false],
      ] as const) {
        const html = renderToStaticMarkup(
          createElement(MiniPet, {
            s,
            level,
            sleep,
            calm: false,
            host: {} as Window,
            alarms: [alarm],
          }),
        );
        assert.ok(
          html.includes(
            'data-countdown-mood="' +
              (sleep || level === 5 ? "chill" : mood) +
              '"',
          ),
        );
        assert.equal((html.match(/data-active-face=/g) || []).length, 1);
        assert.equal((html.match(/class="[^"]*pet-arm /g) || []).length, 2);
        assert.ok(html.includes('viewBox="0 0 320 340"'));
      }
    }
});
