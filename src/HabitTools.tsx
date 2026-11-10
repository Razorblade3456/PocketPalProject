import { setStepWithReminder } from "./alarms";
import { AlarmCountdown } from "./AlarmCountdown";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  Star,
  Check,
  ChevronRight,
  Pause,
  Play,
  Bookmark,
  Clock3,
  ListChecks,
  X,
} from "lucide-react";
import {
  addHabitEvent,
  dateKey,
  goalFor,
  taskProgressGoal,
  taskFinishedToday,
  pausedOn,
  reminderFor,
  rewardLimitFor,
  stepIsDone,
  taskCounts,
  taskDue,
  toggleFocus,
  type State,
  type Task,
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
      <span
        className={`priority-indicator priority-${task.priority || "normal"}`}
      >
        {task.priority === "high"
          ? "High priority"
          : task.priority === "low"
            ? "Low priority"
            : "Normal priority"}
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
        <span>
          {count}/{task.steps.length} · Steps & Timers
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
                  setStepWithReminder(
                    p,
                    task.id,
                    step.id,
                    checked,
                    today,
                    at,
                    id,
                  ),
                );
              }}
            />
            <span>
              {step.name}
              <AlarmCountdown
                alarm={s.alarms?.find(
                  (a) =>
                    a.taskId === task.id &&
                    a.stepId === step.id &&
                    a.status !== "stopped",
                )}
                name={step.name}
              />
            </span>
          </label>
        ))}
      </div>
      <p>All steps count toward one task completion.</p>
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

export function PickUpHere({
  task,
  setS,
}: {
  task: Task;
  setS: Setter;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.resumeNote || "");
  const save = () => {
    const note = draft.trim().slice(0, 160);
    setS((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === task.id ? { ...t, resumeNote: note || undefined } : t,
      ),
    }));
    setEditing(false);
  };
  const clear = () => {
    setS((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === task.id ? { ...t, resumeNote: undefined } : t,
      ),
    }));
    setDraft("");
    setEditing(false);
  };
  if (editing)
    return (
      <div className="pick-up-editor">
        <label>
          <Bookmark size={13} /> Where did you leave off?
          <input
            autoFocus
            value={draft}
            maxLength={160}
            placeholder="Continue from Chapter 6, question 12."
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
        </label>
        <div className="pick-up-actions">
          <button type="button" disabled={!draft.trim()} onClick={save}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  if (!task.resumeNote)
    return (
      <button
        type="button"
        className="pick-up-trigger"
        onClick={() => {
          setDraft("");
          setEditing(true);
        }}
      >
        <Bookmark size={12} /> Pick Up Here
      </button>
    );
  return (
    <details className="pick-up-note">
      <summary>
        <Bookmark size={12} /> Pick Up Here <ChevronRight size={11} />
      </summary>
      <p>{task.resumeNote}</p>
      <div className="pick-up-actions">
        <button
          type="button"
          onClick={() => {
            setDraft(task.resumeNote || "");
            setEditing(true);
          }}
        >
          Edit
        </button>
        <button type="button" onClick={clear}>
          Clear
        </button>
      </div>
    </details>
  );
}
export function TaskAdvancedFields({
  task,
  update,
  sectionRef,
}: {
  task: Task;
  update: (patch: Partial<Task>) => void;
  sectionRef?: (element: HTMLDetailsElement | null) => void;
}) {
  const generated = task.id.startsWith("up-next:");
  return (
    <details
      ref={sectionRef}
      className="up-next-editor"
      hidden={generated}
      tabIndex={-1}
    >
      <summary>
        <span className="up-next-title">
          Up Next <span className="up-next-optional">Optional</span>
        </span>
        <span className="up-next-description">
          Automatically start the next task when this one is completed.
        </span>
      </summary>
      {(task.upNext || []).map((item, index) => (
        <fieldset className="up-next-card" key={item.id}>
          <legend>{index + 1}</legend>
          <label>
            Task Name
            <input
              maxLength={100}
              value={item.name}
              onChange={(e) =>
                update({
                  upNext: task.upNext!.map((x) =>
                    x.id === item.id ? { ...x, name: e.target.value } : x,
                  ),
                })
              }
            />
          </label>
          <div className="up-next-fields">
            <label>
              Priority
              <select
                value={item.priority}
                onChange={(e) =>
                  update({
                    upNext: task.upNext!.map((x) =>
                      x.id === item.id
                        ? {
                            ...x,
                            priority: e.target.value as typeof x.priority,
                          }
                        : x,
                    ),
                  })
                }
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              Alarm after · minutes
              <input
                type="number"
                min={1}
                max={525600}
                value={item.alarmMinutes}
                onChange={(e) =>
                  update({
                    upNext: task.upNext!.map((x) =>
                      x.id === item.id
                        ? { ...x, alarmMinutes: Number(e.target.value) }
                        : x,
                    ),
                  })
                }
              />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={item.alarm}
                onChange={(e) =>
                  update({
                    upNext: task.upNext!.map((x) =>
                      x.id === item.id ? { ...x, alarm: e.target.checked } : x,
                    ),
                  })
                }
              />
              Alarm
            </label>
          </div>
          <button
            type="button"
            className="remove-step"
            aria-label={"Remove next task " + (index + 1)}
            onClick={() =>
              update({ upNext: task.upNext!.filter((x) => x.id !== item.id) })
            }
          >
            <X size={14} />
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="add-step"
        disabled={task.repeat !== "once" || (task.upNext?.length || 0) >= 5}
        onClick={() =>
          update({
            upNext: [
              ...(task.upNext || []),
              {
                id: crypto.randomUUID(),
                name: "",
                priority: "normal",
                alarmMinutes: 45,
                alarm: true,
              },
            ],
          })
        }
      >
        + Add Next Task
      </button>
      {task.repeat !== "once" && (
        <p className="fine">Up Next is available for Just Once tasks.</p>
      )}
    </details>
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

export function TaskPriority({
  task,
  update,
}: {
  task: Task;
  update: (patch: Partial<Task>) => void;
}) {
  return (
    <fieldset className="task-priority-picker">
      <legend>Priority</legend>
      <div role="group" aria-label="Task priority">
        {(
          [
            ["high", "High"],
            ["normal", "Normal"],
            ["low", "Low"],
          ] as const
        ).map(([priority, label]) => (
          <button
            key={priority}
            type="button"
            className={"priority-" + priority}
            aria-label={label + " priority"}
            aria-pressed={(task.priority || "normal") === priority}
            onClick={() => update({ priority })}
          >
            <span aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
