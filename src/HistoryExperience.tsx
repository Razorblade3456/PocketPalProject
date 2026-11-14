import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Skull,
  Star,
  Trophy,
} from "lucide-react";
import { Jar } from "./Jar";
import { HistoricalJar } from "./TaskCalendar";
import { OutcomeHistory } from "./TaskOutcomes";
import { calendarDaysForMonth, calendarMonth } from "./calendarModel";
import {
  dateKey,
  isVacationDay,
  localDate,
  type OutcomeStatus,
  type State,
} from "./model";
import {
  jarBalls,
  normalizeJarPriority,
  priorityBallColors,
  type JarBall,
} from "./jarModel";

type HistoryTab = "jars" | "activity" | "insights";
const achievementInfo = [
  ["First Meal", "Complete your first task."],
  ["Hydration Hero", "Complete 10 water tasks."],
  ["Best Buddies", "Participate on 7 different days."],
  ["Full Jar", "Complete all planned tasks in a day."],
  ["Zombie Survivor", "Recover from a zombie or critical stage."],
] as const;

const formatDate = (
  date: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  },
) => localDate(date).toLocaleDateString(undefined, options);
const monthTitle = (month: string) =>
  localDate(month).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

function MonthNavigation({
  month,
  today,
  onChange,
}: {
  month: string;
  today: string;
  onChange: (month: string) => void;
}) {
  const previous = calendarMonth(month, -1);
  const next = calendarMonth(month, 1);
  return (
    <div className="history-month-nav" aria-label="Choose month">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onChange(previous)}
      >
        <ChevronLeft size={17} />
      </button>
      <strong>{monthTitle(month)}</strong>
      <button
        type="button"
        aria-label="Next month"
        disabled={next > calendarMonth(today)}
        onClick={() => onChange(next)}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}

export function HistoryExperience({
  s,
  today = dateKey(),
  onCorrect,
  onDelete,
}: {
  s: State;
  today?: string;
  onCorrect: (id: string, status: OutcomeStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [tab, setTab] = useState<HistoryTab>("jars");
  const [jarDate, setJarDate] = useState(today);
  const [activityDate, setActivityDate] = useState(today);
  const [month, setMonth] = useState(calendarMonth(today));
  const [recordsOpen, setRecordsOpen] = useState(false);
  const trackedTasks = useMemo(
    () => new Set(s.tasks.map((task) => task.id)),
    [s.tasks],
  );
  const recentDates = useMemo(() => {
    const dates = new Set([today]);
    for (const completion of s.completions)
      if (trackedTasks.has(completion.taskId)) dates.add(completion.date);
    for (const outcome of s.outcomes)
      if (
        trackedTasks.has(outcome.taskId) &&
        outcome.status === "missed" &&
        !outcome.deleted
      )
        dates.add(outcome.date);
    return [...dates]
      .filter((date) => date <= today)
      .sort()
      .reverse()
      .slice(0, 5);
  }, [s.completions, s.outcomes, trackedTasks, today]);
  const selectedBalls = useMemo(
    () => jarBalls(s, jarDate),
    [s.tasks, s.completions, s.outcomes, jarDate],
  );
  const selectedOutcomes = useMemo(
    () =>
      s.outcomes.filter(
        (outcome) => outcome.date === jarDate && !outcome.deleted,
      ),
    [s.outcomes, jarDate],
  );
  const selectedBallRecords = useMemo(
    () =>
      selectedBalls.map((ball, index) => ({
        ball,
        key: ball.ballId || ball.id || `${ball.taskId}-${ball.at}-${index}`,
        outcome: selectedOutcomes.find(
          (outcome) =>
            (!!ball.ballId && outcome.ballId === ball.ballId) ||
            (!!ball.id && outcome.id === ball.id),
        ),
      })),
    [selectedBalls, selectedOutcomes],
  );
  const recentJars = useMemo(
    () => recentDates.map((date) => ({ date, balls: jarBalls(s, date) })),
    [recentDates, s.tasks, s.completions, s.outcomes],
  );
  const monthDays = useMemo(() => calendarDaysForMonth(month), [month]);
  const monthActivity = useMemo(() => {
    const byDate = new Map<string, { completed: number; missed: number }>();
    const earlyForScheduledDate = new Map<string, number>();
    const completionsByPriority: Record<"high" | "normal" | "low", number> = {
      high: 0,
      normal: 0,
      low: 0,
    };
    let completed = 0;
    let missed = 0;
    let earlyBird = 0;
    for (const outcome of s.outcomes) {
      if (outcome.deleted) continue;
      if (
        outcome.status === "completed" &&
        outcome.scheduledDate &&
        outcome.earlyBirdBonusCoins
      ) {
        earlyForScheduledDate.set(
          outcome.scheduledDate,
          (earlyForScheduledDate.get(outcome.scheduledDate) || 0) + 1,
        );
      }
      if (
        !outcome.date.startsWith(month) ||
        (outcome.status !== "completed" && outcome.status !== "missed")
      )
        continue;
      const activity = byDate.get(outcome.date) || { completed: 0, missed: 0 };
      if (outcome.status === "completed") {
        activity.completed++;
        completed++;
        completionsByPriority[normalizeJarPriority(outcome.task.priority)]++;
        if (outcome.earlyBirdBonusCoins) earlyBird++;
      } else {
        activity.missed++;
        missed++;
      }
      byDate.set(outcome.date, activity);
    }
    const activeDays = [...byDate.entries()]
      .filter(([, counts]) => counts.completed > 0)
      .sort(
        (a, b) => b[1].completed - a[1].completed || a[0].localeCompare(b[0]),
      );
    return {
      byDate,
      earlyForScheduledDate,
      completionsByPriority,
      completed,
      missed,
      earlyBird,
      mostActive: activeDays[0],
      activeDayCount: activeDays.length,
    };
  }, [s.outcomes, month]);

  const moveJarDate = (offset: number) => {
    const d = localDate(jarDate);
    d.setDate(d.getDate() + offset);
    const next = dateKey(+d);
    if (next <= today) setJarDate(next);
  };
  const moveMonth = (offset: number) => {
    const next = calendarMonth(month, offset);
    if (next > calendarMonth(today)) return;
    setMonth(next);
    setActivityDate(next === calendarMonth(today) ? today : next);
  };
  const openJarForActivity = () => {
    setJarDate(activityDate);
    setTab("jars");
  };
  const totalPriority = Object.values(
    monthActivity.completionsByPriority,
  ).reduce((sum, count) => sum + count, 0);

  return (
    <section className="history-experience" aria-labelledby="history-title">
      <span className="eyebrow">A COLLECTION OF GOOD DAYS</span>
      <h2 id="history-title">History</h2>
      <div className="history-tabs" role="tablist" aria-label="History views">
        {(
          [
            ["jars", "Jars"],
            ["activity", "Activity"],
            ["insights", "Insights"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`history-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`history-panel-${key}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "jars" && (
        <section
          id="history-panel-jars"
          role="tabpanel"
          aria-labelledby="history-tab-jars"
          className="history-view jar-shelf-view"
        >
          <div className="jar-shelf-heading">
            <div>
              <span className="history-kicker">YOUR DAILY PROGRESS</span>
              <h3>Jar Shelf</h3>
            </div>
            <div className="history-date-controls">
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => moveJarDate(-1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                aria-label="Next day"
                disabled={jarDate >= today}
                onClick={() => moveJarDate(1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          <label className="history-date-picker">
            <CalendarDays size={15} aria-hidden="true" />
            <span>Choose a date</span>
            <input
              type="date"
              value={jarDate}
              max={today}
              onChange={(e) =>
                e.target.value <= today && setJarDate(e.target.value)
              }
            />
          </label>
          <div className="history-selected-date">{formatDate(jarDate)}</div>
          <div className="history-jar-counts" aria-label="Selected jar counts">
            <span>
              <Check size={13} />{" "}
              {selectedBalls.filter((ball) => !ball.missed).length} completed
            </span>
            <span>
              <Skull size={13} />{" "}
              {selectedBalls.filter((ball) => ball.missed).length} missed
            </span>
          </div>
          <HistoricalJar
            s={s}
            date={jarDate}
            today={today}
            small={false}
            allowToday
            showEmptyJar
            interactive
            motionEnabled={s.settings.motion}
            soundEnabled={s.settings.sound}
          />
          {selectedBalls.length > 0 && s.settings.motion && (
            <p className="history-jar-interaction-hint">
              Tap or lightly drag a ball to nudge the jar.
            </p>
          )}

          {selectedBallRecords.length > 0 && (
            <details className="history-inspect-jar">
              <summary>
                Inspect this jar · {selectedBallRecords.length} entries
              </summary>
              <ul>
                {selectedBallRecords.map(({ ball, key, outcome }) => {
                  const priority = normalizeJarPriority(ball.priority);
                  return (
                    <li key={key} className={ball.missed ? "is-missed" : ""}>
                      <span
                        className="history-priority-dot"
                        style={{
                          background: ball.missed
                            ? "#25232a"
                            : priorityBallColors[priority],
                        }}
                      />
                      <span className="history-inspect-name">
                        <strong>{ball.name}</strong>
                        <small>
                          {ball.missed ? "Missed" : "Completed"} · {priority}{" "}
                          priority
                        </small>
                      </span>
                      {outcome?.earlyBirdBonusCoins ? (
                        <span className="history-early-tag">
                          <Star size={12} /> Early Bird
                        </span>
                      ) : null}
                      {ball.missed && (
                        <Skull
                          className="history-inspect-skull"
                          size={15}
                          aria-label="Missed"
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="history-record-note">
                Automatic missed goals remain available in Manage History &amp;
                Records and do not create jar balls.
              </p>
            </details>
          )}

          <div className="history-recent-heading">
            <h4>Recent jars</h4>
            <span>Choose a day to revisit</span>
          </div>
          <div className="history-recent-jars">
            {recentJars.map(({ date, balls }) => (
              <button
                type="button"
                key={date}
                className={date === jarDate ? "is-selected" : ""}
                aria-pressed={date === jarDate}
                aria-label={`${formatDate(date, { month: "short", day: "numeric" })}: ${balls.filter((ball) => !ball.missed).length} completed jar balls, ${balls.filter((ball) => ball.missed).length} missed`}
                onClick={() => setJarDate(date)}
              >
                <Jar balls={balls} small staticPreview />
                <span>
                  {formatDate(date, { month: "short", day: "numeric" })}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === "activity" && (
        <section
          id="history-panel-activity"
          role="tabpanel"
          aria-labelledby="history-tab-activity"
          className="history-view"
        >
          <div className="history-view-heading">
            <div>
              <span className="history-kicker">YOUR MONTH AT A GLANCE</span>
              <h3>Activity</h3>
            </div>
            <MonthNavigation
              month={month}
              today={today}
              onChange={(value) => moveMonth(value < month ? -1 : 1)}
            />
          </div>
          <div
            className="history-activity-calendar"
            role="grid"
            aria-label={`${monthTitle(month)} task activity`}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span role="columnheader" className="history-weekday" key={day}>
                {day}
              </span>
            ))}
            {monthDays.map((date, index) => {
              if (!date)
                return (
                  <span
                    role="gridcell"
                    className="history-day-blank"
                    key={`blank-${index}`}
                  />
                );
              const activity = monthActivity.byDate.get(date) || {
                completed: 0,
                missed: 0,
              };
              const early = monthActivity.earlyForScheduledDate.get(date) || 0;
              const vacation = isVacationDay(s, date);
              const future = date > today;
              const intensity = Math.min(4, activity.completed);
              return (
                <button
                  type="button"
                  role="gridcell"
                  key={date}
                  disabled={future}
                  aria-pressed={activityDate === date}
                  aria-label={`${formatDate(date)}: ${activity.completed} completed entries, ${activity.missed} missed outcomes${early ? `, ${early} completed early for this day` : ""}${vacation ? ", vacation day" : ""}`}
                  className={`history-activity-day intensity-${intensity}${activity.missed ? " has-missed" : ""}${vacation ? " is-vacation" : ""}${activityDate === date ? " is-selected" : ""}${future ? " is-future" : ""}`}
                  onClick={() => setActivityDate(date)}
                >
                  <span>{localDate(date).getDate()}</span>
                  <span className="history-day-markers" aria-hidden="true">
                    {vacation && (
                      <span className="history-vacation-mark">☾</span>
                    )}
                    {activity.missed > 0 && <Skull size={11} />}
                    {!activity.missed && early > 0 && <Star size={10} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="history-activity-legend">
            <span>
              <i className="intensity-0" /> Quiet
            </span>
            <span>
              <i className="intensity-2" /> Completions
            </span>
            <span>
              <Skull size={12} /> Missed
            </span>
            <span>
              <span className="history-vacation-mark">☾</span> Vacation
            </span>
            <span>
              <Star size={11} /> Early Bird
            </span>
          </div>
          <div className="history-activity-summary">
            <div>
              <span className="history-kicker">SELECTED DAY</span>
              <h4>{formatDate(activityDate)}</h4>
              <p>
                {monthActivity.byDate.get(activityDate)?.completed || 0}{" "}
                completed entries ·{" "}
                {monthActivity.byDate.get(activityDate)?.missed || 0} missed
                outcomes
              </p>
              {(monthActivity.earlyForScheduledDate.get(activityDate) || 0) >
                0 && (
                <small>
                  {monthActivity.earlyForScheduledDate.get(activityDate)}{" "}
                  task(s) completed early for this date.
                </small>
              )}
              {isVacationDay(s, activityDate) && (
                <small className="history-vacation-note">
                  Vacation day · tasks can rest.
                </small>
              )}
            </div>
            <button
              type="button"
              className="history-open-jar"
              onClick={openJarForActivity}
            >
              Open this day’s jar
            </button>
          </div>
        </section>
      )}

      {tab === "insights" && (
        <section
          id="history-panel-insights"
          role="tabpanel"
          aria-labelledby="history-tab-insights"
          className="history-view"
        >
          <div className="history-view-heading">
            <div>
              <span className="history-kicker">SMALL STEPS ADD UP</span>
              <h3>Insights</h3>
            </div>
            <MonthNavigation
              month={month}
              today={today}
              onChange={(value) => moveMonth(value < month ? -1 : 1)}
            />
          </div>
          {monthActivity.completed + monthActivity.missed === 0 ? (
            <div className="history-insights-empty">
              <CalendarDays size={25} aria-hidden="true" />
              <p>No recorded task activity in {monthTitle(month)} yet.</p>
              <small>
                Quiet days stay quiet; only saved outcomes appear here.
              </small>
            </div>
          ) : (
            <>
              <div className="history-metric-grid">
                <article>
                  <span>Completed entries</span>
                  <strong>{monthActivity.completed}</strong>
                  <small>Recorded completion attempts</small>
                </article>
                <article>
                  <span>Missed outcomes</span>
                  <strong>{monthActivity.missed}</strong>
                  <small>Manual and automatic records</small>
                </article>
                <article>
                  <span>Early Bird</span>
                  <strong>{monthActivity.earlyBird}</strong>
                  <small>Eligible early completions</small>
                </article>
                <article>
                  <span>Most active day</span>
                  <strong>
                    {monthActivity.activeDayCount >= 2 &&
                    monthActivity.mostActive
                      ? localDate(
                          monthActivity.mostActive[0],
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </strong>
                  <small>
                    {monthActivity.activeDayCount >= 2 &&
                    monthActivity.mostActive
                      ? `${monthActivity.mostActive[1].completed} completed entries`
                      : "More active days needed"}
                  </small>
                </article>
              </div>
              <section
                className="history-priority-breakdown"
                aria-label="Completion entries by priority"
              >
                <h4>Completions by priority</h4>
                <p>Recorded entries, not unique tasks.</p>
                <div
                  className="history-priority-bar"
                  role="img"
                  aria-label={`${monthActivity.completionsByPriority.high} high, ${monthActivity.completionsByPriority.normal} normal, ${monthActivity.completionsByPriority.low} low priority completion entries`}
                >
                  {(["high", "normal", "low"] as const).map((priority) => (
                    <span
                      key={priority}
                      style={{
                        width: `${totalPriority ? (monthActivity.completionsByPriority[priority] / totalPriority) * 100 : 0}%`,
                        background: priorityBallColors[priority],
                      }}
                    />
                  ))}
                </div>
                <div className="history-priority-legend">
                  {(["high", "normal", "low"] as const).map((priority) => (
                    <span key={priority}>
                      <i style={{ background: priorityBallColors[priority] }} />
                      {priority} ·{" "}
                      {monthActivity.completionsByPriority[priority]}
                    </span>
                  ))}
                </div>
              </section>
            </>
          )}
        </section>
      )}

      <details className="history-achievements">
        <summary>
          <Trophy size={16} />
          <span>
            Achievements{" "}
            <small>{s.achievements.length} earned · optional</small>
          </span>
        </summary>
        <div className="history-badges">
          {achievementInfo.map(([name, description]) => {
            const earned = s.achievements.includes(name);
            return (
              <details
                className={`history-badge${earned ? " is-earned" : " is-locked"}`}
                key={name}
              >
                <summary>
                  <Trophy size={14} />
                  <span>
                    {name}
                    <small>{earned ? "Earned" : "Locked"}</small>
                  </span>
                  {earned && <Check size={13} />}
                </summary>
                <p>{description}</p>
              </details>
            );
          })}
        </div>
      </details>

      <details
        className="history-records"
        onToggle={(event) => setRecordsOpen(event.currentTarget.open)}
      >
        <summary>
          <CalendarDays size={16} />
          <span>
            Manage History &amp; Records
            <small>
              Corrections, habit events, coins, and care transactions
            </small>
          </span>
          <ChevronRight size={15} />
        </summary>
        {recordsOpen && (
          <OutcomeHistory s={s} onCorrect={onCorrect} onDelete={onDelete} />
        )}
      </details>
    </section>
  );
}
