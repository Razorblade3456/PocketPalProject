import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { dateKey, localDate, type State, type Task } from "./model";
import {
  calendarMonth,
  calendarDaysForMonth,
  calendarTasks,
  type CalendarTask,
} from "./calendarModel";
const dayLabel = (date: string) =>
  localDate(date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
function Orb({ row }: { row: CalendarTask }) {
  return (
    <span
      className={
        "calendar-orb priority-" +
        (row.task.priority || "normal") +
        (row.completed ? " is-complete" : "")
      }
      title={row.task.name + " · " + row.status}
      aria-hidden="true"
    />
  );
}
export function TaskCalendar({
  s,
  today = dateKey(),
  onEdit,
  onAdd,
}: {
  s: State;
  today?: string;
  onEdit?: (task: Task) => void;
  onAdd?: (date: string) => void;
}) {
  const [selected, setSelected] = useState(today),
    [month, setMonth] = useState(() => calendarMonth(today)),
    [expanded, setExpanded] = useState(false);
  const days = useMemo(() => calendarDaysForMonth(month), [month]);
  const byDate = useMemo(
    () =>
      new Map(
        days
          .filter((day): day is string => !!day)
          .map((day) => [day, calendarTasks(s, day, today)]),
      ),
    [s, days, today],
  );
  const rows = byDate.get(selected) || calendarTasks(s, selected, today);
  const monthLabel = localDate(month).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const changeMonth = (offset: number) => {
    const next = calendarMonth(month, offset);
    setMonth(next);
    setSelected(next);
    setExpanded(false);
  };
  return (
    <section className="task-calendar" aria-label="Task Calendar">
      <div className="calendar-heading">
        <h2>Task Calendar</h2>
        <button
          type="button"
          className="calendar-today"
          onClick={() => {
            setMonth(calendarMonth(today));
            setSelected(today);
            setExpanded(true);
          }}
        >
          Today
        </button>
      </div>
      <div className="calendar-navigation">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous month"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft size={17} />
        </button>
        <h3 id="calendar-month" aria-live="polite">
          {monthLabel}
        </h3>
        <button
          type="button"
          className="icon-button"
          aria-label="Next month"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div
        className="calendar-grid"
        role="group"
        aria-labelledby="calendar-month"
      >
        {days.map((date, index) =>
          date ? (
            <button
              type="button"
              key={date}
              className={"calendar-day" + (date === today ? " is-today" : "")}
              aria-current={date === today ? "date" : undefined}
              aria-pressed={date === selected}
              aria-label={
                dayLabel(date) +
                ", " +
                byDate.get(date)!.length +
                " tasks, " +
                byDate.get(date)!.filter((r) => r.completed).length +
                " completed"
              }
              onClick={() => {
                setSelected(date);
                setExpanded(true);
              }}
            >
              <span className="calendar-date">{localDate(date).getDate()}</span>
              <span className="calendar-orbs">
                {byDate
                  .get(date)!
                  .slice(0, 4)
                  .map((row) => (
                    <Orb key={row.task.id} row={row} />
                  ))}
                {byDate.get(date)!.length > 4 && (
                  <span className="calendar-more">
                    +{byDate.get(date)!.length - 4}
                  </span>
                )}
              </span>
            </button>
          ) : (
            <span className="calendar-blank" key={index} />
          ),
        )}
      </div>
      <p className="calendar-legend">
        <span className="calendar-orb priority-normal" />
        Pending <span className="calendar-orb priority-normal is-complete" />
        Completed
      </p>
      <details
        open={expanded}
        onToggle={(e) => setExpanded(e.currentTarget.open)}
        className="calendar-selected"
        aria-live="polite"
        aria-label="Selected day tasks"
      >
        <summary>
          {dayLabel(selected)}
          {" · "}
          <span>{rows.length} tasks</span>
        </summary>
        {onAdd && (
          <button
            type="button"
            className="calendar-add"
            onClick={() => onAdd(selected)}
          >
            + Add Task
          </button>
        )}
        {!rows.length ? (
          <p className="fine">No tasks scheduled.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li
                key={row.task.id}
                className={row.status === "Missed" ? "calendar-missed" : ""}
              >
                <Orb row={row} />
                <div>
                  <strong>{row.task.name}</strong>
                  <small>
                    {row.task.priority === "high"
                      ? "High"
                      : row.task.priority === "low"
                        ? "Low"
                        : "Normal"}{" "}
                    · {row.task.time || "No time"}
                  </small>
                  <span className="calendar-task-status">
                    {row.status}
                    {row.goal > 1
                      ? " · " + row.count + "/" + row.goal + " Done"
                      : row.goal === 0
                        ? " · " + row.count + " tracked"
                        : ""}
                    {row.missed > 0 ? " · " + row.missed + " missed" : ""}
                  </span>
                </div>
                {onEdit && s.tasks.some((t) => t.id === row.task.id) && (
                  <button
                    type="button"
                    className="calendar-edit"
                    title={
                      s.tasks.find((t) => t.id === row.task.id)!.repeat ===
                      "once"
                        ? "Edit Task"
                        : "Edit Task Series"
                    }
                    aria-label={
                      (s.tasks.find((t) => t.id === row.task.id)!.repeat ===
                      "once"
                        ? "Edit Task: "
                        : "Edit Task Series: ") + row.task.name
                    }
                    onClick={() => {
                      const original = s.tasks.find(
                        (t) => t.id === row.task.id,
                      );
                      if (original) onEdit(original);
                    }}
                  >
                    <Pencil size={12} aria-hidden="true" />
                    <span>
                      {s.tasks.find((t) => t.id === row.task.id)!.repeat ===
                      "once"
                        ? "Edit"
                        : "Edit series"}
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
