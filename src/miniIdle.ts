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
export const miniIdleDelay = (random = Math.random) =>
  8000 + Math.floor(random() * 12000);
