import { useRef, useState, type RefObject } from "react";
import { motion } from "motion/react";
import { X, ShoppingBag, PackageOpen, Shirt, Check } from "lucide-react";
import {
  SUPPLIES,
  OUTFITS,
  SUPPLY_IDS,
  type Supply,
  type Outfit,
} from "./catalog";
import { stage, type State } from "./model";
import { ItemArt } from "./ItemArt";
export type IncomingFood = {
  item: Supply;
  x: number;
  y: number;
  near: boolean;
};
export function withinPet(
  x: number,
  y: number,
  r: { left: number; right: number; top: number; bottom: number },
) {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
type Drag = {
  item: Supply;
  x: number;
  y: number;
  ox: number;
  oy: number;
  phase: "held" | "drag" | "return" | "eat";
};
export function Inventory({
  s,
  petRef,
  onClose,
  onShop,
  onFeed,
  onEquip,
  onApproach,
}: {
  s: State;
  petRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onShop: () => void;
  onFeed: (item: Supply) => boolean;
  onEquip: (item: Outfit) => void;
  onApproach: (food: IncomingFood | null) => void;
}) {
  const [tab, setTab] = useState<"food" | "wardrobe">("food");
  const [drag, setDrag] = useState<Drag | null>(null);
  const active = useRef<Drag | null>(null);
  const pointer = useRef<number | null>(null);
  const update = (d: Drag | null) => {
    active.current = d;
    setDrag(d);
  };
  const end = (cancel = false) => {
    const d = active.current;
    if (!d || !["held", "drag"].includes(d.phase)) return;
    onApproach(null);
    if (d.phase === "held") {
      update(null);
      return;
    }
    const rect = petRef.current?.getBoundingClientRect();
    if (!cancel && rect && withinPet(d.x, d.y, rect) && stage(s) !== 5) {
      update({
        ...d,
        phase: "eat",
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height * 0.55,
      });
      if (!onFeed(d.item)) update({ ...d, phase: "return", x: d.ox, y: d.oy });
    } else update({ ...d, phase: "return", x: d.ox, y: d.oy });
  };
  const owned = SUPPLY_IDS.filter((i) => s.inventory[i] > 0);
  return (
    <>
      <aside className="inventory-drawer" aria-label="Pet inventory">
        <div className="inventory-heading">
          <div>
            <span className="eyebrow">YOUR SUPPLIES</span>
            <h2>Inventory</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => {
              onApproach(null);
              onClose();
            }}
            aria-label="Close inventory"
          >
            <X size={17} />
          </button>
        </div>
        <div className="inventory-tabs">
          <button aria-pressed={tab === "food"} onClick={() => setTab("food")}>
            <PackageOpen size={13} />
            Consumables
          </button>
          <button
            aria-pressed={tab === "wardrobe"}
            onClick={() => {
              end(true);
              setTab("wardrobe");
            }}
          >
            <Shirt size={13} />
            Wardrobe
          </button>
        </div>
        {tab === "food" ? (
          <>
            <p className="inventory-help">
              Tap Feed / Use, or drag an item onto your pet.
            </p>
            <div className="pantry-grid">
              {owned.map((item) => (
                <article className="pantry-item" key={item}>
                  <button
                    className="draggable-item"
                    aria-label={`Drag ${SUPPLIES[item].shopName} to your pet`}
                    title="Drag onto your pet"
                    disabled={stage(s) === 5}
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => {
                      if (e.button !== 0 || active.current) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      pointer.current = e.pointerId;
                      update({
                        item,
                        x: e.clientX,
                        y: e.clientY,
                        ox: r.left + r.width / 2,
                        oy: r.top + r.height / 2,
                        phase: "held",
                      });
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                      const d = active.current;
                      if (
                        !d ||
                        pointer.current !== e.pointerId ||
                        !["held", "drag"].includes(d.phase)
                      )
                        return;
                      if (
                        d.phase === "held" &&
                        Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8
                      )
                        return;
                      const rect = petRef.current?.getBoundingClientRect();
                      update({
                        ...d,
                        x: e.clientX,
                        y: e.clientY,
                        phase: "drag",
                      });
                      onApproach({
                        item,
                        x: e.clientX,
                        y: e.clientY,
                        near:
                          !!rect &&
                          withinPet(e.clientX, e.clientY, {
                            left: rect.left - 30,
                            right: rect.right + 30,
                            top: rect.top - 25,
                            bottom: rect.bottom + 25,
                          }),
                      });
                    }}
                    onPointerUp={(e) => {
                      if (pointer.current === e.pointerId) end();
                    }}
                    onPointerCancel={(e) => {
                      if (pointer.current === e.pointerId) end(true);
                    }}
                    onLostPointerCapture={() => {
                      if (
                        active.current?.phase === "drag" ||
                        active.current?.phase === "held"
                      )
                        end(true);
                    }}
                  >
                    <ItemArt item={item} size={64} />
                    <span>×{s.inventory[item]}</span>
                  </button>
                  <b>{SUPPLIES[item].shopName}</b>
                  <button
                    className="feed-button"
                    aria-label={`${SUPPLIES[item].category === "food" ? "Feed" : "Use"} ${SUPPLIES[item].shopName}`}
                    disabled={stage(s) === 5}
                    onClick={() => onFeed(item)}
                  >
                    {SUPPLIES[item].category === "food" ? "Feed" : "Use"}
                  </button>
                </article>
              ))}
            </div>
            {!owned.length && (
              <div className="pantry-empty">
                <PackageOpen size={26} />
                <p>No supplies yet. Pick up an item in the shop.</p>
              </div>
            )}
          </>
        ) : (
          <div className="pantry-wardrobe">
            {s.ownedOutfits.map((item) => (
              <article key={item}>
                <ItemArt item={item} size={53} />
                <span>{OUTFITS[item].name}</span>
                <button
                  aria-label={`${s.equipped[OUTFITS[item].slot] === item ? "Unequip" : "Equip"} ${OUTFITS[item].name}`}
                  onClick={() => onEquip(item)}
                >
                  {s.equipped[OUTFITS[item].slot] === item ? (
                    <Check size={14} />
                  ) : (
                    "Wear"
                  )}
                </button>
              </article>
            ))}
            {!s.ownedOutfits.length && (
              <p>No outfits owned yet.</p>
            )}
          </div>
        )}
        <button className="inventory-shop" onClick={onShop}>
          <ShoppingBag size={14} />
          Open Shop
        </button>
        {stage(s) === 5 && (
          <p className="inventory-help">
            Revive your pet before using supplies.
          </p>
        )}
      </aside>
      {drag && drag.phase !== "held" && (
        <motion.div
          className="drag-food-overlay"
          aria-hidden="true"
          initial={false}
          animate={{
            x: drag.x - 36,
            y: drag.y - 36,
            scale: drag.phase === "eat" ? 0.1 : 1,
            opacity: drag.phase === "eat" ? 0 : 1,
            rotate: drag.phase === "drag" ? -7 : 0,
          }}
          transition={{
            duration:
              drag.phase === "drag" ? 0 : drag.phase === "eat" ? 0.45 : 0.3,
          }}
          onAnimationComplete={() => {
            if (
              active.current?.phase === "eat" ||
              active.current?.phase === "return"
            )
              update(null);
          }}
        >
          <ItemArt item={drag.item} size={72} />
        </motion.div>
      )}
    </>
  );
}
