import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

/** Device-local time, independent of the room's selected visual theme. */
export function LocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      // The display is minute-precision, so wake once at the next minute edge.
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 10);
    };
    const tick = () => {
      setNow(new Date());
      schedule();
    };
    schedule();
    window.addEventListener("focus", tick);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="local-clock" title="Your device's local time">
      <span className="clock-icon"><Clock3 size={18} strokeWidth={1.5} /></span>
      <div>
        <span className="clock-caption">LOCAL TIME</span>
        <time dateTime={now.toISOString()} aria-label={"Local time: " + time + ", " + date}>{time}</time>
        <span className="clock-date">{date}</span>
      </div>
    </div>
  );
}
