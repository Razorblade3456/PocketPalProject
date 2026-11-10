import { googleCalendarUrl, downloadCalendar } from "./calendarExport";
import { Jar } from "./Jar";
import { jarBalls } from "./jarModel";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronLeft, ChevronRight, Pencil, CalendarPlus } from "lucide-react";
import {
  addVacationRange,
  calendarDays,
  dateKey,
  isVacationDay,
  localDate,
  removeVacationDay,
  type State,
  type Task,
} from "./model";
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
  onVacationChange,
}: {
  s: State;
  today?: string;
  onEdit?: (task: Task) => void;
  onAdd?: (date: string) => void;
  onVacationChange?: Dispatch<SetStateAction<State>>;
}) {
  const [selected, setSelected] = useState(today),
    [month, setMonth] = useState(() => calendarMonth(today)),
    [expanded, setExpanded] = useState(false);
  const [vacationStart, setVacationStart] = useState(today),
    [vacationEnd, setVacationEnd] = useState(today),
    [vacationNotice, setVacationNotice] = useState("");
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
  const selectedIsVacation = isVacationDay(s, selected);
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
  const markSelectedVacation = () => {
    if (selected < today) {
      setVacationNotice(
        "Past dates are locked because their task outcomes may already be settled.",
      );
      return;
    }
    onVacationChange?.((p) => addVacationRange(p, selected, selected));
    setVacationNotice("Vacation day saved.");
  };
  const markVacationPeriod = () => {
    if (!vacationStart || !vacationEnd) {
      setVacationNotice("Choose both a start and end date.");
      return;
    }
    if (vacationStart < today || vacationEnd < today) {
      setVacationNotice("Vacation dates can only be added for today or later.");
      return;
    }
    if (Math.abs(calendarDays(vacationEnd, vacationStart)) > 365) {
      setVacationNotice("Choose a vacation period no longer than one year.");
      return;
    }
    onVacationChange?.((p) =>
      addVacationRange(p, vacationStart, vacationEnd, +localDate(today)),
    );
    setVacationNotice("Vacation dates saved.");
  };
  const removeSelectedVacation = () => {
    if (selected < today) {
      setVacationNotice(
        "Past vacation dates are locked because task outcomes may already be settled.",
      );
      return;
    }
    onVacationChange?.((p) => removeVacationDay(p, selected, +localDate(today)));
    setVacationNotice("Vacation day removed.");
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
                (date === today ? ", today" : "") +
                (isVacationDay(s, date) ? ", vacation day" : "") +
                ", " +
                byDate.get(date)!.length +
                " tasks, " +
                byDate.get(date)!.filter((r) => r.completed).length +
                " completed"
              }
              onClick={() => {
                setSelected(date);
                setExpanded(true);
                if (date >= today) {
                  setVacationStart(date);
                  setVacationEnd(date);
                }
              }}
            >
              <span className="calendar-date">
                {localDate(date).getDate()}
                {isVacationDay(s, date) && (
                  <small className="calendar-vacation-mark" aria-hidden="true">
                    ☾
                  </small>
                )}
              </span>
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
        {selectedIsVacation && (
          <p className="calendar-vacation-message">
            Vacation Day — tasks can rest today.
          </p>
        )}
        {onVacationChange && (
          <div className="calendar-vacation-tools">
            {selectedIsVacation ? (
              <button
                type="button"
                className="calendar-vacation-action"
                onClick={removeSelectedVacation}
                disabled={selected < today}
              >
                Remove Vacation
              </button>
            ) : (
              <button
                type="button"
                className="calendar-vacation-action"
                onClick={markSelectedVacation}
                disabled={selected < today}
              >
                ☾ Mark Vacation Day
              </button>
            )}
            {selected < today && (
              <small>Past dates are locked to protect settled task history.</small>
            )}
            <details className="calendar-vacation-range">
              <summary>Mark a vacation period</summary>
              <div>
                <label>
                  Start
                  <input
                    type="date"
                    min={today}
                    value={vacationStart}
                    onChange={(e) => setVacationStart(e.target.value)}
                  />
                </label>
                <label>
                  End
                  <input
                    type="date"
                    min={today}
                    value={vacationEnd}
                    onChange={(e) => setVacationEnd(e.target.value)}
                  />
                </label>
                <button type="button" onClick={markVacationPeriod}>
                  Save Vacation Period
                </button>
              </div>
            </details>
            {vacationNotice && (
              <small className="calendar-vacation-notice" role="status">
                {vacationNotice}
              </small>
            )}
          </div>
        )}
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
                    {row.deadline ? " · " + row.deadline : ""}
                    {row.goal > 1
                      ? " · " + row.count + "/" + row.goal + " Done"
                      : row.goal === 0
                        ? " · " + row.count + " tracked"
                        : ""}
                    {row.missed > 0 ? " · " + row.missed + " missed" : ""}
                  </span>
                </div>
                <details className="calendar-export">
                  <summary
                    aria-label={"Add to Calendar: " + row.task.name}
                    title="Add to Calendar"
                  >
                    <CalendarPlus size={15} aria-hidden="true" />
                  </summary>
                  <div>
                    <a
                      href={googleCalendarUrl(s, row.task, selected)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Google Calendar
                    </a>
                    <button
                      type="button"
                      onClick={() => downloadCalendar(s, row.task, selected)}
                    >
                      Download Calendar File (.ics)
                    </button>
                    <small>
                      Open the .ics file in Calendar. On iPhone, save to Files
                      and use a compatible calendar app; import options vary.
                      Timed exports use a 15-minute placeholder.
                    </small>
                  </div>
                </details>
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
        <p className="calendar-export-note">
          Calendar export is one-way. Changes in PocketPal won't automatically
          update previously exported events.
        </p>
        {expanded && <HistoricalJar s={s} date={selected} today={today} />}
      </details>
    </section>
  );
}

/** Calendar-only read-only preview; never schedule or mutate state while viewing. */
export function HistoricalJar({
  s,
  date,
  today,
}: {
  s: State;
  date: string;
  today: string;
}) {
  if (date >= today) return null;
  const balls = jarBalls(s, date);
  if (!balls.length)
    return (
      <p className="historical-jar-empty">
        {s.outcomes.some((o) => o.date === date)
          ? "No visible jar entries · task history is preserved"
          : "No recorded activity"}
      </p>
    );
  const missed = balls.filter((b) => b.missed).length;
  return (
    <section
      className="historical-jar"
      aria-label={"Historical progress jar for " + dayLabel(date)}
    >
      <h3>Historical progress jar</h3>
      <time dateTime={date}>{dayLabel(date)}</time>
      <p>
        {balls.length - missed} completed <span aria-hidden="true">·</span>{" "}
        {missed} missed
      </p>
      <Jar balls={balls} small staticPreview />
    </section>
  );
}
