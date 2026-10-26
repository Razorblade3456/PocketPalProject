import { Apple, Droplets, Sparkles, Heart, ShoppingBag } from "lucide-react";
import { stage, type State } from "./model";
const needs = [
  { key: "food", name: "Food", hint: "Use food from your shelf", icon: Apple },
  {
    key: "water",
    name: "Water",
    hint: "Use water from your shelf",
    icon: Droplets,
  },
  {
    key: "clean",
    name: "Cleanliness",
    hint: "Use soap from your shelf",
    icon: Sparkles,
  },
  {
    key: "happy",
    name: "Happiness",
    hint: "Give your pal head pats",
    icon: Heart,
  },
] as const;
export function PetNeeds({
  s,
  onPat,
  onSupplies,
}: {
  s: State;
  onPat: () => void;
  onSupplies: () => void;
}) {
  const health = Math.round(
      Object.values(s.care).reduce((sum, value) => sum + value, 0) / 4,
    ),
    level = stage(s);
  return (
    <section
      className={`pet-needs health-stage-${level}`}
      aria-label="Pet health and needs"
    >
      <div className="overall-health-label">
        <span>
          <Heart size={15} />
          Overall health
        </span>
        <strong>
          {health}
          <small>/100</small>
        </strong>
      </div>
      <div
        className="overall-health-track"
        role="progressbar"
        aria-label="Overall pet health"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={health}
      >
        <span style={{ width: health + "%" }} />
      </div>
      <div className="pet-need-grid">
        {needs.map(({ key, name, hint, icon: Icon }) => (
          <div className={`pet-need ${key}`} key={key}>
            <div>
              <span>
                <Icon size={14} />
                {name}
              </span>
              <b>
                {Math.round(s.care[key])}
                <small>/100</small>
              </b>
            </div>
            <div
              className="pet-need-track"
              role="progressbar"
              aria-label={name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(s.care[key])}
            >
              <span style={{ width: s.care[key] + "%" }} />
            </div>
            <p>{hint}</p>
          </div>
        ))}
      </div>
      <div className="pet-care-actions">
        <button onClick={onSupplies}>
          <ShoppingBag size={14} />
          Get supplies
        </button>
        <button onClick={onPat} disabled={level === 5}>
          <Heart size={14} />
          Head pat <small>+3 joy</small>
        </button>
      </div>
      <p className="pet-care-explainer">
        Tasks earn coins. Supplies fill needs. Head pats bring happiness.
      </p>
    </section>
  );
}
