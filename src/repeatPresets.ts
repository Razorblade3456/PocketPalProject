import type { Task } from "./model";

export type RepeatChoice = Task["repeat"] | "weekdays" | "weekend";

const weekdayDays = [1, 2, 3, 4, 5];
const weekendDays = [0, 6];

export type DayShortcut = "weekdays" | "weekends" | "all" | "clear";

export function repeatShortcutDays(shortcut: DayShortcut) {
  if (shortcut === "weekdays") return [...weekdayDays];
  if (shortcut === "weekends") return [...weekendDays];
  if (shortcut === "all") return [0, 1, 2, 3, 4, 5, 6];
  return [];
}

function sameDays(actual: number[], expected: number[]) {
  return actual.length === expected.length && expected.every((day) => actual.includes(day));
}

export function repeatPatchChangesTask(task: Task, patch: Partial<Task>) {
  return patch.repeat !== task.repeat ||
    !sameDays(patch.days || task.days, task.days) ||
    (patch.repetitions !== undefined && patch.repetitions !== task.repetitions) ||
    (patch.dailyGoal !== undefined && patch.dailyGoal !== task.dailyGoal);
}

/** Give existing selected-day schedules the friendliest matching selector label. */
export function repeatChoiceForTask(task: Task): RepeatChoice {
  if (task.repeat !== "selected") return task.repeat;
  if (sameDays(task.days, weekdayDays)) return "weekdays";
  if (sameDays(task.days, weekendDays)) return "weekend";
  return "selected";
}

/** Translate UI presets back into the existing repeat model without discarding hidden day data. */
export function repeatPatch(task: Task, choice: RepeatChoice): Partial<Task> {
  const presetDays = choice === "weekdays"
    ? weekdayDays
    : choice === "weekend"
      ? weekendDays
      : task.days;
  const repeat = choice === "weekdays" || choice === "weekend" ? "selected" : choice;
  return {
    repeat,
    days: [...presetDays],
    ...(repeat === "weeklyAny" || repeat === "monthlyAny"
      ? { repetitions: "once", dailyGoal: 1 }
      : {}),
  };
}
