import { nearestAlarm, type AlarmRecord } from "./alarms";
import type { PetKind, State } from "./model";
import { stage } from "./model";

export type DesktopDisplayPayload = {
  protocol: 1;
  revision: number;
  syncedAt: number;
  pet: { kind: PetKind; name: string; level: number; care: State["care"]; equipped: State["equipped"] };
  petCare: boolean;
  motion: boolean;
  alarmsEnabled: boolean;
  alarm: (AlarmRecord & { name: string; priority: "low" | "normal" | "high" }) | null;
};

/** Deliberately projects only values that affect the desktop presentation. */
export function desktopDisplayPayload(state: State, records = state.alarms || [], now = Date.now()): DesktopDisplayPayload {
  const enabled = state.settings.alarmsEnabled !== false;
  const alarm = enabled ? nearestAlarm(records) : undefined;
  const task = state.tasks.find(item => item.id === alarm?.taskId);
  return {
    protocol: 1,
    revision: 0,
    syncedAt: now,
    pet: {
      kind: state.pet,
      name: (state.name || "Mochi").slice(0, 64),
      level: stage(state),
      care: state.care,
      equipped: state.equipped,
    },
    petCare: state.settings.petCare !== false,
    motion: state.settings.motion !== false,
    alarmsEnabled: enabled,
    alarm: alarm && task ? {
      id: alarm.id,
      taskId: alarm.taskId,
      date: alarm.date,
      schedule: alarm.schedule,
      scheduledAt: alarm.scheduledAt,
      startedAt: alarm.startedAt,
      dueAt: alarm.dueAt,
      status: alarm.status,
      name: task.name.slice(0, 120),
      priority: task.priority || "normal",
    } : null,
  };
}
