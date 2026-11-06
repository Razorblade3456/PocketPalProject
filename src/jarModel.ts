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
/** Read-only visual history: priority comes from the recorded task, never the live task. */
export function jarBalls(s: State, date: string): JarBall[] {
  const records = new Map(s.outcomes.map((o) => [rewardKey(o), o]));
  return [
    ...s.completions
      .filter((c) => c.date === date)
      .map((c) => ({
        ...c,
        priority: records.get(rewardKey(c))?.task.priority,
      })),
    ...s.outcomes
      .filter(
        (o) =>
          o.date === date &&
          o.status === "missed" &&
          !o.automatic &&
          !o.deleted,
      )
      .map((o) => ({ ...o, priority: o.task.priority, missed: true })),
  ].sort((a, b) => a.at - b.at);
}
