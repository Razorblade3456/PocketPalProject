import { useEffect, useRef, useState } from "react";
import { Plus, Minus, Undo2, Check, X, Trash2 } from "lucide-react";
import type { RewardSource } from "./Jar";
import { dateKey, localDate, type State, type OutcomeStatus } from "./model";
import { itemName } from "./catalog";
export function OutcomeControls({
  name,
  counts,
  goal,
  onChange,
  onUndo,
  canUndo,
}: {
  name: string;
  counts: { completed: number; missed: number };
  goal: number;
  onChange: (status: "completed" | "missed", source?: RewardSource) => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const [locked, setLocked] = useState(false),
    until = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const act = (status: "completed" | "missed", source?: RewardSource) => {
    if (Date.now() < until.current) return;
    until.current = Date.now() + 350;
    setLocked(true);
    timer.current = setTimeout(() => setLocked(false), 350);
    onChange(status, source);
  };
  return (
    <div className="repeat-controls">
      <div className="outcome-controls">
        <span className="task-counters">
          <span className="success-count">
            <Check size={11} />
            {counts.completed} completed
          </span>
          <span className="miss-count">
            <X size={11} />
            {counts.missed} missed
          </span>
        </span>
        <div className="outcome-buttons">
          <button
            type="button"
            className="outcome-positive"
            aria-label={`Complete ${name}`}
            title="Record another completion · +5 coins"
            disabled={locked}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              act("completed", {
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
            title="Record another missed attempt · up to −8 care"
            disabled={locked}
            onClick={() => act("missed")}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="outcome-undo"
            aria-label={`Undo latest ${name}`}
            title="Remove only the most recent entry"
            disabled={!canUndo || locked}
            onClick={onUndo}
          >
            <Undo2 size={14} />
          </button>
        </div>
      </div>
      {goal > 1 && (
        <div className="task-goal">
          <span>
            {counts.completed}/{goal} daily goal
            {counts.completed >= goal ? " · lovely work!" : ""}
          </span>
          <div
            role="progressbar"
            aria-label={`${name} daily goal`}
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={Math.min(goal, counts.completed)}
          >
            <span
              style={{
                width: Math.min(100, (counts.completed / goal) * 100) + "%",
              }}
            />
          </div>
        </div>
      )}
      {goal === 0 && (
        <span className="unlimited-note">
          As many little moments as you like
        </span>
      )}
    </div>
  );
}
export function OutcomeHistory({
  s,
  onCorrect,
  onDelete,
}: {
  s: State;
  onCorrect: (id: string, status: OutcomeStatus) => void;
  onDelete: (id: string) => void;
}) {
  const days = [
    ...new Set([
      ...s.outcomes.map((o) => o.date),
      ...s.careEvents
        .filter((e) => e.kind === "buy" || e.kind === "use")
        .map((e) => dateKey(e.at)),
      dateKey(),
    ]),
  ]
    .sort()
    .reverse();
  const [selected, setSelected] = useState(days[0]);
  const rows = s.outcomes
    .filter((o) => o.date === selected && !o.deleted)
    .sort((a, b) => a.sequence - b.sequence);
  const tx = s.careEvents.filter(
    (e) => (e.kind === "buy" || e.kind === "use") && dateKey(e.at) === selected,
  );
  return (
    <section className="outcome-history">
      <h3>Every little moment</h3>
      <p className="fine">
        Each press has its own entry. Correct or remove just that moment; its
        original date stays the same. Bought items stay yours, with spent-coin
        shortfalls reserved from future wins.
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
      {rows.map((o, i) => (
        <article className={`history-outcome ${o.status}`} key={o.id}>
          <div className="entry-heading">
            <h4>{o.name}</h4>
            <small>Entry {i + 1}</small>
          </div>
          <small>
            {new Date(o.at).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            })}{" "}
            ·{" "}
            {o.category === "happy"
              ? "Happiness"
              : o.category === "clean"
                ? "Cleanliness"
                : o.category === "water"
                  ? "Hydration"
                  : "Nourishment"}
            {o.automatic ? " · automatic missed goal" : ""}
          </small>
          <div className="entry-actions">
            <label>
              Outcome for {o.name} entry {i + 1}
              <select
                aria-label={`Outcome for ${o.name} entry ${i + 1}`}
                value={o.status}
                onChange={(e) =>
                  onCorrect(o.id, e.target.value as OutcomeStatus)
                }
              >
                <option value="completed">
                  Completed · +{o.rewardCoins} coins
                </option>
                <option value="missed">Missed · up to −{o.penalty} care</option>
                <option value="pending">Pending · no task effect</option>
              </select>
            </label>
            <button
              className="delete-entry"
              aria-label={`Delete ${o.name} entry ${i + 1}`}
              title="Remove this entry only"
              onClick={() => onDelete(o.id)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
      {!rows.length && <p>No task entries on this day yet.</p>}
      <details className="transaction-journal">
        <summary>Coins & care transactions ({tx.length})</summary>
        {tx.map((e) =>
          e.kind === "buy" || e.kind === "use" ? (
            <div key={e.id}>
              <span>
                {e.kind === "buy" ? "Bought " : "Used "}
                {itemName(e.item)}
              </span>
              <small>
                {e.kind === "buy"
                  ? "−" + e.cost + " coins"
                  : "+" + e.boost + " care · +" + e.morale + " joy"}
              </small>
            </div>
          ) : null,
        )}
        {!tx.length && <p>No purchases or item use on this day.</p>}
      </details>
    </section>
  );
}
