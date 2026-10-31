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
