import type { ShopItem } from "./catalog";
/** Small original SVGs share ItemArt's existing outline, texture and palette. */
export function ExtraSupplyArt({ item }: { item: ShopItem }) {
  switch (item) {
    case "juiceBox":
      return (
        <>
          <path d="M28 30l12-12h29l8 13-4 51H28z" fill="#919c70" />
          <path d="M28 31h48M42 18v13" fill="none" />
          <path
            d="M57 44V12l14-5"
            fill="none"
            stroke="#d8d3b7"
            strokeWidth="4"
          />
          <circle cx="49" cy="57" r="13" fill="#b66f68" />
          <path
            d="M48 43q3-9 12-5"
            fill="none"
            stroke="#52644f"
            strokeWidth="3"
          />
        </>
      );
    case "snackPack":
      return (
        <>
          <path
            d="M26 20l9 3 8-3 9 3 10-3 12 3-4 59-9-3-10 3-9-3-14 3z"
            fill="#82536c"
          />
          <path d="M31 28h37m-37 46h34" stroke="#b99aa8" />
          <path d="M38 45l12-10 13 9-4 16-19-1z" fill="#c9aa74" />
          <path d="M45 42l4 8m7-5-3 9" stroke="#8c725c" />
        </>
      );
    case "bubbleBath":
      return (
        <>
          <rect x="34" y="24" width="30" height="12" rx="3" fill="#9f8caf" />
          <path d="M35 36l-8 13v31q22 9 46 0V49l-10-13" fill="#766383" />
          <rect x="34" y="52" width="33" height="22" rx="6" fill="#d2c4d6" />
          <g fill="#d9e6dd" stroke="#a4b9b4">
            <circle cx="25" cy="26" r="9" />
            <circle cx="72" cy="31" r="8" />
            <circle cx="57" cy="12" r="6" />
          </g>
        </>
      );
    case "toyBall":
      return (
        <>
          <circle cx="50" cy="51" r="32" fill="#7e8960" />
          <path
            d="M26 29q27 14 47 48M21 60q33-3 57-33"
            fill="none"
            stroke="#c3c3a0"
            strokeWidth="5"
          />
          <path
            d="M35 25q11-7 22-2"
            fill="none"
            stroke="#e0d8b9"
            strokeWidth="4"
          />
        </>
      );
    case "donut":
      return (
        <>
          <path
            d="M50 19a32 32 0 1 0 0 64 32 32 0 1 0 0-64m0 21a11 11 0 1 1 0 22 11 11 0 1 1 0-22"
            fill="#c29b70"
            fillRule="evenodd"
          />
          <path
            d="M22 40q4-22 29-19t29 23l-7 8-10-3q-1-11-13-11T37 50l-9 4z"
            fill="#5b414b"
          />
          <path
            d="M31 34l8 4m15-10 5 5m10 7-6 2m-32 9 5 3"
            stroke="#baa7c4"
            strokeWidth="3"
          />
        </>
      );
    case "cupcake":
      return (
        <>
          <path d="M26 47h49l-9 37H35z" fill="#74546f" />
          <path d="M37 53l5 25m8-25v27m11-27-3 25" stroke="#b49bb7" />
          <path
            d="M24 46q-2-13 11-17-1-13 16-13t17 13q13 4 9 17z"
            fill="#b09aaf"
          />
          <circle cx="50" cy="13" r="6" fill="#9c4f62" />
        </>
      );
    case "hotDog":
      return (
        <>
          <g transform="rotate(-25 50 50)">
            <rect x="17" y="32" width="67" height="39" rx="19" fill="#c9a579" />
            <rect x="22" y="40" width="57" height="23" rx="11" fill="#a45e55" />
            <path
              d="M30 48l9 7 10-9 10 9 11-8"
              fill="none"
              stroke="#d2bc6c"
              strokeWidth="4"
            />
          </g>
        </>
      );
    case "fries":
      return (
        <>
          <g fill="#d8be78">
            <path d="M24 14l9-2 8 47-9 2zM42 9h9v50h-9zM60 13l10 2-8 47-9-2zM73 25l8 3-13 37-9-3z" />
          </g>
          <path d="M20 44q29 16 61 0L71 82q-22 9-43 0z" fill="#783749" />
          <path d="M37 64l13-7 13 7-13 11z" fill="#c7b8a3" />
        </>
      );
    case "ramenCup":
      return (
        <>
          <path d="M23 37h55L68 84H34z" fill="#687259" />
          <ellipse cx="50" cy="37" rx="28" ry="9" fill="#cbb88d" />
          <path
            d="M29 37q6-10 14 0t15 0t15 0m-42 1q7 7 13 0t14 0"
            fill="none"
            stroke="#e1c992"
          />
          <path d="M36 55h28v19H36z" fill="#d6c7aa" />
          <path
            d="M44 61l5 8 8-9"
            fill="none"
            stroke="#83465a"
            strokeWidth="3"
          />
          <path
            d="M55 36L76 10m-13 26 21-22"
            stroke="#c8a57e"
            strokeWidth="3"
          />
        </>
      );
    case "milkshake":
      return (
        <>
          <path d="M29 39h43l-6 43H35z" fill="#96715f" />
          <path
            d="M36 43l3 32m11-32v33m13-32-3 31"
            stroke="#d8c4aa"
            strokeWidth="3"
          />
          <path
            d="M25 39q-3-11 9-15 0-11 15-11t15 11q15 1 12 15z"
            fill="#ddd3bb"
          />
          <path
            d="M58 33l9-25h10"
            fill="none"
            stroke="#9c6381"
            strokeWidth="4"
          />
          <circle cx="46" cy="13" r="5" fill="#985165" />
        </>
      );
    default:
      return null;
  }
}
