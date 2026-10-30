import { AnimatePresence, motion } from "motion/react";
import type { Care, Category, PetKind } from "./model";
import { careTiers, type CareTier } from "./careVisuals";

const anatomy = {
  mochi: {
    eye: 138,
    left: 115,
    right: 205,
    mouth: 178,
    cheek: 166,
    tummy: 222,
  },
  pippin: {
    eye: 159,
    left: 124,
    right: 196,
    mouth: 205,
    cheek: 184,
    tummy: 239,
  },
  crumb: {
    eye: 167,
    left: 122,
    right: 199,
    mouth: 208,
    cheek: 187,
    tummy: 243,
  },
};

export function HungerAppearance({
  kind,
  tier,
}: {
  kind: PetKind;
  tier: CareTier;
}) {
  if (!tier) return null;
  const y = anatomy[kind].tummy;
  return (
    <g className={`hunger-appearance hunger-${tier}`} data-hunger-layer={tier}>
      {tier === 4 && (
        <g
          className="tummy-rumble"
          fill="none"
          stroke="#8e785b"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d={`M140 ${y + 17}q8-7 16 0t16 0M145 ${y + 25}q8-6 16 0`} />
        </g>
      )}
    </g>
  );
}

export function HydrationAppearance({
  kind,
  tier,
  sleeping = false,
}: {
  kind: PetKind;
  tier: CareTier;
  sleeping?: boolean;
}) {
  if (!tier) return null;
  const a = anatomy[kind];
  return (
    <g
      className={`hydration-appearance thirst-${tier}`}
      data-hydration-layer={tier}
    >
      {tier >= 2 && (
        <g
          className="dry-fabric"
          fill="#e5cfaa"
          stroke="#a98b6f"
          strokeWidth="1.5"
          opacity={tier === 2 ? 0.4 : 0.7}
        >
          <path d={`M90 ${a.cheek + 9}q-8 5-2 15l15-2 3-9-7-7z`} />
          {tier >= 3 && (
            <>
              <path d={`M213 ${a.cheek + 7}l14 4 1 14-17 2-5-11z`} />
              <path d={`M215 ${a.cheek + 9}l4 9 7-2m-7 2-3 7`} fill="none" />
            </>
          )}
          {tier === 4 && (
            <path
              d={`M183 ${a.tummy + 8}l13-7 10 12-5 15-16-1-7-10zM188 ${a.tummy + 5}l5 10 8-1m-8 1-4 9`}
            />
          )}
        </g>
      )}
    </g>
  );
}

export function CleanlinessOverlay({
  kind,
  tier,
}: {
  kind: PetKind;
  tier: CareTier;
}) {
  if (!tier) return null;
  const marks =
    kind === "crumb"
      ? [
          [110, 91, 16, 8],
          [200, 111, 18, 9],
          [102, 232, 13, 10],
          [195, 70, 21, 10],
          [209, 255, 18, 10],
          [151, 113, 25, 9],
        ]
      : kind === "pippin"
        ? [
            [65, 182, 17, 9],
            [244, 213, 19, 12],
            [104, 237, 14, 10],
            [212, 136, 15, 8],
            [160, 258, 20, 9],
            [84, 212, 19, 9],
          ]
        : [
            [90, 203, 16, 8],
            [206, 246, 19, 11],
            [216, 119, 13, 7],
            [110, 264, 19, 8],
            [86, 110, 17, 11],
            [180, 226, 24, 9],
          ];
  const count = [0, 1, 3, 5, 6][tier];
  return (
    <g
      className={`cleanliness-overlay dirt-${tier}`}
      data-cleanliness-layer={tier}
    >
      <g className="mud-marks" fill="#826d50" opacity={0.32 + tier * 0.08}>
        {marks.slice(0, count).map(([x, y, rx, ry], i) => (
          <g key={i} transform={`rotate(${i % 2 ? 18 : -15} ${x} ${y})`}>
            <ellipse cx={x} cy={y} rx={rx} ry={ry} />
            <circle cx={x - rx - 3} cy={y + 7} r="3" />
            {tier >= 3 && (
              <path
                d={`M${x - 8} ${y - 5}l4 10m5-13 3 11m5-8 3 9`}
                stroke="#b4a07b"
                strokeWidth="1.5"
              />
            )}
          </g>
        ))}
      </g>
      {tier >= 2 && (
        <g
          className="messy-fibers"
          fill="none"
          stroke="var(--pet-dark)"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M91 216l-8 3 6 5-9 4M227 228l10 3-6 5 9 4" />
          {kind === "pippin" && (
            <path d="M44 187l-11 4 10 7-9 4m232-18 13 4-11 7 11 4" />
          )}
        </g>
      )}
      {tier >= 2 && (
        <g className="care-dust" fill="#a28f6b" opacity=".55">
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={56 + i * 66}
              cy={258 + (i % 2) * 18}
              r={tier === 4 ? 5 : 2.5}
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          ))}
        </g>
      )}
      {tier >= 3 && (
        <g className="care-flies">
          {[0, 1, ...(tier === 4 ? [2] : [])].map((i) => (
            <g
              key={i}
              className="care-fly"
              style={{ animationDelay: `${i * -1.5}s` }}
              transform={`translate(${i % 2 ? 272 : 45},${101 + i * 48})`}
            >
              <ellipse
                cx="-3"
                cy="-3"
                rx="4"
                ry="2.5"
                fill="#f0edd8"
                opacity=".8"
              />
              <ellipse
                cx="3"
                cy="-3"
                rx="4"
                ry="2.5"
                fill="#f0edd8"
                opacity=".8"
              />
              <ellipse rx="2.5" ry="4" fill="#686950" />
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

export function HappinessExpression({
  kind,
  care,
  look,
  anticipating = false,
}: {
  kind: PetKind;
  care: Care;
  look: { x: number; y: number };
  anticipating?: boolean;
}) {
  const { happy: mood, water: thirst } = careTiers(care),
    a = anatomy[kind];
  const eyeY = a.eye + (mood >= 2 ? 3 : 0);
  const mouthY = a.mouth;
  return (
    <g
      className={`care-face mood-${mood}`}
      data-happiness-layer={mood}
      transform={`translate(${look.x},${look.y + (mood >= 2 ? 4 : 0)})`}
    >
      <g className="care-eyes">
        {[a.left, a.right].map((x, i) => (
          <g key={x}>
            {mood === 4 ? (
              <path
                d={`M${x - 10} ${eyeY}q10-12 20 0`}
                fill="none"
                stroke="#4c4a40"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            ) : (
              <>
                <ellipse
                  cx={x}
                  cy={eyeY}
                  rx={kind === "pippin" ? 13 : 10}
                  ry={mood === 2 ? 10 : 15}
                  fill={kind === "crumb" ? "#4d3b32" : "#414638"}
                />
                <ellipse
                  cx={x + 3}
                  cy={eyeY - 5}
                  rx="3.5"
                  ry="4"
                  fill="#fff8e4"
                />
                {mood === 0 && (
                  <circle
                    cx={x - 3}
                    cy={eyeY + 6}
                    r="2"
                    fill="#fff8e4"
                    opacity=".7"
                  />
                )}
                {mood >= 3 && (
                  <path
                    d={`M${x - 10} ${eyeY + 8}q10-4 20 0q-1 9-10 8t-10-8`}
                    fill="#a8d6de"
                    stroke="#d3eef0"
                    strokeWidth="1"
                  />
                )}
              </>
            )}
            {mood > 0 && (
              <path
                d={`M${x - 11} ${eyeY - 21}q10 ${i === 0 ? -mood * 2 : mood * 2} 21 ${i === 0 ? -mood * 2 : mood * 2}`}
                fill="none"
                stroke="var(--pet-dark)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}
            {mood === 4 && (
              <g
                className={`rolling-tears tear-${i}`}
                fill="#a7d8e0"
                stroke="#dbf2ef"
                strokeWidth="1"
              >
                <path
                  d={`M${x - 5} ${eyeY + 5}q-4 14 0 29q5 8 10 0q4-15 0-29z`}
                />
                <path
                  className="tear-drop"
                  d={`M${x} ${eyeY + 28}q-10 13 0 15q10-2 0-15`}
                />
              </g>
            )}
          </g>
        ))}
      </g>
      <ellipse
        cx={a.left - 18}
        cy={a.cheek}
        rx="12"
        ry="6"
        fill="#e6aaa0"
        opacity={mood < 2 ? 0.65 : 0.35}
      />
      <ellipse
        cx={a.right + 18}
        cy={a.cheek}
        rx="12"
        ry="6"
        fill="#e6aaa0"
        opacity={mood < 2 ? 0.65 : 0.35}
      />
      {kind === "crumb" && (
        <path d={`M151 ${mouthY - 22}q10-5 20 0l-10 10z`} fill="#6c5142" />
      )}
      <g
        className={`mouth care-mouth ${thirst === 4 ? "panting-mouth" : ""} ${mood >= 3 ? "trembling-lip" : ""}`}
      >
        {anticipating || mood === 0 || mood === 4 ? (
          <>
            <path
              d={
                mood === 4 && !anticipating
                  ? `M147 ${mouthY + 5}q13-20 26 0q-2 13-13 8q-11 5-13-8`
                  : `M140 ${mouthY - 5}q20 7 40 0q-1 29-20 29q-19 0-20-29`
              }
              fill="#57463f"
              stroke="#655246"
              strokeWidth="2"
            />
            <ellipse
              cx="160"
              cy={mouthY + (mood === 4 && !anticipating ? 7 : 16)}
              rx="10"
              ry="5"
              fill="#d59a95"
            />
            {kind === "mochi" && mood === 0 && (
              <path
                d={`M146 ${mouthY - 2}l5 10 7-8m8 0 5 8 6-10`}
                fill="#fff5dd"
              />
            )}
          </>
        ) : (
          <path
            d={`M145 ${mouthY + 4}q15 ${mood === 1 ? -9 : -15} 30 0`}
            fill="none"
            stroke="#685548"
            strokeWidth={mood >= 3 ? 4 : 3}
            strokeLinecap="round"
          />
        )}
        {thirst > 0 && (
          <g
            className="dry-lips"
            fill="none"
            stroke="#c7a37e"
            strokeWidth={thirst >= 3 ? 3.5 : 2}
            strokeLinecap="round"
          >
            {kind !== "mochi" && (
              <path
                d={`M142 ${mouthY + 9}q18 9 36 0`}
                strokeDasharray={thirst === 1 ? "3 5" : "5 3"}
              />
            )}
            {thirst >= 3 && (
              <path
                transform={
                  kind === "mochi" && (anticipating || mood === 0 || mood === 4)
                    ? "translate(0 20)"
                    : undefined
                }
                d={`M148 ${mouthY + 5}l-2 8m14-6 1 8m10-11 3 8`}
              />
            )}
          </g>
        )}
        {thirst > 0 && thirst < 4 && (
          <ellipse
            className="lip-lick"
            cx="166"
            cy={mouthY + 8}
            rx="5"
            ry="3"
            fill="#d59691"
          />
        )}
      </g>
    </g>
  );
}

export function CareRecovery({ changes }: { changes: Category[] }) {
  return (
    <g className="care-recovery" aria-hidden="true">
      {changes.includes("clean") && (
        <g
          className="wash-bubbles"
          fill="#e4f6ef"
          fillOpacity=".5"
          stroke="#f6fff8"
          strokeWidth="2"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <circle
                cx={85 + i * 29}
                cy={260 - (i % 3) * 52}
                r={9 + (i % 3) * 3}
              />
              <circle
                cx={82 + i * 29}
                cy={256 - (i % 3) * 52}
                r="2"
                fill="white"
              />
            </g>
          ))}
        </g>
      )}
      {changes.includes("water") && (
        <g
          className="refresh-drops"
          fill="#b1dde3"
          stroke="#eaf8ef"
          strokeWidth="1.5"
        >
          <path d="M242 146q-12 16 0 19q12-3 0-19M258 173q-9 13 0 15q9-2 0-15" />
        </g>
      )}
      {changes.includes("food") && (
        <g className="satisfied-spark" fill="#e7cf93">
          <path d="M67 163l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        </g>
      )}
      {changes.includes("happy") && (
        <g className="joy-hearts" fill="#dba3a2">
          <path d="M239 119q-13-13-14-1q0 8 14 16q14-8 14-16q-1-12-14 1" />
        </g>
      )}
    </g>
  );
}

export function CareBody({
  care,
  kind,
  level,
  sleeping,
  children,
}: {
  care?: Care;
  kind: PetKind;
  level: number;
  sleeping: boolean;
  children: import("react").ReactNode;
}) {
  const t = careTiers(
    care ?? { food: 100, water: 100, clean: 100, happy: 100 },
  );
  const active = !!care && level !== 5;
  const food = active ? t.food : 0,
    mood = active ? t.happy : 0,
    thirst = active ? t.water : 0;
  const weakness = Math.max(food, thirst, mood);
  // Existing limbs have one owner; care overlays never create body parts.
  const limbMotion =
    !active || sleeping
      ? "rest"
      : food > 0
        ? food === 4
          ? "food"
          : "tummy"
        : mood === 4
          ? "cover"
          : thirst >= 3
            ? "water"
            : t.clean === 1
              ? "scratch"
              : "rest";
  const curled =
    active && kind === "crumb" && (sleeping || level === 1 || mood >= 2);
  return (
    <g
      className={`care-body ${active ? "has-care" : ""} ${active && !sleeping ? "care-awake" : ""} care-kind-${kind}`}
      data-food-tier={food}
      data-water-tier={thirst}
      data-clean-tier={active ? t.clean : 0}
      data-happy-tier={mood}
      data-care-energy={weakness}
      data-limb-motion={limbMotion}
      style={{ filter: active ? `saturate(${1 - thirst * 0.065})` : undefined }}
    >
      <g
        className="care-shape"
        style={{
          transform: active
            ? `translateY(${Math.max(food, mood) * 2}px) scale(${1 - food * 0.045},${(1 - Math.max(food, mood) * 0.012) * (curled ? 0.89 : 1)}) rotate(${food >= 3 ? -2 : 0}deg)`
            : undefined,
        }}
      >
        <g className="care-idle">{children}</g>
      </g>
    </g>
  );
}
export function CareSurface({
  kind,
  care,
  level,
  sleeping,
}: {
  kind: PetKind;
  care?: Care;
  level: number;
  sleeping: boolean;
}) {
  if (!care || level === 5) return null;
  const t = careTiers(care);
  return (
    <>
      <HydrationAppearance kind={kind} tier={t.water} sleeping={sleeping} />
      <AnimatePresence initial={false}>
        <motion.g
          key={t.clean}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55 }}
        >
          <CleanlinessOverlay kind={kind} tier={t.clean} />
        </motion.g>
      </AnimatePresence>
      {!sleeping && <HungerAppearance kind={kind} tier={t.food} />}
    </>
  );
}
export function CareFace({
  kind,
  care,
  level,
  sleeping,
  look,
  anticipating,
  offsetY,
}: {
  kind: PetKind;
  care?: Care;
  level: number;
  sleeping: boolean;
  look: { x: number; y: number };
  anticipating?: boolean;
  offsetY: number;
}) {
  if (!care || sleeping || level === 5) return null;
  return (
    <HappinessExpression
      kind={kind}
      care={care}
      look={{ x: look.x, y: look.y + offsetY }}
      anticipating={anticipating}
    />
  );
}
