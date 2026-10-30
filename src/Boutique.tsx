import { useState } from "react";
import { Coins, ShoppingBag, Check, Shirt, PackageOpen } from "lucide-react";
import {
  SUPPLIES,
  OUTFITS,
  SUPPLY_IDS,
  OUTFIT_IDS,
  isSupply,
  itemName,
  type ShopItem,
  type Outfit,
} from "./catalog";
import { stage, petRhythm, type State } from "./model";
import { ItemArt } from "./ItemArt";
import { Pet } from "./Pets";
export function Boutique({
  s,
  onBuy,
  onInventory,
  onWardrobe,
}: {
  s: State;
  onBuy: (item: ShopItem) => void;
  onInventory: () => void;
  onWardrobe: () => void;
}) {
  const [tab, setTab] = useState<"essentials" | "treats" | "outfits">(
    "essentials",
  );
  const items: ShopItem[] =
    tab === "outfits"
      ? OUTFIT_IDS
      : SUPPLY_IDS.filter((i) => SUPPLIES[i].tab === tab);
  return (
    <>
      <div className="boutique-heading">
        <div>
          <span className="eyebrow">SUPPLIES & GEAR</span>
          <h2>Shop</h2>
          <p>Care supplies, food, and outfits.</p>
        </div>
        <span className="boutique-wallet">
          <Coins size={17} />
          {s.coins}
          <small>coins</small>
        </span>
      </div>
      <div
        className="boutique-tabs"
        role="tablist"
        aria-label="Shop categories"
      >
        {(
          [
            ["essentials", "Essentials"],
            ["treats", "Premium Food"],
            ["outfits", "Outfits"],
          ] as const
        ).map(([value, label]) => (
          <button
            role="tab"
            aria-selected={tab === value}
            aria-controls="shop-items"
            key={value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="shop-tools">
        <button onClick={onInventory}>
          <PackageOpen size={14} />
          Open inventory
        </button>
        <button onClick={onWardrobe}>
          <Shirt size={14} />
          Your wardrobe
        </button>
      </div>
      <div
        id="shop-items"
        role="tabpanel"
        aria-label={
          tab === "essentials"
            ? "Essentials"
            : tab === "treats"
              ? "Premium Food"
              : "Outfits"
        }
        className="boutique-grid"
      >
        {items.map((item) => {
          const supply = isSupply(item),
            product = supply ? SUPPLIES[item] : OUTFITS[item],
            owned = !supply && s.ownedOutfits.includes(item as Outfit);
          return (
            <article
              className={`boutique-card ${supply ? "" : "clothing-card"}`}
              key={item}
            >
              <div className="boutique-art">
                <ItemArt item={item} />
                {owned && (
                  <span className="owned-stamp">
                    <Check size={11} />
                    Yours
                  </span>
                )}
              </div>
              <h3>{itemName(item)}</h3>
              <p>{product.description}</p>
              <span className="item-effect">
                {supply
                  ? "+" +
                    SUPPLIES[item].boost +
                    " " +
                    (SUPPLIES[item].category === "food"
                      ? "nourishment"
                      : SUPPLIES[item].category === "water"
                        ? "hydration"
                        : SUPPLIES[item].category === "happy"
                          ? "happiness"
                          : "cleanliness") +
                    (SUPPLIES[item].morale
                      ? " · +" + SUPPLIES[item].morale + " happiness"
                      : "")
                  : "Permanent unlock · " + OUTFITS[item].slot + " slot"}
              </span>
              <button
                className="shop-buy"
                disabled={owned || s.coins < product.price}
                onClick={() => onBuy(item)}
                aria-label={`Buy ${itemName(item)} for ${product.price} coins`}
              >
                {owned ? (
                  <>
                    <Check size={14} />
                    Owned
                  </>
                ) : (
                  <>
                    <ShoppingBag size={13} />
                    {product.price}
                    <Coins size={13} />
                  </>
                )}
              </button>
              {!owned && s.coins < product.price && (
                <small className="coins-needed">
                  {product.price - s.coins} more coins needed
                </small>
              )}
            </article>
          );
        })}
      </div>
      {s.debt > 0 && (
        <p className="boutique-note">
          {s.debt} coins are reserved from future wins after a correction. Your
          bought items stay yours.
        </p>
      )}
      <p className="boutique-note">
        Buy supplies here, then tap Feed / Use in Inventory.
      </p>
    </>
  );
}
export function Wardrobe({
  s,
  onEquip,
  onShop,
}: {
  s: State;
  onEquip: (item: Outfit | null) => void;
  onShop: () => void;
}) {
  return (
    <>
      <span className="eyebrow">THE TINIEST LITTLE CLOSET</span>
      <h2>Your pal's wardrobe</h2>
      <p>
        One item per slot; hats,
        neckwear, backpacks and clothing can be combined.
      </p>
      <div className="wardrobe-preview">
        <Pet
          kind={s.pet}
          level={stage(s)}
          care={s.care}
          preview
          sleep={petRhythm().sleeping && stage(s) < 3}
          equipped={s.equipped}
        />
        <span>{s.name}'s dressing corner</span>
      </div>
      <div className="wardrobe-toolbar">
        <button className="secondary" onClick={onShop}>
          <ShoppingBag size={14} />
          Browse outfits
        </button>
        <button
          className="secondary"
          disabled={!Object.keys(s.equipped).length}
          onClick={() => onEquip(null)}
        >
          Clear outfit
        </button>
      </div>
      {s.ownedOutfits.length ? (
        <div className="wardrobe-grid">
          {s.ownedOutfits.map((item) => {
            const product = OUTFITS[item],
              worn = s.equipped[product.slot] === item;
            return (
              <article key={item} className={worn ? "worn" : ""}>
                <ItemArt item={item} size={70} />
                <h3>{product.name}</h3>
                <small>{product.slot} · yours forever</small>
                <button
                  className="secondary"
                  aria-pressed={worn}
                  aria-label={`${worn ? "Unequip" : "Equip"} ${product.name}`}
                  onClick={() => onEquip(item)}
                >
                  {worn ? (
                    <>
                      <Check size={13} />
                      Equipped
                    </>
                  ) : (
                    "Wear this"
                  )}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="closet-empty">
          <Shirt size={28} />
          <h3>No outfits yet</h3>
          <p>
            Your first outfit will have a home here. Essentials always come
            first.
          </p>
        </div>
      )}
    </>
  );
}
