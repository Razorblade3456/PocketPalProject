import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Bell } from "lucide-react";
import type { State } from "./model";
import { alarmQueue, dismissAlarm, quietNow, reconcileAlarms } from "./alarms";
import "./alarms.css";

export function useImportantAlarms(
  s: State,
  setS: Dispatch<SetStateAction<State>>,
  now: number,
) {
  const opened = useRef(Date.now());
  const [check, setCheck] = useState(now),
    [enabled, setEnabled] = useState(false),
    [testing, setTesting] = useState(false);
  const audio = useRef<AudioContext | null>(null),
    master = useRef<GainNode | null>(null),
    loop = useRef<ReturnType<typeof setInterval> | null>(null);
  const notified = useRef(new Set<string>());
  const at = Math.max(now, check),
    ready = reconcileAlarms(s, at),
    queue = alarmQueue(ready),
    current = queue[0];
  const task = s.tasks.find((t) => t.id === current?.taskId);
  const quiet = quietNow(s.settings, at) && !task?.alarmOverrideQuiet;
  const volume = s.settings.alarmVolume ?? 0.35;
  const silence = () => {
    if (loop.current) clearInterval(loop.current);
    loop.current = null;
    if (master.current) master.current.gain.value = 0;
  };
  useEffect(() => {
    if (ready !== s) setS((p) => reconcileAlarms(p, at));
    const next = (ready.alarms || [])
      .filter((a) => a.status === "pending")
      .reduce((min, a) => Math.min(min, a.dueAt), Infinity);
    // Existing app clock/focus catches throttling and sleep; this timeout gives precise snoozes.
    if (!Number.isFinite(next)) return;
    const timer = setTimeout(
      () => setCheck(Date.now()),
      Math.max(20, Math.min(next - Date.now(), 2147483647)),
    );
    return () => clearTimeout(timer);
  }, [s, at]);
  useEffect(() => {
    for (const alarm of queue) {
      const t = s.tasks.find((t) => t.id === alarm.taskId),
        key = alarm.id + ":" + alarm.dueAt;
      if (
        notified.current.has(key) ||
        alarm.dueAt < opened.current ||
        (quietNow(s.settings, at) && !t?.alarmOverrideQuiet)
      )
        continue;
      notified.current.add(key);
      if (
        s.settings.reminders &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification("PocketPal · Important Alarm", {
            body: t?.name || "Important task",
            tag: key,
            silent: true,
          });
        } catch {
          /* In-app alarm always remains available. */
        }
      }
    }
  }, [s, at]);
  useEffect(() => {
    silence();
    if (enabled && audio.current && audio.current.state !== "running") {
      setEnabled(false);
      return;
    }
    if (
      !enabled ||
      (!testing && (!current || quiet)) ||
      !audio.current ||
      audio.current.state !== "running" ||
      !master.current
    )
      return;
    const ctx = audio.current,
      gain = master.current;
    const pulse = () => {
      if (ctx.state !== "running") {
        setEnabled(false);
        return;
      }
      gain.gain.value = volume;
      [0, 0.24, 0.48].forEach((offset, i) => {
        const oscillator = ctx.createOscillator(),
          envelope = ctx.createGain(),
          start = ctx.currentTime + offset;
        oscillator.type = "sine";
        oscillator.frequency.value = i % 2 ? 740 : 554;
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(0.24, start + 0.015);
        envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
        oscillator.connect(envelope);
        envelope.connect(gain);
        oscillator.start(start);
        oscillator.stop(start + 0.2);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
      });
    };
    pulse();
    loop.current = setInterval(pulse, 2400);
    return silence;
  }, [enabled, testing, current?.id, current?.dueAt, quiet, volume]);
  useEffect(
    () => () => {
      silence();
      void audio.current?.close();
    },
    [],
  );
  async function enable() {
    try {
      if (audio.current?.state === "closed") {
        audio.current = null;
        master.current = null;
      }
      const ctx = audio.current || new AudioContext();
      audio.current = ctx;
      if (!master.current) {
        master.current = ctx.createGain();
        master.current.gain.value = 0;
        master.current.connect(ctx.destination);
      }
      await ctx.resume();
      setEnabled(ctx.state === "running");
    } catch {
      setEnabled(false);
    }
  }
  const act = (minutes: 0 | 5 | 10 | 30) => {
    silence();
    if (testing) {
      setTesting(false);
      return;
    }
    if (current)
      setS((p) =>
        dismissAlarm(reconcileAlarms(p, Date.now()), current.id, minutes),
      );
  };
  const settings = (
    <section className="alarm-settings" aria-label="Important alarm settings">
      <h3>
        <Bell size={14} /> Important alarms
      </h3>
      <div className="button-row">
        <button
          type="button"
          className="secondary"
          onClick={() => void enable()}
        >
          {enabled ? "Alarm sound enabled" : "Enable Alarm Sound"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            void enable();
            setTesting(true);
          }}
        >
          Test Alarm
        </button>
      </div>
      <label>
        Alarm volume{" "}
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={volume}
          onChange={(e) =>
            setS((p) => ({
              ...p,
              settings: { ...p.settings, alarmVolume: Number(e.target.value) },
            }))
          }
        />
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={!!s.settings.quietHours}
          onChange={(e) =>
            setS((p) => ({
              ...p,
              settings: { ...p.settings, quietHours: e.target.checked },
            }))
          }
        />
        Quiet hours · ordinary reminders stay silent
      </label>
      {s.settings.quietHours && (
        <div className="button-row">
          <label>
            Quiet from
            <input
              type="time"
              value={s.settings.quietStart || "21:00"}
              onChange={(e) => {
                if (e.target.value)
                  setS((p) => ({
                    ...p,
                    settings: { ...p.settings, quietStart: e.target.value },
                  }));
              }}
            />
          </label>
          <label>
            Until
            <input
              type="time"
              value={s.settings.quietEnd || "07:00"}
              onChange={(e) => {
                if (e.target.value)
                  setS((p) => ({
                    ...p,
                    settings: { ...p.settings, quietEnd: e.target.value },
                  }));
              }}
            />
          </label>
        </div>
      )}
      <p className="fine">
        Sound needs a click each time you open PocketPal. Alarms need this tab
        open; closed tabs, sleeping devices, and browser throttling can delay
        them. Use the existing reminders toggle for browser notification
        permission.
      </p>
    </section>
  );
  const popup =
    testing || current ? (
      <section
        className="important-alarm"
        role="region"
        aria-label="Important Alarm"
        aria-live="polite"
      >
        <div className="alarm-heading">
          <Bell size={18} aria-hidden="true" />
          <strong>{testing ? "Test Alarm" : "Important Alarm"}</strong>
          <small>
            {queue.length > 1 && !testing ? `1 / ${queue.length}` : ""}
          </small>
        </div>
        <h3>
          {testing
            ? "This is your alarm sound"
            : task?.name || "Important task"}
        </h3>
        <p>
          {testing ? (
            "Stop when you’re done testing."
          ) : (
            <>
              {new Date(current.scheduledAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {current.dueAt < opened.current || at - current.dueAt > 60000
                ? " · Overdue"
                : ""}
            </>
          )}
        </p>
        {!enabled && (
          <button
            type="button"
            className="alarm-enable"
            onClick={() => void enable()}
          >
            Enable Alarm Sound
          </button>
        )}
        {enabled && quiet && !testing && (
          <small>Quiet hours · sound paused for this task</small>
        )}
        {!testing && (
          <div className="alarm-snooze" aria-label="Snooze alarm">
            {([5, 10, 30] as const).map((m) => (
              <button type="button" key={m} onClick={() => act(m)}>
                Snooze {m}m
              </button>
            ))}
          </div>
        )}
        <button type="button" className="alarm-stop" onClick={() => act(0)}>
          Stop Alarm
        </button>
        <small>Stopping does not complete your task.</small>
      </section>
    ) : null;
  return { settings, popup, records: ready.alarms || [] };
}
