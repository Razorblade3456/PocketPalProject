import { Apple, Droplets, Sparkles, Coins, Plus } from "lucide-react";
import { SUPPLIES, type State, type Supply } from "./model";
const icons = { food: Apple, water: Droplets, soap: Sparkles };
export function Supplies({
  s,
  onBuy,
  onUse,
  onShop,
  onInventory,
}: {
  s: State;
  onBuy: (item: Supply) => void;
  onUse: (item: Supply) => void;
  onShop: () => void;
  onInventory: () => void;
}) {
  return (
    <section
      className="supplies"
      aria-label="Shop and pet supplies"
      id="supplies"
    >
      <div className="supplies-heading">
        <h3>The little supply shelf</h3>
        <span>
          <Coins size={13} />
          {s.coins}
        </span>
      </div>
      <p>Little wins become little comforts.</p>
      {(["food", "water", "soap"] as const).map((item) => {
        const v = SUPPLIES[item],
          Icon = icons[item];
        return (
          <div className="supply-row" key={item}>
            <span className={`supply-icon ${v.category}`}>
              <Icon size={17} />
            </span>
            <div className="supply-label">
              <b>
                {v.name}
                <small> ×{s.inventory[item]}</small>
              </b>
              <span>
                +{v.boost}{" "}
                {v.category === "food"
                  ? "nourishment"
                  : v.category === "water"
                    ? "hydration"
                    : "cleanliness"}
              </span>
            </div>
            <button
              className="supply-buy"
              aria-label={`Buy ${v.name} for ${v.price} coins`}
              disabled={s.coins < v.price}
              title={
                s.coins < v.price
                  ? `Earn ${v.price - s.coins} more coins to buy ${v.name}`
                  : `Buy one ${v.name} for ${v.price} coins`
              }
              onClick={() => onBuy(item)}
            >
              <Plus size={11} />
              {v.price}
              <Coins size={11} />
            </button>
            <button
              className="supply-use"
              aria-label={`Use ${v.name}`}
              disabled={
                !s.inventory[item] ||
                s.care.food + s.care.water + s.care.clean + s.care.happy === 0
              }
              title={`Use one ${v.name}: +${v.boost} care and +${v.morale} happiness`}
              onClick={() => onUse(item)}
            >
              Use
            </button>
          </div>
        );
      })}
      <div className="shelf-links">
        <button onClick={onShop}>PocketPal Shop</button>
        <button onClick={onInventory}>Open inventory</button>
      </div>
      <p className="supply-hint">
        Buy now, use when your pal needs a little care. Each use adds +4
        happiness.
      </p>
      {s.debt > 0 && (
        <p className="coin-reserve" role="status">
          {s.debt} coins reserved from future wins after a correction. Your
          bought supplies and care stay safe; new earnings settle this first.
        </p>
      )}
    </section>
  );
}
