import { AlarmCountdown } from "./AlarmCountdown";
import { nearestAlarm, type AlarmRecord } from "./alarms";
import { useEffect, useState } from "react";
import { Apple, Droplets, Sparkles, Heart } from "lucide-react";
import { Pet } from "./Pets";
import type { State, Supply } from "./model";
import {
  miniIdleChoices,
  miniIdleDelay,
  nextMiniIdle,
  type MiniIdle,
} from "./miniIdle";
const indicators = [
  { key: "food", label: "Food", Icon: Apple, color: "#bda572" },
  { key: "water", label: "Water", Icon: Droplets, color: "#87b8c4" },
  { key: "clean", label: "Cleanliness", Icon: Sparkles, color: "#b2a0c6" },
  { key: "happy", label: "Happiness", Icon: Heart, color: "#cf99ad" },
] as const;
export function MiniPet({
  s,
  level,
  sleep,
  calm,
  host,
  feeding,
  reaction = "",
  alarms,
}: {
  s: State;
  level: number;
  sleep: boolean;
  calm: boolean;
  host: Window;
  feeding?: Supply | null;
  reaction?: string;
  alarms?: AlarmRecord[];
}) {
  const [stats, setStats] = useState(false);
  const [idle, setIdle] = useState<MiniIdle | null>(null);
  const [paused, setPaused] = useState(true);
  const choices = miniIdleChoices(s.pet, s.care, level, sleep).join(",");
  const blocked = !!feeding || !!reaction;
  const slow = calm || level > 0;
  useEffect(() => {
    const media = host.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    let previous: MiniIdle | null = null;
    let disposed = false;
    const cancel = () => {
      host.clearTimeout(timer);
      setIdle(null);
    };
    const schedule = () => {
      timer = host.setTimeout(() => {
        if (disposed) return;
        const next = nextMiniIdle(
          choices ? (choices.split(",") as MiniIdle[]) : [],
          previous,
        );
        previous = next;
        setIdle(next);
        timer = host.setTimeout(
          () => {
            if (!disposed) {
              setIdle(null);
              schedule();
            }
          },
          slow ? 3000 : 2400,
        );
      }, miniIdleDelay());
    };
    const refresh = () => {
      cancel();
      const inactive =
        host.document.hidden || media.matches || !s.settings.motion;
      setPaused(inactive);
      if (!inactive && !blocked && choices) schedule();
    };
    refresh();
    host.document.addEventListener("visibilitychange", refresh);
    media.addEventListener("change", refresh);
    return () => {
      disposed = true;
      host.clearTimeout(timer);
      host.document.removeEventListener("visibilitychange", refresh);
      media.removeEventListener("change", refresh);
    };
  }, [host, s.pet, s.settings.motion, choices, blocked, slow]);
  const alarm = nearestAlarm(alarms);
  const fitWindow = (showStats: boolean) => {
    if (!host.document.body.classList.contains("mini-mochi-window")) return;
    const height = 140 + (alarm ? 28 : 0) + (showStats ? 24 : 0);
    try {
      if (Math.abs(host.innerHeight - height) > 1)
        host.resizeBy(0, height - host.innerHeight);
    } catch {
      /* Browsers may restrict resizing; flex layout keeps the pet unobstructed. */
    }
  };
  useEffect(() => {
    fitWindow(stats);
  }, [host, !!alarm, stats]);
  const active = !paused && !blocked && !sleep && level !== 5 ? idle : null;
  return (
    <div className="mini-pet-stack">
      <div
        className="mini-mochi-pet-area mini-idle"
        data-mini-idle={active || "rest"}
        data-mini-paused={paused}
        data-mini-slow={slow}
      >
        <Pet
          kind={s.pet}
          care={s.care}
          equipped={s.equipped}
          level={level}
          sleep={sleep}
          calm={calm}
          feeding={feeding}
          reaction={reaction}
          onPet={() => {
            fitWindow(!stats);
            setStats((v) => !v);
          }}
        />
        {active === "smoke" && (
          <svg className="mini-smoke" viewBox="0 0 320 340" aria-hidden="true">
            <ellipse
              cx="166"
              cy="185"
              rx="10"
              ry="4"
              fill="none"
              stroke="#ad83c5"
              strokeWidth="3"
            />
          </svg>
        )}
      </div>
      {(alarm || stats) && (
        <div className="mini-pet-info">
          <AlarmCountdown
            compact
            alarm={alarm}
            name={s.tasks.find((t) => t.id === alarm?.taskId)?.name}
          />
          {stats && (
            <div className="mini-stats" aria-label="Pet care stats">
              {indicators.map(({ key, label, Icon, color }) => (
                <div
                  className="mini-stat"
                  key={key}
                  title={`${label}: ${Math.round(s.care[key])}%`}
                >
                  <Icon size={10} aria-hidden="true" style={{ color }} />
                  <progress
                    aria-label={label}
                    max={100}
                    value={s.care[key]}
                    style={
                      {
                        accentColor: color,
                        "--mini-stat-color": color,
                      } as import("react").CSSProperties
                    }
                  />
                  <span className="mini-stat-value">
                    {Math.round(s.care[key])}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
