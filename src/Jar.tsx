import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { rewardKey, type Category } from "./model";
import { Skull } from "lucide-react";
import { jarBalls, priorityBallColors, type JarBall } from "./jarModel";
import { playJarClink } from "./audioFeedback";
export { jarBalls };

export const canDragJarBalls = (count: number) => count <= 32;
export const clampJarDrag = (value: number, limit = 8) =>
  Math.max(-limit, Math.min(limit, value));
export function jarNeighborNudge(index: number, selected: number) {
  const distance = index - selected;
  if (!distance || Math.abs(distance) > 2) return { x: 0, y: 0 };
  return { x: distance < 0 ? 2 : -2, y: -1 };
}

type JarGesture = {
  pointerId: number;
  key: string;
  index: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
};
type JarNudge = { index: number; tapped: boolean };
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
  taskId: string;
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
  interactive = false,
  motionEnabled = true,
  soundEnabled = false,
}: {
  balls: JarBall[];
  small?: boolean;
  staticPreview?: boolean;
  jarRef?: Ref<HTMLDivElement>;
  incoming?: string[];
  landed?: string;
  pulse?: number;
  interactive?: boolean;
  motionEnabled?: boolean;
  soundEnabled?: boolean;
}) {
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const [drag, setDrag] = useState<JarGesture | null>(null);
  const [nudge, setNudge] = useState<JarNudge | null>(null);
  const gesture = useRef<JarGesture | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const canAnimate = interactive && motionEnabled && !reduce;
  const quiet = staticPreview || interactive;
  const finishInteraction = (pointerId?: number) => {
    const active = gesture.current;
    if (!active || (pointerId !== undefined && pointerId !== active.pointerId))
      return;
    gesture.current = null;
    setDrag(null);
    if (canAnimate) {
      setNudge({
        index: active.index,
        tapped: Math.hypot(active.x, active.y) < 1,
      });
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => setNudge(null), 280);
    }
    playJarClink(soundEnabled);
  };
  useEffect(() => () => clearTimeout(releaseTimer.current), []);
  const startInteraction = (
    event: import("react").PointerEvent<HTMLDivElement>,
  ) => {
    if (!interactive || !canAnimate) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-ball-key]",
    );
    const balls = event.currentTarget;
    const index = target ? Number(target.dataset.ballIndex) : -1;
    const key = target?.dataset.ballKey;
    if (!key || index < 0) return;
    event.preventDefault();
    gesture.current = {
      pointerId: event.pointerId,
      key,
      index,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
    };
    balls.setPointerCapture(event.pointerId);
  };
  const moveInteraction = (
    event: import("react").PointerEvent<HTMLDivElement>,
  ) => {
    const active = gesture.current;
    if (
      !interactive ||
      !canAnimate ||
      !active ||
      active.pointerId !== event.pointerId ||
      !canDragJarBalls(balls.length)
    )
      return;
    active.x = clampJarDrag(event.clientX - active.startX);
    active.y = clampJarDrag(event.clientY - active.startY, 6);
    if (Math.hypot(active.x, active.y) >= 2) setDrag({ ...active });
  };
  const keyboardNudge = () => {
    if (!interactive || !canAnimate || !balls.length) return;
    const index = Math.floor(balls.length / 2);
    setNudge({ index, tapped: true });
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => setNudge(null), 280);
    playJarClink(soundEnabled);
  };
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
      animate={quiet ? undefined : controls}
      className={`jar ${small ? "mini" : ""} ${quiet ? "static-jar" : ""}`}
    >
      <motion.div
        className="jar-lid"
        initial={quiet ? false : undefined}
        animate={
          quiet
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
        <div
          className={`balls${canAnimate ? " jar-balls-interactive" : ""}`}
          role={canAnimate ? "button" : undefined}
          tabIndex={canAnimate ? 0 : undefined}
          aria-label={
            canAnimate
              ? "Jar balls. Tap or lightly drag a ball to jiggle the jar."
              : undefined
          }
          onPointerDown={canAnimate ? startInteraction : undefined}
          onPointerMove={canAnimate ? moveInteraction : undefined}
          onPointerUp={
            canAnimate
              ? (event) => finishInteraction(event.pointerId)
              : undefined
          }
          onPointerCancel={
            canAnimate
              ? (event) => finishInteraction(event.pointerId)
              : undefined
          }
          onKeyDown={
            canAnimate
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    keyboardNudge();
                  }
                }
              : undefined
          }
        >
          {balls.map((b, index) => {
            const key = rewardKey(b),
              hidden = incoming.includes(key);
            const isDragged = drag?.key === key;
            const isSelected = nudge?.index === index;
            const neighbor = nudge
              ? jarNeighborNudge(index, nudge.index)
              : { x: 0, y: 0 };
            const transform = isDragged
              ? `translate(${drag.x}px, ${drag.y}px)`
              : isSelected
                ? nudge?.tapped
                  ? "translateY(-2px) rotate(-4deg)"
                  : "translate(0, 0)"
                : neighbor.x || neighbor.y
                  ? `translate(${neighbor.x}px, ${neighbor.y}px)`
                  : undefined;
            return (
              <motion.span
                style={{
                  ...ballStyle(b),
                  ...(interactive
                    ? {
                        transform,
                        transition: isDragged
                          ? "none"
                          : "transform 260ms cubic-bezier(.2,.8,.2,1)",
                      }
                    : {}),
                }}
                title={
                  b.missed
                    ? "Missed: " + b.name
                    : (b.priority || "Recorded") + ": " + b.name
                }
                data-ball-key={key}
                data-ball-index={index}
                key={key}
                className={`ball ${b.category} ${hidden ? "incoming-ball" : ""}`}
                initial={false}
                animate={
                  quiet
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
