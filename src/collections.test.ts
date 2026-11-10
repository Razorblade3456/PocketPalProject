import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  addCollection,
  COLLECTION_ICONS,
  initial,
  recordTaskCompletion,
  deleteAttempt,
  saveTask,
  type Task,
} from "./model";
import {
  CollectionFields,
  CollectionsPanel,
  NewCollectionFields,
} from "./Collections";

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

test("collection progress counts unique assigned tasks completed this month", () => {
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
  s = recordTaskCompletion(s, "chapter", today, now + 120_000, "chapter-1");

  const html = renderToStaticMarkup(
    createElement(CollectionsPanel, {
      s,
      now,
      onEditTask: () => {},
      onCreate: () => "new",
      onUpdate: () => {},
      onDelete: () => {},
    }),
  );
  assert.ok(html.includes("College"));
  assert.ok(html.includes("2/3 completed this month"));
  assert.ok(html.includes("Study accounting"));
  assert.ok(html.includes("Read chapter"));
  assert.ok(html.includes("Future assignment"));
  assert.equal((html.match(/class="collection-task"/g) || []).length, 3);
  assert.ok(html.includes('data-mobile-open="false"'));
  assert.ok(!html.includes('class="collection-row" open'));

  s = deleteAttempt(s, "accounting-1", now + 180_000);
  s = deleteAttempt(s, "accounting-2", now + 180_000);
  const undone = renderToStaticMarkup(
    createElement(CollectionsPanel, {
      s,
      now: now + 180_000,
      onEditTask: () => {},
      onCreate: () => "new",
      onUpdate: () => {},
      onDelete: () => {},
    }),
  );
  assert.ok(undone.includes("1/3 completed this month"));
  const nextMonth = renderToStaticMarkup(
    createElement(CollectionsPanel, {
      s,
      now: +new Date(2026, 10, 1, 12),
      onEditTask: () => {},
      onCreate: () => "new",
      onUpdate: () => {},
      onDelete: () => {},
    }),
  );
  assert.ok(nextMonth.includes("0/3 completed this month"));
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
  assert.ok(html.includes('value="home" selected=""'));
});

test("visual icon picker exposes 18 named icons and keeps one explicit selection", () => {
  const html = renderToStaticMarkup(
    createElement(CollectionFields, {
      name: "College",
      setName: () => {},
      icon: "graduationCap",
      setIcon: () => {},
      color: "purple",
      setColor: () => {},
      onSubmit: () => {},
      onCancel: () => {},
      submitLabel: "Save",
    }),
  );
  assert.equal(COLLECTION_ICONS.length, 18);
  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) || []).length, 19);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.ok(html.includes('aria-label="Graduation cap"'));
  assert.ok(html.includes('title="Shopping cart"'));
  assert.ok(html.includes('class="is-selected" aria-label="Graduation cap"'));
});

test("collection section starts collapsed on mobile and rows remain individually expandable", () => {
  const s = addCollection(initial(now), {
    id: "empty",
    name: "Home",
  });
  const html = renderToStaticMarkup(
    createElement(CollectionsPanel, {
      s,
      now,
      onEditTask: () => {},
      onCreate: () => "new",
      onUpdate: () => {},
      onDelete: () => {},
    }),
  );
  assert.ok(html.includes('aria-expanded="false"'));
  assert.ok(html.includes("No tasks in this collection yet."));
  assert.ok(!html.includes('class="collection-row" open'));
});

