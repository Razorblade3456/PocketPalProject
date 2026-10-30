import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  careTier,
  careTiers,
  excellentCare,
  previewCare,
  careValues,
} from "./careVisuals";
import { Pet, LifeGuide } from "./Pets";
import { stageForCare, stage, initial, type Care, type PetKind } from "./model";
import { CareGuide } from "./CareGuide";
const species: PetKind[] = ["mochi", "pippin", "crumb"];
const render = (kind: PetKind, care: Care, level = 0, sleep = false) =>
  renderToStaticMarkup(
    createElement(Pet, {
      kind,
      care,
      level,
      sleep,
      preview: true,
      equipped: {
        head: "beanie",
        neck: "scarf",
        body: "pajamas",
        back: "backpack",
      },
    }),
  );

test("care tiers use all exact boundaries, including fractional live stats", () => {
  for (const [value, expected] of [
    [100, 0],
    [76, 0],
    [75.01, 0],
    [75, 1],
    [51, 1],
    [50.01, 1],
    [50, 2],
    [26, 2],
    [25.01, 2],
    [25, 3],
    [11, 3],
    [10.01, 3],
    [10, 4],
    [0, 4],
  ])
    assert.equal(careTier(value), expected);
});
test("all four care tiers are independent and derived without mutation", () => {
  const care = { food: 100, water: 25, clean: 50, happy: 10 };
  const before = JSON.stringify(care);
  assert.deepEqual(careTiers(care), { food: 0, water: 3, clean: 2, happy: 4 });
  assert.equal(JSON.stringify(care), before);
});
test("each species renders all five tiers of every need", () => {
  for (const kind of species)
    for (const key of ["food", "water", "clean", "happy"] as const)
      for (const value of careValues) {
        const html = render(kind, previewCare(key, value));
        assert.ok(
          html.includes(`data-${key}-tier="${careTier(value)}"`),
          `${kind} ${key} ${value}`,
        );
        if (key === "happy")
          assert.ok(html.includes(`data-happiness-layer="${careTier(value)}"`));
        else if (careTier(value) > 0)
          assert.ok(
            html.includes(
              `data-${key === "food" ? "hunger" : key === "water" ? "hydration" : "cleanliness"}-layer="${careTier(value)}"`,
            ),
          );
      }
});
test("example mixture visibly combines a full belly, dryness, dirt and sobbing on all pets", () => {
  for (const kind of species) {
    const html = render(kind, { food: 100, water: 25, clean: 50, happy: 10 });
    for (const marker of [
      'data-food-tier="0"',
      'data-hydration-layer="3"',
      'data-cleanliness-layer="2"',
      'data-happiness-layer="4"',
      "rolling-tears",
      "dry-lips",
      "mud-marks",
    ])
      assert.ok(html.includes(marker), `${kind} ${marker}`);
  }
});
test("all 625 tier combinations render together on each species without dropping an outfit", () => {
  for (const kind of species)
    for (const food of careValues)
      for (const water of careValues)
        for (const clean of careValues)
          for (const happy of careValues) {
            const html = render(kind, { food, water, clean, happy });
            for (const [key, value] of Object.entries({
              food,
              water,
              clean,
              happy,
            }))
              assert.ok(html.includes(`data-${key}-tier="${careTier(value)}"`));
            assert.ok(html.includes("worn-outfits"));
            assert.ok(html.includes("care-shape"));
          }
});
test("six life stages remain renderable alongside care, with dead emotion override", () => {
  for (const kind of species)
    for (let level = 0; level < 6; level++) {
      const html = render(
        kind,
        { food: 10, water: 10, clean: 10, happy: 10 },
        level,
      );
      assert.ok(html.includes(`stage-${level}`));
      if (level === 5) {
        assert.ok(!html.includes("data-happiness-layer"));
        assert.ok(!html.includes("data-hunger-layer"));
        assert.ok(!html.includes("rolling-tears"));
        assert.ok(html.includes("ghost"));
      } else assert.ok(html.includes('data-happiness-layer="4"'));
    }
});
test("nighttime sleep preserves sleeping eyes and dirt without crying or reaching", () => {
  for (const kind of species) {
    const html = render(
      kind,
      { food: 10, water: 10, clean: 10, happy: 10 },
      0,
      true,
    );
    assert.ok(html.includes("sleeping"));
    assert.ok(html.includes('data-cleanliness-layer="4"'));
    assert.ok(!html.includes("data-happiness-layer"));
    assert.ok(!html.includes("food-reaching-paw"));
    assert.ok(!html.includes("water-reaching-paw"));
  }
});
test("species-specific cues and hunger shape preserve compatible clothing layers", () => {
  const hungry = { food: 10, water: 25, clean: 25, happy: 10 };
  assert.ok(render("mochi", hungry).includes('rx="30.72"'));
  assert.ok(render("pippin", hungry).includes("moth-wings wrapped"));
  assert.ok(render("pippin", hungry).includes("M127 115Q105 60 72 94"));
  assert.ok(render("crumb", hungry).includes("pet-art curled"));
  for (const kind of species) {
    const html = render(kind, hungry);
    assert.ok(html.indexOf("care-shape") < html.indexOf("worn-outfits"));
  }
});
test("gallery and simulator render with five real previews and four accessible sliders", () => {
  const html = renderToStaticMarkup(
    createElement(CareGuide, {
      kind: "mochi",
      realCare: { food: 10, water: 25, clean: 50, happy: 75 },
      equipped: { head: "beanie" },
    }),
  );
  assert.equal((html.match(/type="range"/g) || []).length, 4);
  assert.equal(
    (html.match(/aria-label="Preview Happiness \d/g) || []).length,
    5,
  );
  assert.ok(html.includes("Reset Preview"));
  assert.ok(html.includes("Current Real Stats"));
  assert.ok(html.includes("never saved"));
});
test("preview generation and rendering leave the entire real save byte-for-byte unchanged", () => {
  const real = initial();
  const before = JSON.stringify(real);
  for (const kind of species) {
    renderToStaticMarkup(
      createElement(LifeGuide, {
        kind,
        actual: stage(real),
        realCare: real.care,
        equipped: real.equipped,
      }),
    );
    for (const key of ["food", "water", "clean", "happy"] as const)
      render(kind, previewCare(key, 10));
  }
  assert.equal(JSON.stringify(real), before);
});
test("preview lifecycle uses the same thresholds as gameplay", () => {
  for (const value of [100, 71, 70, 51, 50, 31, 30, 16, 15, 1, 0]) {
    const care = { food: value, water: value, clean: value, happy: value };
    const real = initial();
    real.care = care;
    real.settings.cozy = false;
    assert.equal(stageForCare(care), stage(real));
  }
});
test("care rendering is a pure view and stat improvements immediately clear bad layers", () => {
  for (const kind of species) {
    const bad = render(kind, { food: 5, water: 5, clean: 5, happy: 5 });
    const good = render(kind, { ...excellentCare });
    assert.ok(bad.includes("rolling-tears"));
    assert.ok(bad.includes("mud-marks"));
    assert.ok(bad.includes("dry-lips"));
    assert.ok(!good.includes("rolling-tears"));
    assert.ok(!good.includes("mud-marks"));
    assert.ok(!good.includes("dry-lips"));
    assert.ok(good.includes('data-happiness-layer="0"'));
  }
});
