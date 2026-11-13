import {
  dateKey,
  localDate,
  shiftDate,
  taskDue,
  taskCounts,
  taskFinishedToday,
  taskProgressGoal,
  taskPeriod,
  taskDeadlineLabel,
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
  deadline?: string;
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
    if (date < today || (o.scheduledDate && o.scheduledDate > date)) {
      const task = { ...o.task, id: o.taskId, name: o.name };
      if (date >= task.date || o.scheduledDate) planned.set(o.taskId, task);
    }
  }
  return sortActiveTasks([...planned.values()]).map((task) => {
    const flexible =
        task.repeat === "weeklyAny" || task.repeat === "monthlyAny",
      period = flexible ? taskPeriod(task, date) : { start: date, end: date },
      first = [period.start, task.date, task.createdDate || task.date]
        .sort()
        .at(-1)!,
      entries = flexible
        ? s.outcomes.filter(
            (o) =>
              o.taskId === task.id &&
              o.date >= first &&
              o.date <= date &&
              !o.deleted,
          )
        : undefined,
      allCounts = taskCounts(s, task.id, date),
      counts = entries
        ? {
            completed: entries.filter((o) => o.status === "completed").length,
            missed: entries.filter((o) => o.status === "missed").length,
          }
        : allCounts,
      goal = taskProgressGoal(task),
      earlyForOccurrence = s.outcomes.find(
        (o) =>
          o.taskId === task.id &&
          o.scheduledDate === date &&
          o.date < date &&
          o.status === "completed" &&
          !o.deleted,
      ),
      earlyOnActualDate = records.some(
        (o) =>
          o.taskId === task.id &&
          o.scheduledDate &&
          o.scheduledDate > date &&
          o.status === "completed",
      ),
      completed =
        (goal === 0
          ? taskFinishedToday(s, task, date)
          : counts.completed >= goal) ||
        !!earlyForOccurrence ||
        earlyOnActualDate;
    const missed = counts.missed;
    const status = earlyForOccurrence || earlyOnActualDate
      ? "Completed Early"
      : completed
        ? "Completed"
      : missed
        ? "Missed"
        : date < today && goal > 0
          ? "Unfinished"
          : "Pending";
    return {
      task,
      completed,
      count: counts.completed,
      missed,
      goal,
      status,
      deadline: taskDeadlineLabel(task, date),
    };
  });
}
