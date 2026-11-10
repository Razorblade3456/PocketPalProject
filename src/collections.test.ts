import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  addCollection,
  initial,
  recordTaskCompletion,
  saveTask,
  type Task,
} from "./model";
import { CollectionsPanel, NewCollectionFields } from "./Collections";

const now = +new Date(2026, 9, 26, 12),
  today = "2026-10-26";
const task = (id: string, patch: Partial<Task> = {}): Task => ({
  id,
  name: id,
  description: "",
  time: "09:00",
  repeat: "daily",
  days: [],
  date: today,
  category: "happy",
  ...patch,
});

test("collection panel counts unique tasks scheduled today and opens normal task editing", () => {
  let s = addCollection(initial(now), {
    id: "school",
    name: "College",
    icon: "book",
    color: "purple",
  });
  s = saveTask(
    s,
    task("accounting", {
      name: "Study accounting",
      collectionId: "school",
      repetitions: "multiple",
      dailyGoal: 2,
    }),
    now,
  );
  s = saveTask(
    s,
    task("chapter", {
      name: "Read chapter",
      repeat: "weekly",
      collectionId: "school",
    }),
    now,
  );
  s = saveTask(
    s,
    task("future", {
      name: "Future assignment",
      date: "2026-10-28",
      collectionId: "school",
    }),
    now,
  );
  s = recordTaskCompletion(s, "accounting", today, now, "accounting-1");
  s = recordTaskCompletion(s, "accounting", today, now + 60_000, "accounting-2");

  const html = renderToStaticMarkup(
    createElement(CollectionsPanel, {
      s,
      today,
      now,
      onEditTask: () => {},
      onCreate: () => "new",
      onUpdate: () => {},
      onDelete: () => {},
    }),
  );
  assert.ok(html.includes("College"));
  assert.ok(html.includes("1/2 completed"));
  assert.ok(html.includes("Study accounting"));
  assert.ok(html.includes("Read chapter"));
  assert.ok(!html.includes("Future assignment"));
  assert.equal((html.match(/class="collection-task"/g) || []).length, 2);
  assert.ok(html.includes('data-mobile-open="false"'));
  assert.ok(!html.includes('class="collection-row" open'));
});

test("task editor collection picker offers None and a compact create option", () => {
  const html = renderToStaticMarkup(
    createElement(NewCollectionFields, {
      collections: [{ id: "home", name: "Home" }],
      selected: "home",
      onChange: () => {},
      onCreate: () => "new",
    }),
  );
  assert.ok(html.includes("Collection (optional)"));
  assert.ok(html.includes("<option value=\"\">None</option>"));
  assert.ok(html.includes("Home"));
  assert.ok(html.includes("+ New Collection"));
});

test("collection section starts collapsed on mobile and rows remain individually expandable", () => {
  const s = addCollection(initial(now), {
    id: "empty",
    name: "Home",
  });
  const html = renderToStaticMarkup(
    createElement(CollectionsPanel, {
      s,
      today,
      now,
      onEditTask: () => {},
      onCreate: () => "new",
      onUpdate: () => {},
      onDelete: () => {},
    }),
  );
  assert.ok(html.includes('aria-expanded="false"'));
  assert.ok(html.includes("No tasks scheduled today."));
  assert.ok(!html.includes('class="collection-row" open'));
});

