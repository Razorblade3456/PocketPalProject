import { rewardKey, type Completion, type State, type Task } from "./model";
export type JarBall = Completion & {
  priority?: Task["priority"];
  missed?: boolean;
};
export const priorityBallColors = {
  high: "#C46B80",
  normal: "#E5A35D",
  low: "#9CB58B",
};
export function normalizeJarPriority(value: unknown): NonNullable<Task["priority"]> {
  return value === "high" || value === "low" || value === "normal"
    ? value
    : "normal";
}
/**
 * Read-only visual history. Priority comes from the recorded task snapshot,
 * never the live task; legacy records without a snapshot use Normal.
 */
export function jarBalls(s: State, date: string): JarBall[] {
  const tracked = new Set(s.tasks.map((task) => task.id));
  const records = new Map(s.outcomes.map((o) => [rewardKey(o), o]));
  return [
    ...s.completions
      .filter((c) => c.date === date && tracked.has(c.taskId))
      .map((c) => ({
        ...c,
        priority: normalizeJarPriority(
          records.get(rewardKey(c))?.task.priority,
        ),
      })),
    ...s.outcomes
      .filter(
        (o) =>
          o.date === date &&
          tracked.has(o.taskId) &&
          o.status === "missed" &&
          !o.automatic &&
          !o.deleted,
      )
      .map((o) => ({
        ...o,
        priority: normalizeJarPriority(o.task.priority),
        missed: true,
      })),
  ].sort((a, b) => a.at - b.at);
}
