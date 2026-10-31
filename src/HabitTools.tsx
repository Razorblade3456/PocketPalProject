import { useState, type Dispatch, type SetStateAction } from "react";
import {
  Star,
  Check,
  ChevronRight,
  Pause,
  Play,
  Clock3,
  ListChecks,
} from "lucide-react";
import {
  addHabitEvent,
  changeRewardPolicy,
  dateKey,
  goalFor,
  taskProgressGoal,
  taskFinishedToday,
  pausedOn,
  policyFor,
  reminderFor,
  rewardLimitFor,
  setStep,
  stepIsDone,
  taskCounts,
  taskDue,
  toggleFocus,
  type State,
  type Task,
  type Category,
} from "./model";
type Setter = Dispatch<SetStateAction<State>>;
export function TodayThree({
  s,
  today,
  setS,
  onComplete,
}: {
  s: State;
  today: string;
  setS: Setter;
  onComplete: (t: Task) => void;
}) {
  const selected = (s.focusDays?.[today] || [])
    .map((id) => s.tasks.find((t) => t.id === id))
    .filter((t): t is Task => !!t);
  if (!selected.length)
    return (
      <div className="focus-invite">
        <Star size={13} />
        <span>Star up to three focus tasks.</span>
      </div>
    );
  const finished = selected.filter((t) =>
    taskFinishedToday(s, t, today),
  ).length;
  return (
    <section className="today-three" aria-label="Today's 3">
      <div className="focus-heading">
        <span>
          <Star size={14} />
          Today's 3
        </span>
        <small>
          {finished}/{selected.length} priorities
        </small>
      </div>
      <div
        className="focus-track"
        role="progressbar"
        aria-label="Today's 3 progress"
        aria-valuemin={0}
        aria-valuemax={selected.length}
        aria-valuenow={finished}
      >
        <span style={{ width: (finished / selected.length) * 100 + "%" }} />
      </div>
      {selected.map((t) => {
        const c = taskCounts(s, t.id, today);
        const done = taskFinishedToday(s, t, today);
        return (
          <div className={"focus-row " + (done ? "done" : "")} key={t.id}>
            <button
              className="focus-complete"
              disabled={!taskDue(s, t)}
              aria-label={`Complete priority ${t.name}`}
              onClick={() => onComplete(t)}
            >
              <Check size={14} />
            </button>
            <span>
              {t.name}
              <small>
                {c.completed}/{taskProgressGoal(t) || "∞"} ·{" "}
                {taskDue(s, t)
                  ? "one tap to complete"
                  : "resting or not scheduled today"}
              </small>
            </span>
            <button
              className="icon-button"
              aria-label={`Unstar ${t.name}`}
              onClick={() => setS((p) => toggleFocus(p, t.id, today))}
            >
              <Star size={13} fill="currentColor" />
            </button>
          </div>
        );
      })}
    </section>
  );
}
export function TaskMeta({
  s,
  task,
  today,
  setS,
}: {
  s: State;
  task: Task;
  today: string;
  setS: Setter;
}) {
  const selected = s.focusDays?.[today]?.includes(task.id);
  const full = (s.focusDays?.[today]?.length || 0) >= 3;
  return (
    <div className="task-meta">
      <span>
        {[
          task.priority === "high"
            ? "High priority"
            : task.priority === "low"
              ? "Easy pace"
              : "",
          task.durationMinutes ? `${task.durationMinutes} min` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
      <button
        type="button"
        className={"focus-star " + (selected ? "chosen" : "")}
        aria-label={`${selected ? "Unstar" : "Star"} ${task.name}`}
        aria-pressed={!!selected}
        disabled={!selected && full}
        title={
          !selected && full
            ? "Your three focus spots are full"
            : "Choose for Today’s 3"
        }
        onClick={() => setS((p) => toggleFocus(p, task.id, today))}
      >
        <Star size={14} fill={selected ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
export function TinySteps({
  s,
  task,
  today,
  setS,
}: {
  s: State;
  task: Task;
  today: string;
  setS: Setter;
}) {
  if (!task.steps?.length) return null;
  const count = task.steps.filter((step) =>
    stepIsDone(s, task.id, step.id, today),
  ).length;
  return (
    <details className="tiny-steps">
      <summary>
        <ListChecks size={12} />
        Tiny steps{" "}
        <span>
          {count}/{task.steps.length}
        </span>
      </summary>
      <div>
        {task.steps.map((step) => (
          <label key={step.id}>
            <input
              type="checkbox"
              checked={stepIsDone(s, task.id, step.id, today)}
              onChange={(e) => {
                const checked = e.target.checked,
                  id = crypto.randomUUID(),
                  at = Date.now();
                setS((p) =>
                  setStep(p, task.id, step.id, checked, today, at, id),
                );
              }}
            />
            {step.name}
          </label>
        ))}
      </div>
      <p>
        Finishing the steps contributes one parent completion. Steps never earn
        separate coins.
      </p>
    </details>
  );
}
export function TaskQuickActions({
  s,
  task,
  today,
  setS,
}: {
  s: State;
  task: Task;
  today: string;
  setS: Setter;
}) {
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState(today);
  const [until, setUntil] = useState("");
  const [time, setTime] = useState(reminderFor(s, task, today));
  const paused = pausedOn(s, task.id, today);
  const plan = (s.habitEvents || [])
    .filter(
      (e) =>
        e.taskId === task.id &&
        e.date === today &&
        ["skip", "reschedule", "restore"].includes(e.kind),
    )
    .at(-1);
  const act = (event: Parameters<typeof addHabitEvent>[1]) => {
    const id = crypto.randomUUID(),
      at = Date.now();
    setS((p) => addHabitEvent(p, event, at, id));
  };
  return (
    <details className="task-quick">
      <summary>
        Plan & rest <ChevronRight size={12} />
      </summary>
      <div className="task-quick-body">
        {(plan?.kind === "skip" || plan?.kind === "reschedule") && (
          <button
            type="button"
            onClick={() =>
              act({ taskId: task.id, date: today, kind: "restore" })
            }
          >
            Restore today’s occurrence
          </button>
        )}
        <label>
          Skip reason
          <input
            value={reason}
            maxLength={200}
            placeholder="Rest, illness, plans changed…"
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!reason.trim()}
          onClick={() =>
            act({
              taskId: task.id,
              date: today,
              kind: "skip",
              reason: reason.trim(),
            })
          }
        >
          Skip today without penalty
        </button>
        <div className="quick-pair">
          <label>
            Move today's occurrence
            <input
              type="date"
              min={today}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={target <= today}
            onClick={() =>
              act({
                taskId: task.id,
                date: today,
                kind: "reschedule",
                until: target,
              })
            }
          >
            Reschedule
          </button>
        </div>
        <div className="quick-pair">
          <label>
            Reminder today
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              act({ taskId: task.id, date: today, kind: "snooze", time })
            }
          >
            <Clock3 size={12} />
            Snooze
          </button>
        </div>
        <label>
          Pause through (optional)
          <input
            type="date"
            min={today}
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            act({
              taskId: task.id,
              date: today,
              kind: paused ? "resume" : "pause",
              ...(until ? { until } : {}),
              reason: reason.trim() || "Rest",
            })
          }
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}{" "}
          {paused ? "Resume routine" : "Pause routine"}
        </button>
        <p>
          Pauses and skips have no automatic misses. Resume from Manage all
          tasks.
        </p>
      </div>
    </details>
  );
}
export function TaskAdvancedFields({
  task,
  update,
}: {
  task: Task;
  update: (patch: Partial<Task>) => void;
}) {
  const templates: Record<string, string[]> = {
    "Clean room": ["Put clothes away", "Clear desk", "Take out trash"],
    "Gentle morning": [
      "Drink some water",
      "Stretch for a minute",
      "Choose one priority",
    ],
    "Study session": [
      "Open the material",
      "Read one small section",
      "Write a short note",
    ],
  };
  return (
    <div className="task-advanced">
      <div className="field-row">
        <label>
          Duration (minutes)
          <input
            type="number"
            min={0}
            max={1440}
            value={task.durationMinutes ?? ""}
            placeholder="Optional"
            onChange={(e) =>
              update({
                durationMinutes: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        </label>
        <label>
          Priority
          <select
            value={task.priority || "normal"}
            onChange={(e) =>
              update({ priority: e.target.value as Task["priority"] })
            }
          >
            <option value="low">Low · easy pace</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <label className="habit-check">
        <input
          type="checkbox"
          checked={task.importantAlarm || task.reminderEnabled !== false}
          disabled={!!task.importantAlarm}
          onChange={(e) => update({ reminderEnabled: e.target.checked })}
        />
        Use reminder time
      </label>
      <label>
        Care category (optional)
        <select
          value={task.careLinked === false ? "none" : task.category}
          onChange={(e) =>
            update(
              e.target.value === "none"
                ? { careLinked: false }
                : { careLinked: true, category: e.target.value as Category },
            )
          }
        >
          <option value="none">None · coins only</option>
          <option value="food">Food</option>
          <option value="water">Water</option>
          <option value="clean">Cleanliness</option>
          <option value="happy">Happiness</option>
        </select>
      </label>
      <p className="fine">
        Eligible completions earn coins, never direct care. An optional category
        chooses the need affected by a missed attempt.
      </p>
      {task.repetitions !== "goal" && (
        <label>
          Daily rewarded completions
          <input
            type="number"
            min={0}
            max={100}
            value={task.rewardCap ?? ""}
            placeholder="Use economy default"
            onChange={(e) =>
              update({
                rewardCap:
                  e.target.value !== "" ? Number(e.target.value) : undefined,
              })
            }
          />
        </label>
      )}
      <h3 className="tiny-editor-title">Break into steps</h3>
      <label>
        Tiny steps · one per line
        <textarea
          maxLength={3600}
          value={(task.steps || []).map((step) => step.name).join("\n")}
          placeholder="Put clothes away\nClear desk\nTake out trash"
          onChange={(e) =>
            update({
              steps: e.target.value
                .split("\n")
                .slice(0, 30)
                .map((name, i) => ({
                  id: task.steps?.[i]?.id || crypto.randomUUID(),
                  name: name.slice(0, 120),
                })),
            })
          }
        />
      </label>
      <div className="step-templates">
        {Object.entries(templates).map(([name, steps]) => (
          <button
            type="button"
            key={name}
            onClick={() =>
              update({
                steps: steps.map((name) => ({ id: crypto.randomUUID(), name })),
              })
            }
          >
            {name} template
          </button>
        ))}
      </div>
      <p className="fine">
        All steps together contribute one parent completion, without multiplying
        rewards.
      </p>
    </div>
  );
}
export function RewardSettings({ s, setS }: { s: State; setS: Setter }) {
  const policy = policyFor(s);
  return (
    <section className="reward-settings">
      <h3>Reward Settings</h3>
      <p>
        Extra entries always count in history. Only eligible entries earn coins
        and jar balls. Changes apply to new entries.
      </p>
      <div className="field-row">
        <label>
          Coins per rewarded completion
          <input
            type="number"
            min={0}
            max={100}
            value={policy.coins}
            onChange={(e) =>
              setS((p) =>
                changeRewardPolicy(p, {
                  ...policy,
                  coins: Number(e.target.value),
                }),
              )
            }
          />
        </label>
        <label>
          Daily reward cap without a custom goal
          <input
            type="number"
            min={0}
            max={100}
            value={policy.dailyCap}
            onChange={(e) =>
              setS((p) =>
                changeRewardPolicy(p, {
                  ...policy,
                  dailyCap: Number(e.target.value),
                }),
              )
            }
          />
        </label>
      </div>
      <p>
        Custom daily goals reward up to their target. No goal? The default is{" "}
        {policy.dailyCap} rewarded entries per task per day.
      </p>
    </section>
  );
}
export function TaskRewardNote({
  s,
  task,
  today,
}: {
  s: State;
  task: Task;
  today: string;
}) {
  const paid = s.outcomes.filter(
    (o) =>
      o.taskId === task.id &&
      o.date === today &&
      o.status === "completed" &&
      !o.deleted &&
      o.rewardCoins > 0,
  ).length;
  return (
    <span className="task-reward-note">
      {paid}/{rewardLimitFor(s, task)} rewarded today · extra entries still
      count
    </span>
  );
}
