import { useSyncExternalStore } from "react";
import { Clock3 } from "lucide-react";
import { formatCountdown, type AlarmRecord } from "./alarms";
let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const tick = () => {
  now = Date.now();
  listeners.forEach((listener) => listener());
};
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    }
  };
}
const dormant = () => () => {};
export function AlarmCountdown({
  alarm,
  compact = false,
  name = "",
}: {
  alarm?: AlarmRecord;
  compact?: boolean;
  name?: string;
}) {
  const clock = useSyncExternalStore(
    alarm?.status === "pending" ? subscribe : dormant,
    () => now,
    () => now,
  );
  const at = Math.max(clock, Date.now());
  if (!alarm || alarm.status === "stopped") return null;
  const ringing = alarm.status === "ringing" || alarm.dueAt <= at;
  const text = ringing ? "Alarm ringing" : formatCountdown(alarm.dueAt, at);
  return (
    <span
      className={`alarm-countdown ${compact ? "mini-countdown" : ""}`}
      title={name || "Task alarm"}
    >
      <Clock3 size={compact ? 10 : 12} aria-hidden="true" />
      {text}
      {!compact && !ringing ? " remaining" : ""}
    </span>
  );
}
