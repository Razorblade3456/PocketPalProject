import { countdownProgress, type AlarmRecord } from "./alarms";
import type { Care, PetKind } from "./model";
export type MiniIdle =
  | "scratch"
  | "ears"
  | "look"
  | "bounce"
  | "tummy"
  | "flap"
  | "float"
  | "antennae"
  | "wrap"
  | "yawn"
  | "stumble"
  | "hop"
  | "sit"
  | "cross"
  | "sideeye"
  | "tap"
  | "smoke"
  | "laugh";
const personalities: Record<PetKind, MiniIdle[]> = {
  mochi: ["scratch", "ears", "look", "bounce"],
  pippin: ["flap", "float", "antennae", "wrap", "yawn"],
  crumb: ["stumble", "look", "tummy", "hop", "sit"],
  rattle: ["cross", "sideeye", "tap", "smoke", "laugh"],
};
export function miniIdleChoices(
  kind: PetKind,
  care: Care,
  level: number,
  sleeping: boolean,
): MiniIdle[] {
  if (sleeping || level === 5) return [];
  if (level >= 3) return [kind === "rattle" ? "sideeye" : "look"];
  if (care.water <= 50) return ["look"];
  if (care.food <= 75) return [kind === "pippin" ? "wrap" : "tummy"];
  if (care.happy <= 50)
    return kind === "rattle"
      ? ["cross", "sideeye", "tap"]
      : kind === "pippin"
        ? ["yawn", "wrap"]
        : kind === "crumb"
          ? ["sit", "look"]
          : ["look", "yawn"];
  if (level > 0)
    return kind === "rattle"
      ? ["sideeye", "cross"]
      : kind === "pippin"
        ? ["yawn", "wrap"]
        : kind === "crumb"
          ? ["sit", "look"]
          : ["yawn", "look"];
  return personalities[kind];
}
export function nextMiniIdle(
  choices: MiniIdle[],
  previous: MiniIdle | null,
  random = Math.random,
): MiniIdle | null {
  const pool = choices.filter((choice) => choice !== previous);
  const available = pool.length ? pool : choices;
  return available.length
    ? available[
        Math.min(available.length - 1, Math.floor(random() * available.length))
      ]
    : null;
}
export type CountdownMood = "chill" | "nervous" | "anxious";
export function countdownMood(
  alarm: AlarmRecord | undefined,
  now: number,
): CountdownMood {
  if (!alarm || alarm.status === "stopped") return "chill";
  const progress = countdownProgress(alarm, now);
  return !progress || progress.percent > 50
    ? "chill"
    : progress.percent >= 20
      ? "nervous"
      : "anxious";
}
export function countdownIdleChoices(
  kind: PetKind,
  base: MiniIdle[],
  mood: CountdownMood,
): MiniIdle[] {
  if (mood === "chill") return base;
  const choices: Record<PetKind, MiniIdle[]> =
    mood === "nervous"
      ? {
          mochi: ["look", "scratch"],
          pippin: ["look", "antennae"],
          crumb: ["look", "tummy"],
          rattle: ["sideeye", "cross"],
        }
      : {
          mochi: ["look", "bounce"],
          pippin: ["flap", "antennae"],
          crumb: ["stumble", "look"],
          rattle: ["tap", "sideeye"],
        };
  return choices[kind];
}
export const miniIdleDelay = (
  random = Math.random,
  mood: CountdownMood = "chill",
) =>
  Math.round(
    (8000 + Math.floor(random() * 12000)) *
      (mood === "anxious" ? 0.3 : mood === "nervous" ? 0.6 : 1),
  );
