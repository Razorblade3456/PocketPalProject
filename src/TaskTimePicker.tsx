import { useEffect, useState } from "react";

export type TimeParts = {
  hour: number;
  minute: string;
  period: "AM" | "PM";
};

/** Convert the saved HH:mm value into editable 12-hour parts. */
export function to12HourParts(value: string): TimeParts {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  const hour24 = match ? Number(match[1]) : 9;
  const minute = match ? Number(match[2]) : 0;
  if (hour24 > 23 || minute > 59) return { hour: 9, minute: "00", period: "AM" };
  return {
    hour: hour24 % 12 || 12,
    minute: String(minute).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

/** Convert valid 12-hour parts back to the app's persisted HH:mm format. */
export function from12HourParts(
  hour: number,
  minute: string,
  period: "AM" | "PM",
): string | null {
  if (!Number.isInteger(hour) || hour < 1 || hour > 12 || !/^\d{1,2}$/.test(minute))
    return null;
  const minuteValue = Number(minute);
  if (minuteValue < 0 || minuteValue > 59) return null;
  const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")}`;
}

export function TaskTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [parts, setParts] = useState(() => to12HourParts(value));
  useEffect(() => setParts(to12HourParts(value)), [value]);

  const commit = (next: TimeParts) => {
    const normalized = from12HourParts(next.hour, next.minute, next.period);
    if (normalized && normalized !== value) onChange(normalized);
  };
  const updatePart = (patch: Partial<TimeParts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    commit(next);
  };
  const normalizeMinute = () => {
    if (/^\d{1,2}$/.test(parts.minute) && Number(parts.minute) <= 59) {
      const next = { ...parts, minute: parts.minute.padStart(2, "0") };
      setParts(next);
      commit(next);
    } else {
      const savedMinute = to12HourParts(value).minute;
      setParts((current) => ({ ...current, minute: savedMinute }));
    }
  };
  const displayMinute = /^\d{1,2}$/.test(parts.minute) && Number(parts.minute) <= 59
    ? parts.minute.padStart(2, "0")
    : to12HourParts(value).minute;

  return (
    <div className="task-time-picker" aria-label="Task time">
      <label>
        Hour
        <select
          aria-label="Hour"
          value={parts.hour}
          onChange={(event) => updatePart({ hour: Number(event.target.value) })}
        >
          {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>
      </label>
      <label>
        Minute
        <input
          aria-label="Minute"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={parts.minute}
          onChange={(event) => setParts((current) => ({
            ...current,
            minute: event.target.value.replace(/\D/g, "").slice(0, 2),
          }))}
          onBlur={normalizeMinute}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              normalizeMinute();
            }
          }}
        />
      </label>
      <div className="task-time-period" role="group" aria-label="AM or PM">
        {(["AM", "PM"] as const).map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={parts.period === period}
            onClick={() => updatePart({ period })}
          >
            {period}
          </button>
        ))}
      </div>
      <output className="task-time-readout" aria-label="Selected time">
        {parts.hour}:{displayMinute} {parts.period}
      </output>
    </div>
  );
}
