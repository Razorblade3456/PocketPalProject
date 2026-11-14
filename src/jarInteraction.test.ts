import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { canDragJarBalls, clampJarDrag, Jar, jarNeighborNudge } from "./Jar";

test("large history jar exposes a keyboard-accessible interaction target", () => {
  const interactive = renderToStaticMarkup(
    createElement(Jar, { balls: [], interactive: true }),
  );
  const staticMini = renderToStaticMarkup(
    createElement(Jar, { balls: [], small: true, staticPreview: true }),
  );
  const stillJar = renderToStaticMarkup(
    createElement(Jar, { balls: [], interactive: true, motionEnabled: false }),
  );
  assert.match(interactive, /role="button"/);
  assert.match(interactive, /Tap or lightly drag a ball/);
  assert.doesNotMatch(staticMini, /role="button"/);
  assert.doesNotMatch(stillJar, /role="button"/);
});

test("drag distance is clamped and large jars gracefully use tap-only motion", () => {
  assert.equal(clampJarDrag(100), 8);
  assert.equal(clampJarDrag(-100), -8);
  assert.equal(clampJarDrag(4, 3), 3);
  assert.equal(canDragJarBalls(32), true);
  assert.equal(canDragJarBalls(33), false);
  assert.deepEqual(jarNeighborNudge(4, 4), { x: 0, y: 0 });
  assert.deepEqual(jarNeighborNudge(3, 4), { x: 2, y: -1 });
  assert.deepEqual(jarNeighborNudge(7, 4), { x: 0, y: 0 });
});
