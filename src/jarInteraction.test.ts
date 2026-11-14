import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { boundedJarDrag, canDragJarBalls, Jar, jarNeighborNudge } from "./Jar";

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
  const clearInteractiveJar = renderToStaticMarkup(
    createElement(Jar, { balls: [], interactive: true, showLabel: false }),
  );
  const manyBalls = renderToStaticMarkup(
    createElement(Jar, {
      balls: Array.from({ length: 33 }, (_, index) => ({
        taskId: `task-${index}`,
        name: `Task ${index}`,
        category: "happy" as const,
        at: index,
        date: "2026-11-13",
      })),
      interactive: true,
    }),
  );
  assert.match(interactive, /role="button"/);
  assert.match(interactive, /Tap or lightly drag a ball/);
  assert.doesNotMatch(staticMini, /role="button"/);
  assert.doesNotMatch(stillJar, /role="button"/);
  assert.match(staticMini, /class="jar-label"/);
  assert.doesNotMatch(clearInteractiveJar, /class="jar-label"/);
  assert.match(manyBalls, /Tap a ball to gently nudge nearby pieces/);
  assert.doesNotMatch(manyBalls, /Tap or lightly drag/);
});

test("drag uses visible glass bounds and large jars gracefully use tap-only motion", () => {
  const ball = { left: 45, right: 65, top: 65, bottom: 85 };
  const glass = { left: 30, right: 130, top: 20, bottom: 120 };
  const moved = boundedJarDrag(100, 100, ball, glass, 1.5);
  assert.equal(moved.x, (130 - 4 - 65) / 1.5);
  assert.equal(moved.y, (120 - 4 - 85) / 1.5);
  const leftEdge = boundedJarDrag(-100, -100, ball, glass, 1.5);
  assert.equal(leftEdge.x, (30 + 4 - 45) / 1.5);
  assert.equal(leftEdge.y, (20 + 4 - 65) / 1.5);
  assert.equal(canDragJarBalls(32), true);
  assert.equal(canDragJarBalls(33), false);
  assert.deepEqual(jarNeighborNudge(4, 4), { x: 0, y: 0 });
  assert.deepEqual(jarNeighborNudge(3, 4), { x: 2, y: -1 });
  assert.deepEqual(jarNeighborNudge(7, 4), { x: 0, y: 0 });
});
