import type { Care, PetKind } from "./model";
import { careTiers, excellentCare } from "./careVisuals";
export type FaceAction = "food" | "water" | "clean" | "happy" | "hurt" | null;
/** One owner per facial group. Death/sleep are rendered by the species' resting face. */
export function petExpression(
  kind: PetKind,
  care: Care = excellentCare,
  level = 0,
  sleeping = false,
  action: FaceAction = null,
  anticipating = false,
) {
  const tiers = careTiers(care);
  const mood =
    action === "happy"
      ? 0
      : action === "hurt"
        ? Math.max(2, tiers.happy)
        : tiers.happy;
  const inactive = level === 5 || sleeping;
  const feisty = kind === "rattle";
  const mouth =
    level === 5
      ? "dead"
      : sleeping
        ? "sleep"
        : action === "hurt"
          ? "frown"
          : action === "food"
            ? "open"
            : action === "water"
              ? "sip"
              : anticipating || mood === 0
                ? "open"
                : mood === 4 && !feisty
                  ? "sob"
                  : "frown";
  const eyes =
    level === 5
      ? "dead"
      : sleeping
        ? "sleep"
        : feisty && mood > 0
          ? "angry"
          : mood === 4
            ? "sobbing"
            : mood === 3
              ? "teary"
              : level >= 3
                ? "weak"
                : mood >= 1
                  ? "low"
                  : "bright";
  return {
    mood,
    mouth,
    eyes,
    feisty,
    tears: !inactive && !feisty && mood >= 3,
    open: mouth === "open" || mouth === "sob" || mouth === "sip",
    thirst: tiers.water,
  };
}
