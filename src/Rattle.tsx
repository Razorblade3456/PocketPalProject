import { useId } from "react";
import type { ArtProps } from "./Pets";
import { CareBody, CareFace, CareSurface, CareRecovery } from "./CareLayers";
import { OutfitLayer } from "./Outfits";
import { excellentCare } from "./careVisuals";

/** Rattle's original angular skull mask and ragged punk silhouette; two arms, two legs. */
export function Rattle({
  level,
  sleep,
  sad,
  look,
  equipped,
  care,
  recovering = [],
  anticipating,
  action = null,
}: ArtProps) {
  const texture = useId();
  const asleep = sleep && level !== 5;
  const faceCare = care || {
    ...excellentCare,
    happy: [100, 70, 45, 25, 10, 0][level],
  };
  return (
    <svg
      className="pet-art"
      viewBox="0 0 320 340"
      role="img"
      aria-label={`Rattle the skull gremlin, stage ${level}`}
    >
      <defs>
        <filter id={texture}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".65"
            numOctaves="2"
            stitchTiles="stitch"
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .12 0"
            result="faded"
          />
          <feComposite
            in="faded"
            in2="SourceGraphic"
            operator="in"
            result="clipped"
          />
          <feBlend in="SourceGraphic" in2="clipped" mode="multiply" />
        </filter>
      </defs>
      <CareBody
        kind="rattle"
        care={care}
        level={level}
        sleeping={asleep}
        action={action}
      >
        <OutfitLayer kind="rattle" equipped={equipped} back />
        <g
          className="pet-body"
          stroke="#373139"
          strokeWidth="3"
          strokeLinejoin="round"
          filter={`url(#${texture})`}
        >
          <path
            data-leg="left"
            d="M125 267l-7 20-13 7-2 14 40 0 3-16 5-22z"
            fill="#26252b"
          />
          <path
            data-leg="right"
            d="M172 269l3 23 5 16 37-2-3-15-13-6-3-17z"
            fill="#26252b"
          />
          <path
            d="M108 302h31m43-2 29-1M120 285l18 2m43-1 15-2"
            fill="none"
            stroke="#888475"
            strokeWidth="3"
          />
          <path
            d="M119 211l26-9 38 5 19 9 11 51-13-4-3 21-18-10-13 14-14-13-19 9-6-17-19 4z"
            fill={level >= 3 ? "#484348" : "#2b2a30"}
          />
          <path
            d="M135 213l-7 28-6 21m61-46 12 28M141 225l31 3"
            fill="none"
            stroke="#5d4b64"
            strokeWidth="4"
          />
          <path
            d="M137 239l24-5 8 23-24 6z"
            fill="#602c42"
            stroke="#a08a89"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M146 243l11 12m-12-1 11-12"
            stroke="#bdac9b"
            strokeWidth="2"
          />
          <path
            d="M181 249l7 5-11 13-7-6z"
            fill="none"
            stroke="#a7a493"
            strokeWidth="2"
          />
          <path d="M130 211l4 14 48 2 8-14" fill="#342544" />
          <path
            d="M139 215l4 8 4-8m18 1 4 8 4-8"
            fill="#a2a28a"
            stroke="none"
          />
          <path
            className="pet-arm arm-left"
            d="M115 217l-17 6-14 24 2 14 8-6 3 10 8-4 2-12 15-15z"
            fill="#c9c4ae"
          />
          <path
            className="pet-arm arm-right"
            d="M205 217l15 9 12 22-1 14-8-6-4 10-7-5-2-13-12-14z"
            fill="#c9c4ae"
          />
          <path
            data-skull-mask="angular"
            d="M77 105l14-25 34-17 36-5 42 8 30 20 15 28-6 23 13 19-11 17-22 2-11 29-24 11-17-4-17 9-23-8-18-18-6-18-22-2-13-18 12-22z"
            fill={level >= 3 ? "#b6b6a3" : "#d9d5bd"}
          />
          <path
            d="M91 94l36-19 31-6 34 5m-97 81 19 7-1 16m112-23-19 9-3 17"
            fill="none"
            stroke="#aca793"
            strokeWidth="3"
          />
          <path
            d="M189 73l-10 21 12 10-13 13m13-13 13 1M108 99l-8 10 5 8"
            fill="none"
            stroke="#79737a"
            strokeWidth="2.5"
          />
          <path
            d="M83 149l10-2m-8 9 11-3m-7 10 10-4m118-9 13 4m-15 4 12 5"
            stroke="#8e8182"
            strokeWidth="2"
          />
          <path d="M153 155l8-9 8 11-9 5z" fill="#39343e" stroke="none" />
          {level >= 3 && (
            <g
              data-damage-species="rattle"
              data-damage-stage={level}
              fill="none"
              stroke="#746773"
              strokeWidth="3"
            >
              <path d="M101 82l13 16-8 13 14 10m65 158 9-15-6-9" />
              {level >= 4 && (
                <path d="M233 127l-18 10 9 14-19 6m-72 43 11-14m-2 18 11-15" />
              )}
            </g>
          )}
        </g>
        <CareSurface
          kind="rattle"
          care={care}
          level={level}
          sleeping={asleep}
        />
        <OutfitLayer kind="rattle" equipped={equipped} />
        {asleep || level === 5 ? (
          <g
            className="face"
            data-active-face="base"
            data-eye-variant={level === 5 ? "dead" : "sleep"}
            stroke="#29262e"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
          >
            {level === 5 ? (
              <path d="M103 123l24 22m0-22-24 22m91-22 24 22m0-22-24 22" />
            ) : (
              <path d="M99 134l17 7 17-9m54 0 17 8 18-8" />
            )}
            <path
              data-mouth-variant={level === 5 ? "dead" : "sleep"}
              d="M140 183l13-3 14 3 14-5"
            />
          </g>
        ) : (
          <CareFace
            kind="rattle"
            care={faceCare}
            level={level}
            sleeping={false}
            look={look}
            anticipating={anticipating}
            action={sad ? "hurt" : action}
            offsetY={level >= 3 ? 5 : 0}
          />
        )}
        {level !== 5 && <CareRecovery changes={recovering} />}
        {asleep && (
          <text x="245" y="76" fontSize="24" fill="#a28ab8">
            z z
          </text>
        )}
        {level === 5 && (
          <g className="ghost" fill="#d9d5bd">
            <path d="M144 64q0-23 16-23t16 23v25l-8-6-8 6-8-6-8 6z" />
            <circle cx="154" cy="60" r="2" fill="#342544" />
            <circle cx="166" cy="60" r="2" fill="#342544" />
          </g>
        )}
      </CareBody>
    </svg>
  );
}
