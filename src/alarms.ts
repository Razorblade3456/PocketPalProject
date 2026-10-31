import {
  dateKey,
  localDate,
  shiftDate,
  taskDue,
  reminderFor,
  pausedOn,
  taskFinishedToday,
  type State,
  type Task,
} from "./model";
export type AlarmRecord = {
  id: string;
  taskId: string;
  date: string;
  schedule: string;
  scheduledAt: number;
  dueAt: number;
  status: "pending" | "ringing" | "stopped";
};
const signature = (s: State, t: Task, date: string) =>
  JSON.stringify([
    t.time,
    t.repeat,
    t.days,
    t.date,
    t.intervalDays,
    t.alarmEnabledAt,
    reminderFor(s, t, date),
    (s.habitEvents || [])
      .filter(
        (e) =>
          e.taskId === t.id &&
          e.date === date &&
          ["skip", "reschedule", "restore"].includes(e.kind),
      )
      .map((e) => e.id),
    ...(t.relativeAlarmAt ? ["relative", t.relativeAlarmAt] : []),
  ]);
export function quietNow(settings: State["settings"], n = Date.now()) {
  if (!settings.quietHours) return false;
  const d = new Date(n),
    time = d.getHours() * 60 + d.getMinutes();
  const minutes = (s: string) =>
    Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const start = minutes(settings.quietStart || "21:00"),
    end = minutes(settings.quietEnd || "07:00");
  return (
    start === end ||
    (start < end ? time >= start && time < end : time >= start || time < end)
  );
}
/** Uses existing local-calendar scheduling, without recording task outcomes. */
export function reconcileAlarms(s: State, n = Date.now()): State {
  const today = dateKey(n),
    tasks = new Map(s.tasks.map((t) => [t.id, t]));
  const records = (s.alarms || [])
    .filter((a) => {
      const t = tasks.get(a.taskId);
      if (
        !t?.importantAlarm ||
        t.reminderEnabled === false ||
        a.schedule !== signature(s, t, a.date) ||
        pausedOn(s, t.id, a.date)
      )
        return false;
      const plan = (s.habitEvents || [])
        .filter(
          (e) =>
            e.taskId === t.id &&
            e.date === a.date &&
            ["skip", "reschedule", "restore"].includes(e.kind),
        )
        .at(-1);
      if (plan?.kind === "skip" || plan?.kind === "reschedule") return false;
      return !(
        a.status === "pending" &&
        a.dueAt === a.scheduledAt &&
        taskFinishedToday(s, t, a.date)
      );
    })
    .map((a) => {
      if (
        a.status !== "pending" ||
        a.dueAt !== a.scheduledAt ||
        tasks.get(a.taskId)?.relativeAlarmAt
      )
        return a;
      const t = tasks.get(a.taskId)!;
      const localAt = +new Date(`${a.date}T${reminderFor(s, t, a.date)}:00`);
      return localAt === a.scheduledAt
        ? a
        : { ...a, scheduledAt: localAt, dueAt: localAt };
    });
  const ids = new Set(records.map((a) => a.id));
  for (const t of s.tasks) {
    if (!t.importantAlarm || t.reminderEnabled === false) continue;
    if (t.relativeAlarmAt) {
      const date =
        t.repeat === "once"
          ? t.date
          : dateKey(t.alarmEnabledAt ?? t.createdAt ?? n);
      const id = JSON.stringify([t.id, "relative", t.relativeAlarmAt]);
      const plan = (s.habitEvents || [])
        .filter(
          (e) =>
            e.taskId === t.id &&
            e.date === date &&
            ["skip", "reschedule", "restore"].includes(e.kind),
        )
        .at(-1);
      if (
        !ids.has(id) &&
        !pausedOn(s, t.id, date) &&
        !taskFinishedToday(s, t, date) &&
        plan?.kind !== "skip" &&
        plan?.kind !== "reschedule"
      ) {
        records.push({
          id,
          taskId: t.id,
          date,
          schedule: signature(s, t, date),
          scheduledAt: t.relativeAlarmAt,
          dueAt: t.relativeAlarmAt,
          status: t.relativeAlarmAt <= n ? "ringing" : "pending",
        });
        ids.add(id);
      }
      continue;
    }
    const from = dateKey(
      Math.max(
        t.alarmEnabledAt ?? t.createdAt ?? s.created,
        Math.min(s.alarmsCheckedAt ?? 0, n),
      ),
    );
    for (let date = from; date <= today; date = shiftDate(date, 1)) {
      if (!taskDue(s, t, +localDate(date)) || taskFinishedToday(s, t, date))
        continue;
      const id = JSON.stringify([t.id, date]);
      if (ids.has(id)) continue;
      const scheduledAt = +new Date(`${date}T${reminderFor(s, t, date)}:00`);
      records.push({
        id,
        taskId: t.id,
        date,
        schedule: signature(s, t, date),
        scheduledAt,
        dueAt: scheduledAt,
        status: scheduledAt <= n ? "ringing" : "pending",
      });
      ids.add(id);
    }
  }
  const next = records.map((a) =>
    a.status === "pending" && a.dueAt <= n
      ? { ...a, status: "ringing" as const }
      : a,
  );
  if (
    JSON.stringify(next) === JSON.stringify(s.alarms || []) &&
    dateKey(s.alarmsCheckedAt ?? 0) === today
  )
    return s;
  if (!s.alarms && !next.length && !s.tasks.some((t) => t.importantAlarm))
    return s;
  return { ...s, alarms: next, alarmsCheckedAt: n };
}
export function dismissAlarm(
  s: State,
  id: string,
  minutes: 0 | 5 | 10 | 30,
  n = Date.now(),
): State {
  return {
    ...s,
    alarms: (s.alarms || []).map((a) =>
      a.id !== id
        ? a
        : minutes
          ? { ...a, status: "pending", dueAt: n + minutes * 60000 }
          : { ...a, status: "stopped" },
    ),
  };
}
export const alarmQueue = (s: State) =>
  (s.alarms || [])
    .filter((a) => a.status === "ringing")
    .sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id));

/** A relative alarm is a one-shot deadline, independent of calendar/DST rebasing. */
export function setAlarmDeadline(
  task: Task,
  mode: "time" | "relative",
  minutes: number,
  restart = false,
  n = Date.now(),
): Task {
  if (!task.importantAlarm || mode === "time")
    return { ...task, relativeAlarmAt: undefined };
  if (task.relativeAlarmAt && !restart) return task;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 525600)
    throw new Error("Choose 1–525600 minutes.");
  const target = n + minutes * 60000;
  const at = new Date(target);
  return {
    ...task,
    relativeAlarmAt: target,
    alarmEnabledAt: n,
    reminderEnabled: true,
    time:
      String(at.getHours()).padStart(2, "0") +
      ":" +
      String(at.getMinutes()).padStart(2, "0"),
  };
}
export function nearestAlarm(records: AlarmRecord[] = [], taskId?: string) {
  return records
    .filter((a) => a.status !== "stopped" && (!taskId || a.taskId === taskId))
    .sort((a, b) => a.dueAt - b.dueAt || a.id.localeCompare(b.id))[0];
}
export function formatCountdown(dueAt: number, now: number) {
  const seconds = Math.max(0, Math.ceil((dueAt - now) / 1000));
  const pad = (value: number) => String(value).padStart(2, "0");
  return seconds >= 3600
    ? Math.floor(seconds / 3600) +
        ":" +
        pad(Math.floor(seconds / 60) % 60) +
        ":" +
        pad(seconds % 60)
    : pad(Math.floor(seconds / 60)) + ":" + pad(seconds % 60);
}
