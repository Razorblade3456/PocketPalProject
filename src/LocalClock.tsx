import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

/** Device-local time, independent of the room's selected visual theme. */
export function LocalClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="local-clock" title="Your device's local time">
      <span className="clock-icon"><Clock3 size={18} strokeWidth={1.5} /></span>
      <div>
        <span className="clock-caption">HERE & NOW</span>
        <time dateTime={now.toISOString()} aria-label={"Local time: " + time + ", " + date}>{time}</time>
        <span className="clock-date">{date}</span>
      </div>
    </div>
  );
}
