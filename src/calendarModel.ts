import {
  dateKey,
  localDate,
  shiftDate,
  taskDue,
  taskCounts,
  taskFinishedToday,
  taskProgressGoal,
  sortActiveTasks,
  type State,
  type Task,
} from "./model";
export function calendarMonth(date: string, offset = 0) {
  const d = localDate(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return dateKey(+d);
}
export function calendarDaysForMonth(month: string): (string | null)[] {
  const start = calendarMonth(month),
    end = calendarMonth(start, 1);
  const days: (string | null)[] = Array(localDate(start).getDay()).fill(null);
  for (let day = start; day < end; day = shiftDate(day, 1)) days.push(day);
  while (days.length % 7) days.push(null);
  return days;
}
export type CalendarTask = {
  task: Task;
  completed: boolean;
  count: number;
  missed: number;
  goal: number;
  status: string;
};
/** A read-only projection. Recorded snapshots retain historical names and goals. */
export function calendarTasks(
  s: State,
  date: string,
  today = dateKey(),
): CalendarTask[] {
  const planned = new Map(
    s.tasks
      .filter((t) => date >= t.date && taskDue(s, t, +localDate(date)))
      .map((t) => [t.id, t]),
  );
  const records = s.outcomes
    .filter((o) => o.date === date && !o.deleted && o.status !== "pending")
    .sort((a, b) => a.sequence - b.sequence);
  for (const o of records) {
    if (date < today) {
      const task = { ...o.task, id: o.taskId, name: o.name };
      if (date >= task.date) planned.set(o.taskId, task);
    }
  }
  return sortActiveTasks([...planned.values()]).map((task) => {
    const counts = taskCounts(s, task.id, date),
      goal = taskProgressGoal(task),
      completed = taskFinishedToday(s, task, date);
    const missed = counts.missed;
    const status = completed
      ? "Completed"
      : missed
        ? "Missed"
        : date < today && goal > 0
          ? "Unfinished"
          : "Pending";
    return { task, completed, count: counts.completed, missed, goal, status };
  });
}
