import type { RewardSource } from "./Jar";
import { Plus, Minus, Undo2 } from "lucide-react";
import { useState } from "react";
import {
  dateKey,
  localDate,
  outcomeFor,
  type State,
  type Task,
  type OutcomeStatus,
} from "./model";
export function OutcomeControls({
  status,
  name,
  onChange,
}: {
  status: OutcomeStatus;
  name: string;
  onChange: (status: OutcomeStatus, source?: RewardSource) => void;
}) {
  return (
    <div className="outcome-controls">
      <span className={`outcome-status ${status}`}>
        {status === "completed"
          ? "Completed"
          : status === "missed"
            ? "Missed"
            : "Pending"}
      </span>
      <div className="outcome-buttons">
        <button
          type="button"
          className="outcome-positive"
          aria-label={`Complete ${name}`}
          title="I completed this task · +5 coins"
          aria-pressed={status === "completed"}
          disabled={status === "completed"}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            onChange("completed", {
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
            });
          }}
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="outcome-negative"
          aria-label={`Miss ${name}`}
          title="I did not complete this task · up to −8 care"
          aria-pressed={status === "missed"}
          disabled={status === "missed"}
          onClick={() => onChange("missed")}
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          className="outcome-undo"
          aria-label={`Undo ${name}`}
          title="Return to pending"
          disabled={status === "pending"}
          onClick={() => onChange("pending")}
        >
          <Undo2 size={14} />
        </button>
      </div>
    </div>
  );
}
export function OutcomeHistory({
  s,
  onChange,
}: {
  s: State;
  onChange: (
    t: Task,
    status: OutcomeStatus,
    date: string,
    source?: RewardSource,
  ) => void;
}) {
  const days = [...new Set([...s.outcomes.map((o) => o.date), dateKey()])]
    .sort()
    .reverse();
  const [selected, setSelected] = useState(days[0]);
  const rows = s.outcomes.filter((o) => o.date === selected);
  const today = selected === dateKey();
  return (
    <section className="outcome-history">
      <h3>Every day's little things</h3>
      <p className="fine">
        Correct a result anytime. Its original date stays the same, and care and
        jar rewards and coins are recalculated together. Bought supplies stay
        yours; any spent-coin shortfall is reserved from future wins.
      </p>
      <label>
        Choose a day
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {days.map((d) => (
            <option key={d} value={d}>
              {localDate(d).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </option>
          ))}
        </select>
      </label>
      {rows.map((o) => (
        <article className={`history-outcome ${o.status}`} key={o.taskId}>
          <h4>{o.name}</h4>
          <small>
            {o.task.time} ·{" "}
            {o.category === "happy"
              ? "Happiness"
              : o.category === "clean"
                ? "Cleanliness"
                : o.category === "water"
                  ? "Hydration"
                  : "Nourishment"}
            {o.automatic ? " · automatically missed" : ""}
            {o.legacy ? " · from your original save" : ""}
          </small>
          <OutcomeControls
            status={o.status}
            name={`${o.name} on ${selected}`}
            onChange={(status, source) =>
              onChange(o.task, status, selected, source)
            }
          />
        </article>
      ))}
      {!rows.length && (
        <p>No outcomes recorded {today ? "yet today" : "on this day"}.</p>
      )}
    </section>
  );
}
