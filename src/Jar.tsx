import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { rewardKey, type Category } from "./model";
import { Skull } from "lucide-react";
import { jarBalls, priorityBallColors, type JarBall } from "./jarModel";
export { jarBalls };
const ballStyle = (b: Pick<JarBall, "priority" | "missed">) =>
  b.missed
    ? { background: "#25232a", border: "1px solid #79747f", color: "#eee7db" }
    : b.priority
      ? { background: priorityBallColors[b.priority] }
      : undefined;
export type RewardSource = { x: number; y: number };
export type JarFlight = {
  token: string;
  key: string;
  category: Category;
  priority?: JarBall["priority"];
  missed?: boolean;
  source: RewardSource;
};
export function Jar({
  balls,
  small = false,
  staticPreview = false,
  jarRef,
  incoming = [],
  landed,
  pulse = 0,
}: {
  balls: JarBall[];
  small?: boolean;
  staticPreview?: boolean;
  jarRef?: Ref<HTMLDivElement>;
  incoming?: string[];
  landed?: string;
  pulse?: number;
}) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  useEffect(() => {
    if (pulse && !small && !reduce && !staticPreview)
      void controls.start({
        rotate: [0, -3, 2, -1, 0],
        y: [0, 2, 0],
        transition: { duration: 0.55 },
      });
  }, [pulse, small, reduce, controls, staticPreview]);
  return (
    <motion.div
      style={
        {
          "--jar-ball-size":
            Math.max(
              1,
              Math.min(
                small ? 12 : 24,
                Math.floor(
                  Math.sqrt(
                    (small ? 64 * 70 : 128 * 145) / Math.max(1, balls.length),
                  ),
                ) - (balls.length > 100 ? 0 : 2),
              ),
            ) + "px",
          "--jar-ball-gap": balls.length > 100 ? "0px" : "2px",
        } as import("react").CSSProperties
      }
      ref={jarRef}
      animate={staticPreview ? undefined : controls}
      className={`jar ${small ? "mini" : ""} ${staticPreview ? "static-jar" : ""}`}
    >
      <motion.div
        className="jar-lid"
        initial={staticPreview ? false : undefined}
        animate={
          staticPreview
            ? undefined
            : !small && incoming.length && !reduce
              ? { x: 48, y: -28, rotate: 18 }
              : { x: 0, y: 0, rotate: 0 }
        }
        transition={{ duration: 0.25 }}
      />
      <div className="jar-neck" />
      <div className="jar-glass">
        <div className="glass-shine" />
        <div className="balls">
          {balls.map((b) => {
            const key = rewardKey(b),
              hidden = incoming.includes(key);
            return (
              <motion.span
                style={ballStyle(b)}
                title={
                  b.missed
                    ? "Missed: " + b.name
                    : (b.priority || "Recorded") + ": " + b.name
                }
                data-ball-key={key}
                key={key}
                className={`ball ${b.category} ${hidden ? "incoming-ball" : ""}`}
                initial={false}
                animate={
                  staticPreview
                    ? undefined
                    : landed === key && !small
                      ? { y: [-10, 0, -5, 0] }
                      : { y: 0 }
                }
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {b.missed && <Skull className="jar-skull" aria-hidden="true" />}
              </motion.span>
            );
          })}
        </div>
        <span className="jar-label">
          {balls.some((b) => b.missed) ? "recorded" : "completed"}
        </span>
      </div>
    </motion.div>
  );
}
function Flight({
  flight,
  jar,
  onLand,
  enabled,
}: {
  flight: JarFlight;
  jar: HTMLDivElement | null;
  onLand: (flight: JarFlight) => void;
  enabled: boolean;
}) {
  const reduce = useReducedMotion();
  const [points, setPoints] = useState<{ x: number[]; y: number[] } | null>(
    null,
  );
  const finish = useRef(onLand);
  finish.current = onLand;
  const completed = useRef(false);
  const completeOnce = () => {
    if (completed.current) return;
    completed.current = true;
    finish.current(flight);
  };
  useLayoutEffect(() => {
    if (!jar || !enabled || reduce) {
      completeOnce();
      return;
    }
    const target = Array.from(
      jar.querySelectorAll<HTMLElement>("[data-ball-key]"),
    ).find((el) => el.dataset.ballKey === flight.key);
    const j = jar.getBoundingClientRect(),
      r = target?.getBoundingClientRect();
    const sx = flight.source.x - 12,
      sy = flight.source.y - 12,
      mx = j.left + j.width / 2 - 12,
      top = j.top + 23,
      tx = r ? r.left + r.width / 2 - 12 : mx,
      ty = r ? r.top + r.height / 2 - 22 : j.bottom - 42;
    setPoints({
      x: [sx, sx + 20, (sx + mx) / 2, mx, mx, tx],
      y: [sy, sy - 35, Math.min(sy, top) - 85, top - 35, top, ty],
    });
  }, [flight, jar, enabled, reduce]);
  useEffect(() => {
    const cancel = () => completeOnce();
    window.addEventListener("resize", cancel);
    window.addEventListener("scroll", cancel, { once: true });
    return () => {
      window.removeEventListener("resize", cancel);
      window.removeEventListener("scroll", cancel);
    };
  }, [flight]);
  if (!points) return null;
  return (
    <motion.span
      aria-hidden="true"
      style={ballStyle(flight)}
      data-reward-flight={flight.key}
      className={`reward-ball-flight ball ${flight.category}`}
      initial={{ x: points.x[0], y: points.y[0], scale: 0.7, opacity: 0 }}
      animate={{
        x: points.x,
        y: points.y,
        scale: [0.7, 1, 1, 1, 1, 1],
        opacity: [0, 1, 1, 1, 1, 1],
      }}
      transition={{
        duration: 1.35,
        times: [0, 0.12, 0.4, 0.65, 0.77, 1],
        ease: "easeInOut",
      }}
      onAnimationComplete={() => completeOnce()}
    >
      {flight.missed && <Skull className="jar-skull" />}
    </motion.span>
  );
}
export function RewardFlights({
  flights,
  jar,
  onLand,
  enabled,
}: {
  flights: JarFlight[];
  jar: HTMLDivElement | null;
  onLand: (flight: JarFlight) => void;
  enabled: boolean;
}) {
  return (
    <>
      {flights.map((f) => (
        <Flight
          key={f.token}
          flight={f}
          jar={jar}
          onLand={onLand}
          enabled={enabled}
        />
      ))}
    </>
  );
}
