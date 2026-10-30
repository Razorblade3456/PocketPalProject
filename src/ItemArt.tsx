import { useId } from "react";
import {
  isOutfit,
  EXTRA_SUPPLY_IDS,
  type ShopItem,
  type Outfit,
} from "./catalog";
import { ExtraSupplyArt } from "./ExtraSupplyArt";
export function OutfitGlyph({ item }: { item: Outfit }) {
  return (
    <g stroke="#80745f" strokeWidth="2" strokeLinejoin="round">
      {item === "beanie" ? (
        <>
          <path d="M22 57q0-38 28-38t28 38" fill="#b5a4c6" />
          <circle cx="50" cy="17" r="9" fill="#ddd0e3" />
          <rect x="18" y="53" width="64" height="16" rx="5" fill="#c9b8d6" />
          <path
            d="M29 56v10m11-10v10m11-10v10m11-10v10m11-10v10"
            stroke="#e7ddeb"
          />
        </>
      ) : item === "bowtie" ? (
        <>
          <path
            d="M48 47L20 28q-8 20 0 40l28-15m4-6l28-19q8 20 0 40L52 53"
            fill="#c6817c"
          />
          <rect x="43" y="41" width="15" height="18" rx="5" fill="#dfaaa0" />
          <path
            d="M22 37l17 10m22 0l17-10"
            stroke="#edc8b5"
            strokeDasharray="3 3"
          />
        </>
      ) : item === "scarf" ? (
        <>
          <path d="M24 25h53v19H56l5 40-21 2-5-42H24z" fill="#b4bea0" />
          <path
            d="M29 33h43M44 51l13-2m-12 14l13-2M41 84v8m7-9v8m8-8v8"
            stroke="#e4dfb9"
            strokeWidth="3"
          />
        </>
      ) : item === "backpack" ? (
        <>
          <path d="M29 32q0-15 21-15t21 15" fill="none" strokeWidth="6" />
          <rect x="20" y="30" width="60" height="58" rx="16" fill="#bb9a78" />
          <path d="M20 43q30 20 60 0" fill="#d4b393" />
          <rect x="30" y="58" width="40" height="23" rx="6" fill="#cfb08c" />
          <path d="M25 37v40m50-40v40" stroke="#f1d3af" strokeDasharray="3 4" />
          <rect x="45" y="43" width="10" height="10" rx="2" fill="#ede0b8" />
        </>
      ) : item === "mushroomHat" ? (
        <>
          <path d="M15 57q4-41 35-41t35 41q-35 17-70 0" fill="#bd8c78" />
          <path d="M33 61l-3 16q21 11 40 0l-3-16" fill="#e7d9b3" />
          <g fill="#eadbc0" stroke="none">
            <ellipse cx="34" cy="39" rx="7" ry="5" />
            <ellipse cx="61" cy="30" rx="8" ry="5" />
            <circle cx="70" cy="48" r="5" />
          </g>
        </>
      ) : item === "pajamas" ? (
        <>
          <path
            d="M29 22L9 44l17 12 8-8v36h32V48l8 8 17-12-20-22-21 8z"
            fill="#a6b7c4"
          />
          <path d="M50 31v49" stroke="#e8dfc6" strokeDasharray="4 4" />
          <g fill="#f0dfb1" stroke="none">
            <path d="M34 40l2 5 5 1-4 4 1 5-5-3-5 3 1-5-4-4 6-1zM65 62l2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1z" />
          </g>
        </>
      ) : item === "crown" ? (
        <>
          <path d="M17 30l18 16 15-26 15 26 18-16-8 43H25z" fill="#d6bf7f" />
          <path d="M25 65h50" stroke="#f1dfab" strokeWidth="5" />
          <g fill="#b699b8">
            <ellipse cx="50" cy="55" rx="5" ry="7" />
            <circle cx="32" cy="56" r="3" />
            <circle cx="68" cy="56" r="3" />
          </g>
        </>
      ) : (
        <>
          <path
            d="M29 23L10 43l14 14 9-9-3 37 13-6 8 8 11-7 9 5-3-37 8 7 14-13-19-20-22 9z"
            fill="#a7b094"
          />
          <path
            d="M35 41l15 8-10 14m20-29l-9 12 15 11"
            fill="none"
            stroke="#7c8b71"
            strokeWidth="3"
          />
          <path
            d="M52 61l13-5 6 15-15 5z"
            fill="#c3b49a"
            strokeDasharray="3 3"
          />
        </>
      )}
    </g>
  );
}
export function ItemArt({
  item,
  size = 80,
}: {
  item: ShopItem;
  size?: number;
}) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="item-art"
      role="img"
      aria-label={item + " illustration"}
    >
      <defs>
        <filter id={id}>
          <feTurbulence baseFrequency=".72" numOctaves="2" seed="9" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".08" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="multiply" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
      </defs>
      <ellipse cx="50" cy="87" rx="31" ry="5" fill="#7a795a" opacity=".09" />
      <g
        filter={`url(#${id})`}
        stroke="#947e63"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {isOutfit(item) ? (
          <OutfitGlyph item={item} />
        ) : EXTRA_SUPPLY_IDS.some((id) => id === item) ? (
          <ExtraSupplyArt item={item} />
        ) : item === "food" ? (
          <>
            <ellipse cx="50" cy="47" rx="33" ry="12" fill="#e3d4b7" />
            <g fill="#aa8661">
              <circle cx="31" cy="45" r="7" />
              <circle cx="48" cy="40" r="8" />
              <circle cx="65" cy="47" r="8" />
              <circle cx="47" cy="50" r="7" />
            </g>
            <path d="M17 47l8 30q25 15 50 0l8-30q-33 20-66 0z" fill="#c9a688" />
            <path
              d="M25 60q25 14 50 0"
              fill="none"
              stroke="#ebc9a5"
              strokeDasharray="4 4"
            />
          </>
        ) : item === "water" || item === "smoothie" ? (
          <>
            <path
              d="M25 28h50L69 82q-19 9-38 0z"
              fill={item === "water" ? "#d7e7de" : "#ddd8ce"}
            />
            <path
              d="M29 45q22-7 42 0l-4 34q-17 6-34 0z"
              fill={item === "water" ? "#9dc5cb" : "#d3a4b8"}
              stroke="none"
            />
            <path d="M35 36l3 32" stroke="#f8f6df" strokeWidth="4" />
            {item === "smoothie" && (
              <>
                <path
                  d="M59 55l9-42h12"
                  fill="none"
                  stroke="#b898af"
                  strokeWidth="5"
                />
                <path d="M22 28q-1-16 14-12l8 8-11 12z" fill="#d8b184" />
              </>
            )}
          </>
        ) : item === "soap" ? (
          <>
            <rect x="20" y="43" width="61" height="37" rx="15" fill="#c8b9d5" />
            <ellipse cx="50" cy="60" rx="16" ry="8" fill="#ded3e5" />
            <path
              d="M28 57q1-7 12-8"
              fill="none"
              stroke="#f7edee"
              strokeWidth="4"
            />
            <g fill="#e7ece1" stroke="#bac9c5">
              <circle cx="28" cy="27" r="10" />
              <circle cx="54" cy="20" r="7" />
              <circle cx="69" cy="33" r="12" />
            </g>
          </>
        ) : item === "burger" ? (
          <>
            <path d="M18 44q3-26 32-26t32 26z" fill="#d9b17b" />
            <path d="M18 68h64q-3 15-32 15T18 68z" fill="#d6a777" />
            <rect x="17" y="52" width="66" height="17" rx="7" fill="#9a7458" />
            <path d="M17 47l11-4 14 8 12-7 16 7 13-6v10H17z" fill="#b5c497" />
            <path d="M19 58h62L64 70 47 60 32 68z" fill="#e4ce82" />
            <path
              d="M34 30l3 4m12-8l1 4m13 1l3-3"
              stroke="#f5e4b5"
              strokeWidth="3"
            />
          </>
        ) : item === "pizza" ? (
          <>
            <path d="M22 28l59 9-39 49z" fill="#e7cf87" />
            <path d="M22 28q27-4 59 9" stroke="#c49a75" strokeWidth="12" />
            <path d="M25 36l14 39 33-35" fill="none" stroke="#f5dfa0" />
            <g fill="#c48d82" stroke="#b77b70">
              <circle cx="43" cy="44" r="7" />
              <circle cx="58" cy="51" r="7" />
              <circle cx="43" cy="65" r="5" />
            </g>
          </>
        ) : item === "cake" ? (
          <>
            <path d="M20 43l35-19 27 18v39l-62 3z" fill="#e0b3bd" />
            <path
              d="M21 56l60-2m-59 16l59-2"
              stroke="#f5e6ce"
              strokeWidth="9"
            />
            <path d="M20 43l35-19 27 18-36 19z" fill="#f4e5d3" />
            <path d="M41 27q1-16 14-12t13 12L54 40z" fill="#cc8d8c" />
            <path d="M47 17l7-7 8 8" fill="#a1b085" stroke="#92a073" />
          </>
        ) : item === "icecream" ? (
          <>
            <path d="M31 48h39L51 88z" fill="#d4b287" />
            <path
              d="M37 58l24 5m-19 4l15 4M57 54L44 76"
              fill="none"
              stroke="#f1d5ac"
            />
            <path
              d="M26 46q-6-27 23-30t28 30q-2 14-16 7-10 8-17 0-13 7-18-7z"
              fill="#d6b1c5"
            />
            <path
              d="M32 28q10-12 22-6"
              fill="none"
              stroke="#f0d8df"
              strokeWidth="4"
            />
          </>
        ) : item === "cookie" ? (
          <>
            <path
              d="M49 18q26-2 33 20l-2 14 4 14-13 13-18 7-17-5-15-10-5-19 4-17 13-12z"
              fill="#d5b387"
            />
            <g fill="#a18065" stroke="none">
              <circle cx="35" cy="39" r="5" />
              <circle cx="59" cy="33" r="5" />
              <circle cx="66" cy="56" r="6" />
              <circle cx="43" cy="64" r="5" />
              <circle cx="31" cy="58" r="3" />
            </g>
            <path
              d="M27 31q8-10 20-8"
              fill="none"
              stroke="#ecd1a7"
              strokeWidth="3"
            />
          </>
        ) : (
          <>
            <ellipse cx="50" cy="76" rx="37" ry="10" fill="#d5dfd4" />
            {[64, 54, 44].map((y) => (
              <g key={y}>
                <rect
                  x="23"
                  y={y}
                  width="54"
                  height="13"
                  rx="7"
                  fill="#cba679"
                />
                <ellipse cx="50" cy={y} rx="27" ry="8" fill="#e2c394" />
              </g>
            ))}
            <path d="M31 43q15-8 38 0l-5 11-5-4-8 8-7-10-9 5z" fill="#b98d62" />
            <path d="M42 33l13-4 8 8-15 6z" fill="#efe0a1" />
          </>
        )}
      </g>
    </svg>
  );
}
