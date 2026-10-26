import type { Care, Category } from "./model";
export type CareTier = 0 | 1 | 2 | 3 | 4;
export const excellentCare: Care = { food: 100, water: 100, clean: 100, happy: 100 };
export const careValues = [100, 75, 50, 25, 10] as const;
export const careNames = ["Excellent", "Mildly neglected", "Moderately neglected", "Severely neglected", "Desperate"];
export const careLabels: Record<Category, string> = { food: "Food", water: "Water", clean: "Cleanliness", happy: "Happiness" };
/** Fractional live stats use the same exact threshold boundaries as whole numbers. */
export function careTier(value: number): CareTier {
  return value > 75 ? 0 : value > 50 ? 1 : value > 25 ? 2 : value > 10 ? 3 : 4;
}
export function careTiers(care: Care): Record<Category, CareTier> {
  return { food: careTier(care.food), water: careTier(care.water), clean: careTier(care.clean), happy: careTier(care.happy) };
}
export function previewCare(category: Category, value: number): Care {
  return { ...excellentCare, [category]: Math.max(0, Math.min(100, value)) };
}
export const careConditions: Record<Category, readonly {name: string; description: string}[]> = {
  happy: [
    { name: "Happy", description: "Bright eyes, a big smile, and a little spring in every step." },
    { name: "Slightly Sad", description: "A small frown and quieter, downward glances." },
    { name: "Sad", description: "Drooping brows, a lowered head, and slow movements." },
    { name: "Teary", description: "Watery eyes, gathered tears, and a trembling little lip." },
    { name: "Sobbing", description: "Rolling tears, soft shoulder shakes, and paws over the face." },
  ],
  food: [
    { name: "Satisfied", description: "A soft, rounded tummy and an energetic posture." },
    { name: "Peckish", description: "A smaller tummy and an occasional belly rub." },
    { name: "Hungry", description: "A less puffy silhouette and a low, resting posture." },
    { name: "Very Hungry", description: "A slim tummy, hunched posture, and a paw held to the stomach." },
    { name: "Famished", description: "A tiny rumbling tummy and a slow reach toward the food bowl." },
  ],
  water: [
    { name: "Refreshed", description: "Bright fabric, clear eyes, and smooth movements." },
    { name: "A Little Thirsty", description: "Dry lips and a small lick of the mouth." },
    { name: "Thirsty", description: "Duller fabric and a visibly dry mouth." },
    { name: "Very Thirsty", description: "Dry patches, drooping features, and a reach for water." },
    { name: "Parched", description: "Stitched dry cracks, slow panting, and a longing for a sip." },
  ],
  clean: [
    { name: "Fresh & Fluffy", description: "Clean fabric, bright colors, and soft little stitches." },
    { name: "A Little Smudgy", description: "A small muddy smudge and an occasional scratch." },
    { name: "Dusty", description: "Scattered stains, messy fibers, and drifting dust." },
    { name: "Grubby", description: "Larger stains, tangled fibers, and a few tiny flies." },
    { name: "Muddy", description: "Muddy patches, dust clouds, buzzing flies, and a little shake." },
  ],
};
