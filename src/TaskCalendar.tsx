import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dateKey, localDate, type State } from "./model";
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
}: {
  s: State;
  today?: string;
}) {
  const [selected, setSelected] = useState(today),
    [month, setMonth] = useState(() => calendarMonth(today));
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
  };
  return (
    <section className="task-calendar" aria-label="Task Calendar">
      <h2>Task Calendar</h2>
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
      <button
        type="button"
        className="calendar-today"
        onClick={() => {
          setMonth(calendarMonth(today));
          setSelected(today);
        }}
      >
        Today
      </button>
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
              onClick={() => setSelected(date)}
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
      <section
        className="calendar-selected"
        aria-live="polite"
        aria-label="Selected day tasks"
      >
        <h3>{dayLabel(selected)}</h3>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
