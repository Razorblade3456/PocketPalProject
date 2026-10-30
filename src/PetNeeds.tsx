import { Apple, Droplets, Sparkles, Heart, ShoppingBag } from "lucide-react";
import { useRef, useState } from "react";
import {
  SUPPLIES,
  stage,
  type State,
  type Supply,
  type BasicSupply,
} from "./model";
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
  onUse,
  onBuyAndUse,
}: {
  s: State;
  onPat: () => void;
  onSupplies: () => void;
  onUse: (item: Supply) => boolean;
  onBuyAndUse: (item: BasicSupply) => boolean;
}) {
  const [pending, setPending] = useState<BasicSupply | null>(null);
  const approval = useRef<BasicSupply | null>(null);
  const dismiss = () => {
    approval.current = null;
    setPending(null);
  };
  const health = Math.round(
      Object.values(s.care).reduce((sum, value) => sum + value, 0) / 4,
    ),
    level = stage(s);
  return (
    <section
      className={`pet-needs health-stage-${level}`}
      aria-label="Pet health and needs"
    >
      <h3 className="care-stats-heading">Care Stats</h3>
      <div className="quick-care" role="group" aria-label="Quick pet care">
        {(
          [
            { item: "food", label: "Feed", icon: Apple },
            { item: "water", label: "Water", icon: Droplets },
            { item: "soap", label: "Clean", icon: Sparkles },
          ] as const
        ).map(({ item, label, icon: Icon }) => (
          <button
            key={item}
            type="button"
            className={item}
            disabled={
              level === 5 ||
              (s.inventory[item] < 1 && s.coins < SUPPLIES[item].price)
            }
            aria-label={`${label} pet, ${s.inventory[item]} available`}
            title={
              level === 5
                ? "Revive your pal first"
                : s.inventory[item]
                  ? `Use one ${item} from inventory`
                  : s.coins >= SUPPLIES[item].price
                    ? `Buy & Use one ${SUPPLIES[item].name} for ${SUPPLIES[item].price} coins · confirmation required`
                    : `Need ${SUPPLIES[item].price} coins to Buy & Use`
            }
            onClick={() => {
              if (s.inventory[item] > 0) {
                dismiss();
                onUse(item);
              } else {
                approval.current = item;
                setPending(item);
              }
            }}
          >
            <Icon size={14} />
            <span>{label}</span>
            <small>×{s.inventory[item]}</small>
          </button>
        ))}
      </div>
      {pending && (
        <div
          className="quick-care-confirm"
          role="group"
          aria-label="Buy & Use confirmation"
          onKeyDown={(e) => {
            if (e.key === "Escape") dismiss();
          }}
        >
          <p role="status">
            Buy & Use one {SUPPLIES[pending].name} for{" "}
            <strong>{SUPPLIES[pending].price} coins</strong>?
          </p>
          <div>
            <button type="button" onClick={dismiss}>
              Cancel
            </button>
            <button
              type="button"
              disabled={
                level === 5 ||
                (s.inventory[pending] < 1 && s.coins < SUPPLIES[pending].price)
              }
              onClick={() => {
                if (approval.current !== pending) return;
                const item = pending;
                dismiss();
                onBuyAndUse(item);
              }}
            >
              Buy & Use
            </button>
          </div>
        </div>
      )}
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
