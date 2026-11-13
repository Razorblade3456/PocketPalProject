import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryExperience } from "./HistoryExperience";
import {
  initial,
  recordAttempt,
  recordTaskCompletion,
  saveTask,
  type Task,
} from "./model";

const today = "2026-11-13";
const task = (id: string, priority: Task["priority"]): Task => ({
  id,
  name: id === "done" ? "Finished reading" : "Missed stretch",
  description: "",
  time: "09:00",
  repeat: "once",
  days: [],
  date: today,
  createdDate: today,
  category: "happy",
  priority,
});

test("History defaults to the selected jar and preserves recorded outcome details", () => {
  let state = initial(+new Date(`${today}T12:00:00`));
  state = saveTask(state, task("done", "high"), +new Date(`${today}T12:00:00`));
  state = saveTask(
    state,
    task("missed", "low"),
    +new Date(`${today}T12:00:00`),
  );
  state = recordTaskCompletion(
    state,
    "done",
    today,
    +new Date(`${today}T13:00:00`),
    "done-event",
  );
  state = recordAttempt(
    state,
    "missed",
    today,
    "missed",
    +new Date(`${today}T14:00:00`),
    "missed-event",
  );

  const html = renderToStaticMarkup(
    createElement(HistoryExperience, {
      s: state,
      today,
      onCorrect: () => undefined,
      onDelete: () => undefined,
    }),
  );
  assert.match(html, /role="tab"[^>]*aria-selected="true"/);
  assert.match(html, /Jar Shelf/);
  assert.match(html, /1 completed/);
  assert.match(html, /1 missed/);
  assert.match(html, /Finished reading/);
  assert.match(html, /Missed stretch/);
  assert.match(html, /high priority/);
  assert.match(html, /low priority/);
  assert.match(html, /history-inspect-skull/);
  assert.doesNotMatch(html, /task activity in November 2026/);
  assert.doesNotMatch(html, /outcome-history/);
});

test("empty dates show an empty jar message without fabricated activity", () => {
  const state = initial(+new Date(`${today}T12:00:00`));
  const html = renderToStaticMarkup(
    createElement(HistoryExperience, {
      s: state,
      today,
      onCorrect: () => undefined,
      onDelete: () => undefined,
    }),
  );
  assert.match(html, /No recorded activity · empty days do not earn jar balls/);
  assert.match(html, /0 completed/);
  assert.match(html, /0 missed/);
});
