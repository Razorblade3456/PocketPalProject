import { MochiEyes, MochiMouth } from "./MochiFace";
import { useId, useState, useEffect, useRef, type Ref } from "react";
import { motion } from "motion/react";
import {
  SUPPLIES,
  type Care,
  type Category,
  type PetKind,
  type Supply,
} from "./model";
import { OutfitLayer, type Equipped } from "./Outfits";
import type { IncomingFood } from "./Inventory";
import { careTier, excellentCare } from "./careVisuals";
import { CareBody, CareSurface, CareFace, CareRecovery } from "./CareLayers";
import { CareGuide } from "./CareGuide";
import { Rattle } from "./Rattle";
import type { FaceAction } from "./petExpression";
export const stages = [
  "Healthy",
  "Tired",
  "Unwell",
  "Zombie-like",
  "Critical",
  "Dead",
];
export const pets: Record<PetKind, { name: string; description: string }> = {
  mochi: { name: "Mochi", description: "Cheerful little felt monster" },
  pippin: { name: "Pippin", description: "Shy, sleepy & affectionate" },
  crumb: { name: "Crumb", description: "Curious, clumsy & always hungry" },
  rattle: {
    name: "Rattle",
    description: "Bratty skull gremlin. Tiny boots, big attitude.",
  },
};
export type ArtProps = {
  action?: FaceAction;
  care?: Care;
  recovering?: Category[];
  equipped?: Equipped;
  anticipating?: boolean;
  level: number;
  sleep: boolean;
  sad: boolean;
  look: { x: number; y: number };
};
function SpookyWear({ kind, level }: { kind: PetKind; level: number }) {
  if (level < 3) return null;
  const critical = level >= 4;
  return (
    <g
      className="spooky-wear"
      data-damage-species={kind}
      data-damage-stage={level}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "mochi" ? (
        <>
          <path
            d={
              critical
                ? "M91 225l15-10 9 8 13-2 10 16-14 17-21-3-9 7-9-14z"
                : "M94 231l12-8 14 7-4 14-17 2z"
            }
            fill="#77685e"
            stroke="#78806a"
            strokeWidth="3"
          />
          <path
            d={
              critical
                ? "M98 231l12-8 10 6 8 8-10 10-16-3z"
                : "M100 232l8-4 6 7-9 6z"
            }
            fill="#c89192"
          />
          <path
            d="M95 227l-8-6m24-4l2-10m14 22l11-2m-36 20l-5 10"
            stroke="#d7d5b7"
            strokeWidth="3"
          />
          <path
            d="M219 174l12 7m-13 1l10 5"
            stroke="#a66266"
            strokeWidth="2.5"
          />
          <path d="M108 245q-4 8 1 10q6-2 0-10" fill="#a66266" />
          {critical && (
            <>
              <path
                d="M203 85l13 8-7 10 13 7-8 11"
                fill="none"
                stroke="#a46970"
                strokeWidth="4"
              />
              <path d="M211 115q-6 9 0 12q6-3 0-12" fill="#a66266" />
              <path
                d="M190 249l17-7 9 13-14 12-16-8z"
                fill="#b77e83"
                stroke="#78806a"
                strokeWidth="3"
              />
              <path
                d="M192 247l5 10m8-14l4 12"
                stroke="#f0dec2"
                strokeWidth="2"
              />
              <ellipse
                cx="112"
                cy="140"
                rx="16"
                ry="20"
                fill="none"
                stroke="#879376"
                strokeWidth="5"
                opacity=".7"
              />
            </>
          )}
        </>
      ) : kind === "pippin" ? (
        <>
          <path
            d={
              critical
                ? "M40 183l16-17 14 9-5 13 17 11-11 19-21-5-15 8z"
                : "M45 189l14-11 15 15-8 15-17-4z"
            }
            fill="#817c84"
            stroke="#86927e"
            strokeWidth="3"
          />
          <path
            d={
              critical
                ? "M47 185l11-10 8 9-5 12 12 5-8 11-15-7z"
                : "M51 190l9-5 8 9-7 9-9-4z"
            }
            fill="#c69aab"
          />
          <path
            d="M44 184l-8-5m24-8l2-11m10 41l10 2m-28 9l-4 10"
            stroke="#e6dac5"
            strokeWidth="3"
          />
          <path
            d="M60 206q-6 9 0 12q6-3 0-12M206 233l12 7"
            fill="#a46b7a"
            stroke="#a46b7a"
            strokeWidth="2"
          />
          {critical && (
            <>
              <path
                d="M241 177l17-9 18 14-11 12 12 13-20 12-15-17z"
                fill="#b98d9b"
                stroke="#7e8a78"
                strokeWidth="3"
              />
              <path
                d="M245 180l14 18m5-25l-13 21m-2 16l15-3"
                stroke="#e5cfbf"
                strokeWidth="2"
              />
              <path
                d="M248 100q-9 15 2 25l-4 9"
                fill="none"
                stroke="#a57782"
                strokeWidth="3"
                strokeDasharray="3 5"
              />
              <path d="M253 212q-5 10 1 12q5-3-1-12" fill="#a46b7a" />
            </>
          )}
        </>
      ) : (
        <>
          <path
            d={
              critical
                ? "M177 77l20-10 17 11-8 13 13 14-17 11-22-11 4-12z"
                : "M181 82l15-7 12 12-9 15-16-8z"
            }
            fill="#81745f"
            stroke="#7e886c"
            strokeWidth="3"
          />
          <path
            d={
              critical
                ? "M185 81l13-6 9 7-8 10 10 9-8 7-12-9z"
                : "M187 84l8-3 7 7-6 8-8-5z"
            }
            fill="#c39382"
          />
          <path
            d="M180 83l-9-4m22-10l-2-8m16 30l10-1m-20 20l-4 7"
            stroke="#e3d1ac"
            strokeWidth="3"
          />
          <path
            d="M204 110q-6 9 0 12q6-3 0-12M91 169l10 7m-12 1l9 5"
            fill="#a56262"
            stroke="#a56262"
            strokeWidth="2"
          />
          {critical && (
            <>
              <path
                d="M100 225l16-10 13 13-6 19-18 4-9-13z"
                fill="#b7857a"
                stroke="#7a8569"
                strokeWidth="3"
              />
              <path
                d="M106 224l6 18m8-19l-11 8m-9 9l22-2"
                stroke="#ebd5b4"
                strokeWidth="2"
              />
              <path d="M110 247q-7 11 0 14q7-4 0-14" fill="#a56262" />
              <path
                d="M148 44l5 17 12-7m-8 8l10 8"
                stroke="#a76e68"
                fill="none"
                strokeWidth="3"
              />
            </>
          )}
        </>
      )}
    </g>
  );
}
function Mochi({
  level,
  sleep,
  sad,
  look,
  equipped,
  anticipating,
  care,
  recovering = [],
  action = null,
}: ArtProps) {
  const texture = useId(),
    belly = useId();
  return (
    <svg
      className="pet-art"
      viewBox="0 0 320 340"
      role="img"
      aria-label={`Original stitched monster, ${stages[level]}`}
    >
      <defs>
        <filter id={texture}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".6"
            numOctaves="3"
            seed="8"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".16" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
        <radialGradient id={belly}>
          <stop stopColor="#f1ecd2" />
          <stop offset="1" stopColor="#ddd8b3" />
        </radialGradient>
      </defs>
      <CareBody
        care={care}
        kind="mochi"
        level={level}
        sleeping={sleep}
        action={action}
      >
        <OutfitLayer kind="mochi" equipped={equipped} back />
        <g className="pet-body" filter={`url(#${texture})`}>
          <path
            d="M83 258 Q55 280 70 304 Q91 320 112 292L121 265M207 264L211 296Q236 315 251 296Q258 280 233 257"
            fill="var(--pet-dark)"
          />

          <path
            className="mochi-outline"
            d={
              level < 1 && (!care || careTier(care.happy) < 2)
                ? "M84 80Q35 48 64 32Q86 19 111 65Q146 51 190 65Q210 42 232 48Q250 66 232 86Q258 114 253 194L245 249Q241 284 202 291L111 289Q72 283 68 247L65 148Q64 103 84 80"
                : level < 3
                  ? "M84 80Q47 56 57 94Q74 113 99 84Q146 51 190 65Q244 65 262 105Q249 118 232 86Q258 114 253 194L245 249Q241 284 202 291L111 289Q72 283 68 247L65 148Q64 103 84 80"
                  : "M84 80Q35 100 56 127Q80 131 99 84Q146 51 190 65Q266 89 263 135Q240 147 232 86Q258 114 253 194L245 249Q241 284 202 291L111 289Q72 283 68 247L65 148Q64 103 84 80"
            }
            fill="var(--pet)"
            stroke="var(--pet-dark)"
            strokeWidth="3"
          />
          <path
            d="M91 93Q120 67 155 75M209 83Q235 108 232 140M81 229Q84 267 115 271"
            fill="none"
            stroke="#e8edcf"
            strokeWidth="3"
            strokeDasharray="5 7"
            opacity=".75"
          />
          <ellipse
            cx="160"
            cy="222"
            rx={64 * (1 - careTier(care?.food ?? 100) * 0.13)}
            ry={49 * (1 - careTier(care?.food ?? 100) * 0.06)}
            fill={`url(#${belly})`}
          />
          <path
            d="M126 257L191 257"
            stroke="#b7b18a"
            strokeDasharray="4 5"
            fill="none"
          />
          <path
            d="M214 229l22 8-9 25-22-9z"
            fill={level > 1 ? "#959b83" : "#c8cda3"}
            stroke="#77866c"
            strokeDasharray="4 3"
          />
          {level > 1 && (
            <path
              d="M90 178l23 12-17 19m116 41l18-13m-4 4l8 6m-12-2l7 7"
              stroke="#626e60"
              strokeWidth="3"
              fill="none"
            />
          )}
          {level >= 4 && (
            <g stroke="#636f59" strokeWidth="3" fill="none">
              <path d="M92 238l17-11 9 17-12 8z" fill="#6f7965" />
              <path d="M92 237l-8-8m21-2l3-9m9 20l10 1M210 82l-9 13 10 8-8 13" />
            </g>
          )}
          <SpookyWear kind="mochi" level={level} />
          <g fill="var(--pet)">
            <path
              className="pet-arm arm-left"
              d="M76 160Q35 158 40 208Q46 224 67 207L89 188"
            />
            <path
              className="pet-arm arm-right"
              d="M241 160Q282 155 281 199Q278 225 257 209L232 186"
            />
          </g>
        </g>
        <CareSurface kind="mochi" care={care} level={level} sleeping={sleep} />
        <OutfitLayer kind="mochi" equipped={equipped} />
        {(!care || sleep || level === 5) && (
          <g
            transform={`translate(${look.x},${look.y + (level >= 3 ? 6 : 0)})`}
            className="face"
            data-active-face="base"
          >
            <g className={sleep || level === 5 ? undefined : "eyes"}>
              <MochiEyes level={level} mood={sad ? 2 : 0} sleep={sleep} />
            </g>
            <ellipse
              cx="94"
              cy="174"
              rx="15"
              ry="8"
              fill="#e5a69b"
              opacity=".75"
            />
            <ellipse
              cx="224"
              cy="166"
              rx="15"
              ry="8"
              fill="#e5a69b"
              opacity=".75"
            />
            <g className="mouth">
              <MochiMouth
                variant={
                  level === 5
                    ? "dead"
                    : sleep
                      ? "sleep"
                      : sad || level >= 2
                        ? "frown"
                        : "open"
                }
              />
            </g>
          </g>
        )}
        <CareFace
          kind="mochi"
          care={care}
          level={level}
          sleeping={sleep}
          look={look}
          anticipating={anticipating}
          action={action}
          offsetY={level >= 3 ? 6 : 0}
        />
        {level !== 5 && <CareRecovery changes={recovering} />}
        {sleep && (
          <text x="240" y="65" fill="#7e91b2" fontSize="26">
            z z
          </text>
        )}
        {level === 5 && (
          <g className="ghost">
            <path
              d="M139 70q0-25 21-25t21 25v25l-10-7-10 7-10-7-12 7z"
              fill="#fff"
              opacity=".8"
            />
            <circle cx="154" cy="65" r="3" />
            <circle cx="168" cy="65" r="3" />
          </g>
        )}
      </CareBody>
    </svg>
  );
}
function Eyes({
  level,
  sleep,
  sad,
  x = 117,
  y = 150,
  gap = 86,
  large = false,
}: {
  level: number;
  sleep: boolean;
  sad: boolean;
  x?: number;
  y?: number;
  gap?: number;
  large?: boolean;
}) {
  if (level === 5)
    return (
      <g stroke="#55564c" strokeWidth="5" strokeLinecap="round">
        <path
          d={`M${x - 8} ${y - 8}l16 16m0-16l-16 16m${gap - 0} -16l16 16m0-16l-16 16`}
        />
      </g>
    );
  return (
    <g data-eye-state={sleep ? "sleeping" : "open"}>
      {[x, x + gap].map((cx, i) => (
        <g key={cx}>
          {sleep ? (
            <path
              d={`M${cx - 12} ${y}q12 12 24 0`}
              stroke="#544b4b"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
            />
          ) : (
            <>
              <ellipse
                cx={cx}
                cy={y + (level > 2 && i ? 6 : 0)}
                rx={large ? 18 : 12}
                ry={sad || level > 2 ? 10 : large ? 23 : 17}
                fill="#4d4247"
              />
              <ellipse
                cx={cx + 5}
                cy={y - 6}
                rx={large ? 6 : 4}
                ry={large ? 8 : 5}
                fill="#fff8e8"
              />
              {(level === 1 || sad) && (
                <path
                  d={`M${cx - 20} ${y - 13}q20 -9 40 0`}
                  stroke="var(--pet)"
                  strokeWidth="13"
                  fill="none"
                />
              )}
            </>
          )}
          <ellipse
            cx={cx + (i ? 13 : -13)}
            cy={y + 25}
            rx="14"
            ry="7"
            fill="#e4aaa4"
            opacity=".7"
          />
        </g>
      ))}
    </g>
  );
}
function Ghost() {
  return (
    <g className="ghost">
      <path
        d="M142 70q0-25 20-25t20 25v25l-10-7-10 7-10-7-10 7z"
        fill="#fffdf3"
        opacity=".8"
      />
      <circle cx="155" cy="66" r="3" fill="#7c8382" />
      <circle cx="169" cy="66" r="3" fill="#7c8382" />
    </g>
  );
}
function Pippin({
  level,
  sleep,
  sad,
  look,
  equipped,
  anticipating,
  care,
  recovering = [],
  action = null,
}: ArtProps) {
  const texture = useId();
  const folded = sad || sleep || (!!care && careTier(care.happy) >= 2);
  return (
    <svg
      className="pet-art"
      viewBox="0 0 320 340"
      role="img"
      aria-label={`Pippin the felt moth, ${stages[level]}`}
    >
      <defs>
        <filter id={texture}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".58"
            numOctaves="3"
            seed="12"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".13" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <CareBody
        care={care}
        kind="pippin"
        level={level}
        sleeping={sleep}
        action={action}
      >
        <OutfitLayer kind="pippin" equipped={equipped} back />
        <g filter={`url(#${texture})`}>
          <g
            className={`moth-wings ${folded ? "wrapped" : ""}`}
            style={{
              transformOrigin: "160px 202px",
              transform:
                level > 1
                  ? `translateY(${level * 5}px) scaleY(${1 - level * 0.04})`
                  : undefined,
            }}
          >
            <path
              className="wing-left pet-arm arm-left"
              d={
                level >= 3
                  ? "M131 167Q56 94 27 150L40 169 28 181 45 193 32 216Q35 256 108 249L142 221Z"
                  : "M131 167Q55 87 28 150Q6 199 36 232Q69 266 140 221Z"
              }
              fill="var(--wing)"
              stroke="var(--pet-dark)"
              strokeWidth="3"
            />
            <path
              className="wing-right pet-arm arm-right"
              d={
                level >= 3
                  ? "M189 167Q264 94 293 150L280 169 292 181 275 193 288 216Q285 256 212 249L178 221Z"
                  : "M189 167Q265 87 292 150Q314 199 284 232Q251 266 180 221Z"
              }
              fill="var(--wing)"
              stroke="var(--pet-dark)"
              strokeWidth="3"
            />
            <path
              d="M52 160q-10 45 47 62M268 160q10 45-47 62"
              stroke="#e8deef"
              strokeWidth="3"
              strokeDasharray="5 6"
              fill="none"
            />
            {level > 1 && (
              <path
                d="M52 204l18-10 8 15-17 9zm190-18l17 12-10 14-17-12z"
                fill="#9b9e8b"
                stroke="#747c70"
                strokeDasharray="3 4"
              />
            )}
          </g>
          <ellipse cx="131" cy="282" rx="17" ry="12" fill="var(--pet-dark)" />
          <ellipse cx="189" cy="282" rx="17" ry="12" fill="var(--pet-dark)" />
          <g
            className="antennae"
            stroke="var(--pet-dark)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          >
            <path
              d={
                level >= 3 || (!!care && careTier(care.water) >= 2)
                  ? "M127 115Q105 60 72 94"
                  : "M127 115Q119 49 92 41"
              }
            />
            <path
              d={
                level >= 3 || (!!care && careTier(care.water) >= 2)
                  ? "M193 115Q218 66 251 106"
                  : "M193 115Q201 49 228 41"
              }
            />
          </g>
          <g fill="var(--wing)" stroke="var(--pet-dark)" strokeWidth="2">
            <path
              d={
                level >= 3 || (!!care && careTier(care.water) >= 2)
                  ? "M70 76q-20 3-17 21l7 1-3 9 15-2 5 6 10-15-3-15z"
                  : "M92 23q-18-7-23 9l5 5-8 8 9 5 4 12 13-6 12 3 2-12 7-8-9-6z"
              }
            />
            <path
              d={
                level >= 3 || (!!care && careTier(care.water) >= 2)
                  ? "M251 87q21 3 18 21l-7 1 3 9-15-2-5 6-10-15 3-15z"
                  : "M228 23q18-7 23 9l-5 5 8 8-9 5-4 12-13-6-12 3-2-12-7-8 9-6z"
              }
            />
          </g>
          <path
            d="M94 123Q105 91 128 99L139 90 151 99 163 91 175 101 189 96Q224 97 231 135L240 141 234 155 243 167 236 180 242 198 233 210 235 226 222 235Q216 279 160 282Q104 279 98 242L86 231 91 216 80 203 87 186 80 173 87 159 82 143Z"
            fill="var(--pet)"
            stroke="var(--pet-dark)"
            strokeWidth="2"
          />
          <path
            d="M115 237q45 25 90 0M101 124q23-18 43-14"
            stroke="#faf3dd"
            fill="none"
            strokeWidth="3"
            strokeDasharray="4 6"
          />
          {level > 1 && (
            <path
              d="M188 227l21-9 12 18-25 12z"
              fill={level >= 4 ? "#7e8d77" : "#b7bba3"}
              stroke="#7e8b76"
              strokeDasharray="3 4"
            />
          )}
          {level >= 4 && (
            <g stroke="#616e60" strokeWidth="3">
              <path d="M100 216l17 8-13 15 9 8m88-124l-9 12 8 10" fill="none" />
              <path d="M206 231l15 6m-22-2l-2 10" />
            </g>
          )}
        </g>
        <CareSurface kind="pippin" care={care} level={level} sleeping={sleep} />
        <OutfitLayer kind="pippin" equipped={equipped} />
        <SpookyWear kind="pippin" level={level} />
        {(!care || sleep || level === 5) && (
          <g
            className="face"
            data-active-face="base"
            transform={`translate(${look.x},${look.y})`}
          >
            <Eyes
              level={level}
              sleep={sleep}
              sad={sad}
              x={124}
              gap={72}
              y={159}
              large
            />
            <path
              className="mouth"
              d={
                anticipating
                  ? "M149 201q11-10 22 0q0 20-22 0Z"
                  : sad || level > 1
                    ? "M150 209q10-8 20 0"
                    : "M151 201q9 12 18 0"
              }
              stroke="#7f697c"
              strokeWidth="4"
              fill={anticipating ? "#766274" : "none"}
              strokeLinecap="round"
            />
          </g>
        )}
        <CareFace
          kind="pippin"
          care={care}
          level={level}
          sleeping={sleep}
          look={look}
          anticipating={anticipating}
          action={action}
          offsetY={0}
        />
        {level !== 5 && <CareRecovery changes={recovering} />}
        {sleep && (
          <text x="242" y="88" fontSize="24" fill="#9e91b3">
            z z
          </text>
        )}
        {level === 5 && <Ghost />}
      </CareBody>
    </svg>
  );
}
function Crumb({
  level,
  sleep,
  sad,
  look,
  equipped,
  anticipating,
  care,
  recovering = [],
  action = null,
}: ArtProps) {
  const texture = useId(),
    curl = sleep || level === 1 || (!!care && careTier(care.happy) >= 2);
  return (
    <svg
      className={`pet-art ${curl ? "curled" : ""}`}
      viewBox="0 0 320 340"
      role="img"
      aria-label={`Crumb the woodland mushroom bear, ${stages[level]}`}
    >
      <defs>
        <filter id={texture}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".5"
            numOctaves="3"
            seed="22"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".16" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <CareBody
        care={care}
        kind="crumb"
        level={level}
        sleeping={sleep}
        action={action}
      >
        <OutfitLayer kind="crumb" equipped={equipped} back />
        <g
          filter={`url(#${texture})`}
          transform={curl && !care ? "translate(0 37) scale(1 .87)" : undefined}
        >
          <g fill="var(--pet-dark)">
            <ellipse cx="117" cy="287" rx="23" ry="16" />
            <ellipse cx="202" cy="287" rx="23" ry="16" />
          </g>

          <path
            d="M95 162Q89 134 115 117Q160 92 206 122Q233 142 225 184L228 239Q226 286 163 293Q93 290 92 244Z"
            fill="var(--pet)"
            stroke="var(--pet-dark)"
            strokeWidth="3"
          />
          <ellipse
            cx="161"
            cy="243"
            rx={44 * (1 - careTier(care?.food ?? 100) * 0.14)}
            ry={36 * (1 - careTier(care?.food ?? 100) * 0.07)}
            fill="#ddc59c"
          />
          <path
            d="M128 260q35 17 64-3"
            stroke="#af9276"
            strokeDasharray="4 5"
            fill="none"
          />
          <g
            className="crumb-ears"
            fill="var(--pet-dark)"
            stroke="#9b775f"
            strokeWidth="2"
          >
            <path
              d={
                level > 1 || sad || (!!care && careTier(care.water) >= 2)
                  ? "M99 116Q50 114 66 165Q85 178 103 144Z"
                  : "M99 112Q58 65 53 116Q53 143 96 144Z"
              }
            />
            <path
              d={
                level > 1 || sad || (!!care && careTier(care.water) >= 2)
                  ? "M221 116Q270 114 254 165Q235 178 217 144Z"
                  : "M221 112Q262 65 267 116Q267 143 224 144Z"
              }
            />
          </g>
          <path
            d={
              level >= 4
                ? "M60 121Q67 45 143 38L154 55 163 38Q250 40 263 116L248 124 237 115 226 131Q160 147 92 131Z"
                : "M58 121Q68 37 159 37Q249 37 264 121Q252 141 160 140Q68 142 58 121Z"
            }
            fill="var(--cap)"
            stroke="var(--pet-dark)"
            strokeWidth="3"
          />
          <path
            d="M72 122Q160 141 250 121"
            stroke="#e0c298"
            strokeWidth="4"
            fill="none"
          />
          <g fill={level > 1 ? "#b1b09a" : "#eddbb3"}>
            <ellipse
              cx="112"
              cy="79"
              rx="16"
              ry="12"
              transform="rotate(-20 112 79)"
            />
            <ellipse
              cx="196"
              cy="69"
              rx="20"
              ry="12"
              transform="rotate(17 196 69)"
            />
            <ellipse cx="222" cy="106" rx="10" ry="7" />
          </g>
          <path
            d="M91 109q17-47 65-53"
            stroke="#e3c29c"
            strokeWidth="2"
            strokeDasharray="4 6"
            fill="none"
          />
          {level > 1 && (
            <path
              d="M189 249l27-10 8 24-27 8z"
              fill="#9d9d82"
              stroke="#777a65"
              strokeDasharray="3 4"
            />
          )}
          {level >= 3 && (
            <path
              d="M109 105l14 9 10-12m59-53l-7 15 11 8m12 176l-8 17m-2-13l14 3"
              stroke="#6b725a"
              strokeWidth="3"
              fill="none"
            />
          )}
          {level >= 4 && (
            <path
              d="M92 222l18-6 7 14-19 8z"
              fill="#6f7d66"
              stroke="#66715c"
              strokeDasharray="3 4"
            />
          )}
          <SpookyWear kind="crumb" level={level} />
          <g fill="var(--cap)" stroke="var(--pet-dark)" strokeWidth="3">
            <path
              className="pet-arm arm-left"
              d="M106 181Q65 182 65 228Q79 242 98 218"
            />
            <path
              className="pet-arm arm-right"
              d="M215 181Q254 182 255 228Q242 242 223 218"
            />
          </g>
        </g>
        <CareSurface kind="crumb" care={care} level={level} sleeping={sleep} />
        <OutfitLayer kind="crumb" equipped={equipped} />
        {(!care || sleep || level === 5) && (
          <g
            className="face"
            data-active-face="base"
            transform={`translate(${look.x},${look.y + (curl ? 17 : 0)})`}
          >
            <Eyes
              level={level}
              sleep={sleep}
              sad={sad}
              x={122}
              gap={77}
              y={167}
            />
            <path d="M151 185q10-5 20 0l-10 12z" fill="#6c5142" />
            <path
              className="mouth"
              d={
                anticipating
                  ? "M148 204q13-11 26 0q0 24-26 0Z"
                  : sad || level > 1
                    ? "M149 211q12-9 24 0"
                    : "M161 197v9m-12-2q12 15 24 0"
              }
              fill={anticipating ? "#6c5142" : "none"}
              stroke="#7c5b4b"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}
        <CareFace
          kind="crumb"
          care={care}
          level={level}
          sleeping={sleep}
          look={look}
          anticipating={anticipating}
          action={action}
          offsetY={curl && !care ? 17 : 0}
        />
        {level !== 5 && <CareRecovery changes={recovering} />}
        {sleep && (
          <text x="245" y="81" fontSize="24" fill="#a89980">
            z z
          </text>
        )}
        {level === 5 && <Ghost />}
      </CareBody>
    </svg>
  );
}
function PetDrawing({ kind, level }: { kind: PetKind; level: number }) {
  const props = { level, sleep: false, sad: false, look: { x: 0, y: 0 } };
  return kind === "mochi" ? (
    <Mochi {...props} />
  ) : kind === "pippin" ? (
    <Pippin {...props} />
  ) : kind === "rattle" ? (
    <Rattle {...props} />
  ) : (
    <Crumb {...props} />
  );
}
export function Pet({
  level,
  kind = "mochi",
  sleep = false,
  reaction = "",
  onPet = () => {},
  preview = false,
  calm = false,
  equipped = {},
  incoming,
  feeding,
  petRef,
  care,
}: {
  level: number;
  kind?: PetKind;
  sleep?: boolean;
  reaction?: string;
  onPet?: () => void;
  preview?: boolean;
  calm?: boolean;
  equipped?: Equipped;
  incoming?: IncomingFood | null;
  feeding?: Supply | null;
  petRef?: Ref<HTMLButtonElement>;
  care?: Care;
}) {
  const [look, setLook] = useState({ x: 0, y: 0 });
  const excited = !!incoming?.near && level !== 5;
  const previousCare = useRef(care);
  const [recovering, setRecovering] = useState<Category[]>([]);
  useEffect(() => {
    const previous = previousCare.current;
    previousCare.current = care;
    if (!care || !previous || level === 5) return;
    const improved = (["food", "water", "clean", "happy"] as Category[]).filter(
      (key) => care[key] > previous[key],
    );
    if (!improved.length) return;
    setRecovering(improved);
    const timer = window.setTimeout(() => setRecovering([]), 1800);
    return () => window.clearTimeout(timer);
  }, [care?.food, care?.water, care?.clean, care?.happy, level]);
  useEffect(() => {
    if (!incoming || level === 5 || preview) return;
    const el = document.querySelector(".room .pet-button");
    const r = el?.getBoundingClientRect();
    if (r)
      setLook({
        x: (incoming.x - r.left - r.width / 2) / 35,
        y: (incoming.y - r.top - r.height / 2) / 45,
      });
  }, [incoming, level, preview]);
  const sad = reaction.startsWith("−");
  const careAction: FaceAction =
    level === 5
      ? null
      : sad
        ? "hurt"
        : feeding
          ? SUPPLIES[feeding].category
          : reaction.startsWith("♥")
            ? "happy"
            : null;
  const art = {
    action: careAction,
    care: level === 5 ? undefined : care,
    recovering: [
      ...new Set([
        ...recovering,
        ...(feeding ? [SUPPLIES[feeding].category] : []),
      ]),
    ],
    equipped,
    anticipating:
      excited && !!incoming && SUPPLIES[incoming.item].category === "food",
    level,
    sleep: level !== 5 && sleep && !excited && !feeding,
    sad,
    look: level === 5 || preview ? { x: 0, y: 0 } : look,
  };
  const animated = level !== 5 && !preview && !!reaction;
  return (
    <motion.button
      ref={petRef}
      type="button"
      tabIndex={preview ? -1 : 0}
      disabled={preview}
      aria-label={
        preview ? `${pets[kind].name}: ${stages[level]}` : "Pet your companion"
      }
      className={`pet-button species-${kind} stage-${level} ${sleep ? "sleeping" : ""} ${calm ? "calm" : ""} ${excited ? "food-approach" : ""} ${careAction === "food" ? "is-eating" : careAction === "water" ? "is-drinking" : careAction === "clean" ? "is-cleaning" : careAction === "happy" ? "is-playing" : ""} ${reaction.includes("favorite") ? "favorite-reaction" : ""} ${sad ? "hurt" : ""} ${preview ? "pet-preview" : ""}`}
      onPointerMove={(e) => {
        if (preview || level === 5) return;
        const r = e.currentTarget.getBoundingClientRect();
        setLook({
          x: (e.clientX - r.left - r.width / 2) / 35,
          y: (e.clientY - r.top - r.height / 2) / 45,
        });
      }}
      onPointerLeave={() => setLook({ x: 0, y: 0 })}
      onClick={onPet}
      animate={
        animated
          ? sad
            ? { x: [0, -6, 5, -3, 0], y: [0, 5, 0], rotate: [0, -4, 3, 0] }
            : careAction === "clean"
              ? { y: [0, 2, 0], rotate: [0, -2, 2, 0] }
              : careAction === "water"
                ? { y: [0, 2, 0], rotate: [0, 1, 0] }
                : kind === "pippin"
                  ? { y: [0, -30, -24, 0], rotate: [0, -3, 3, 0] }
                  : kind === "crumb"
                    ? { y: [0, -8, 0, -8, 0], rotate: [0, -12, 12, -8, 0] }
                    : { y: [0, -24, 0, -12, 0], rotate: [0, -6, 6, 0] }
          : { x: 0, y: 0, rotate: 0 }
      }
      transition={{ duration: sad ? 0.55 : 0.85 }}
    >
      {kind === "mochi" ? (
        <Mochi {...art} />
      ) : kind === "pippin" ? (
        <Pippin {...art} />
      ) : kind === "rattle" ? (
        <Rattle {...art} />
      ) : (
        <Crumb {...art} />
      )}{" "}
      {reaction && !preview && level !== 5 && (
        <span
          className={`pet-reaction ${sad ? "damage-reaction" : ""}`}
          role="status"
        >
          {reaction}
        </span>
      )}
    </motion.button>
  );
}
export function PetChoices({
  value,
  onChange,
}: {
  value: PetKind;
  onChange: (kind: PetKind) => void;
}) {
  return (
    <fieldset className="pet-choices">
      <legend>Choose your pet</legend>
      <div>
        {(Object.keys(pets) as PetKind[]).map((kind) => (
          <label className={value === kind ? "chosen" : ""} key={kind}>
            <input
              type="radio"
              name="pet-kind"
              value={kind}
              checked={value === kind}
              onChange={() => onChange(kind)}
            />
            <div className={`choice-art species-${kind} stage-0`}>
              <PetDrawing kind={kind} level={0} />
            </div>
            <b>{pets[kind].name}</b>
            <small>{pets[kind].description}</small>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export function LifeGuide({
  kind,
  actual,
  realCare = excellentCare,
  equipped = {},
}: {
  kind: PetKind;
  actual: number;
  realCare?: Care;
  equipped?: Equipped;
}) {
  const [selected, setSelected] = useState(actual);
  const details = [
    "Bright eyes, soft stitches, and a heart full of small adventures.",
    "A slower little pal. Some rest and gentle care help.",
    "Faded fabric and drooping features ask for a little attention.",
    "Loose stitches, ragged edges, and a lovable shamble. There is time to recover.",
    "Torn fabric and very slow movements. Every little bit of care helps.",
    "Still paws and a floating ghost. Revive your friend to welcome them home.",
  ];
  return (
    <>
      <span className="eyebrow">THE TINY CREATURE-CARE GUIDE</span>
      <h2>Pet health & life stages</h2>
      <p>
        Meet every side of {pets[kind].name}. This is a preview only — your real
        pal and progress stay just as they are.
      </p>
      <div className="guide-preview">
        <Pet kind={kind} level={selected} preview />
        <h3>{stages[selected]}</h3>
        <p>{details[selected]}</p>
        <span className="preview-badge">
          Preview only · actual stage: {stages[actual]}
        </span>
      </div>
      <div
        className="stage-gallery"
        role="group"
        aria-label="Preview a life stage"
      >
        {stages.map((name, i) => (
          <button
            className={selected === i ? "selected" : ""}
            key={name}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <div
              aria-hidden="true"
              className={`stage-tile-art species-${kind} stage-${i}`}
            >
              <PetDrawing kind={kind} level={i} />
            </div>
            <span>{i + 1}</span>
            {name}
          </button>
        ))}
      </div>
      <CareGuide kind={kind} realCare={realCare} equipped={equipped} />
      <p className="fine">
        Completed tasks earn 5 coins. Buy food, water or soap, then use it for
        +15 care and +4 happiness. Missed tasks take up to 8 care. Missed-task
        damage is capped at 16 per care category and 24 total each day; passive
        decay is separate. A miss alone cannot kill your pal. Cozy mode always
        keeps a little energy in reserve.
      </p>
    </>
  );
}
