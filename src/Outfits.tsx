import type { PetKind } from "./model";
import { OUTFITS, type Outfit, type OutfitSlot } from "./catalog";
export type Equipped = Partial<Record<OutfitSlot, Outfit>>;
export function OutfitLayer({
  kind,
  equipped = {},
  back = false,
}: {
  kind: PetKind;
  equipped?: Equipped;
  back?: boolean;
}) {
  const hy =
      kind === "mochi" || kind === "rattle" ? 66 : kind === "pippin" ? 104 : 52,
    ny =
      kind === "rattle"
        ? 216
        : kind === "mochi"
          ? 205
          : kind === "pippin"
            ? 218
            : 219;
  const head = equipped.head,
    neck = equipped.neck,
    body = equipped.body;
  if (back)
    return equipped.back === "backpack" ? (
      <g
        data-outfit="backpack"
        transform={`translate(${kind === "rattle" ? 205 : kind === "pippin" ? 257 : kind === "crumb" ? 239 : 242} 219)`}
        stroke="#8a755e"
        strokeWidth="2"
      >
        <rect width="37" height="55" rx="12" fill="#b99878" />
        <path d="M2 15q18 12 33 0M8 31h21v16H8z" fill="#d0ad8b" />
        <path d="M7 5v44" fill="none" stroke="#e7ceab" strokeDasharray="3 4" />
      </g>
    ) : null;
  return (
    <g
      className="worn-outfits"
      stroke="#8a806c"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      {body && (
        <g data-outfit={body}>
          {body === "pajamas" ? (
            <>
              <path
                d={
                  kind === "pippin"
                    ? "M101 222q59 20 118 0l-6 43q-53 24-105 0z"
                    : "M101 220q59 20 118 0l3 51-14 15-37 2-11-10-10 10-39-3-14-16z"
                }
                fill="#a9bbc8"
              />
              <path d="M159 236v42" stroke="#e9ddbf" strokeDasharray="4 4" />
              <path
                d="M127 239l2 5 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1zM192 258l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z"
                fill="#f0deb0"
                stroke="none"
              />
            </>
          ) : (
            <>
              <path
                d="M102 221l23 9 12-6 20 11 20-10 17 6 24-9-3 47-13 14-15-7-20 13-16-11-18 7-13-9-17 9z"
                fill="#9fae91"
              />
              <path
                d="M116 241l18 9-12 15m70-29l-12 14 17 8"
                stroke="#768768"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M150 249l16-6 8 17-17 5z"
                fill="#c3af99"
                strokeDasharray="3 3"
              />
            </>
          )}
        </g>
      )}
      {neck && (
        <g data-outfit={neck} transform={`translate(160 ${ny})`}>
          {neck === "bowtie" ? (
            <>
              <path
                d="M-4-3l-25-12q-7 14 0 27L-4 3m8-6l25-12q7 14 0 27L4 3"
                fill="#bd7c77"
              />
              <rect
                x="-6"
                y="-8"
                width="12"
                height="16"
                rx="4"
                fill="#dca29a"
              />
              <path
                d="M-24-9l14 8m20 0l14-8"
                stroke="#e9c0af"
                strokeDasharray="3 3"
              />
            </>
          ) : (
            <>
              <path d="M-42-7q42 11 84 0l-3 17q-41 10-78-1z" fill="#b0bd9b" />
              <path d="M14 8l6 36 20-3-8-35" fill="#b0bd9b" />
              <path
                d="M-30 0q30 8 60 0M20 22l15-3m-13 16l15-3M22 44l1 6m7-7l1 6m7-7l1 6"
                stroke="#e5dfb8"
                strokeWidth="3"
              />
            </>
          )}
        </g>
      )}
      {head && (
        <g data-outfit={head} transform={`translate(160 ${hy})`}>
          {head === "beanie" ? (
            <>
              <path d="M-43 2q0-48 43-48T43 2" fill="#b7a4c4" />
              <circle cx="0" cy="-48" r="11" fill="#d9cae0" />
              <rect
                x="-46"
                y="-3"
                width="92"
                height="17"
                rx="5"
                fill="#c9b7d4"
              />
              <path
                d="M-34 0v10m12-10v10m12-10v10M2 0v10M14 0v10M26 0v10M38 0v10"
                stroke="#e8dceb"
              />
            </>
          ) : head === "mushroomHat" ? (
            <>
              <path d="M-62 0q5-54 62-54t62 54q-62 20-124 0z" fill="#bb8b78" />
              <path d="M-42 8q42 13 84 0" stroke="#ecd5b4" strokeWidth="5" />
              <g fill="#eddbbd" stroke="none">
                <ellipse cx="-28" cy="-24" rx="10" ry="7" />
                <ellipse cx="20" cy="-36" rx="13" ry="7" />
                <ellipse cx="43" cy="-13" rx="7" ry="5" />
              </g>
            </>
          ) : (
            <>
              <path
                d="M-41-28l22 15L0-48l19 35 22-15-8 40h-66z"
                fill="#d5bf7f"
              />
              <path d="M-31 5h62" stroke="#f0dfaa" strokeWidth="5" />
              <ellipse cx="0" cy="-7" rx="6" ry="8" fill="#b296b4" />
              <circle cx="-22" cy="-3" r="3" fill="#c3918f" />
              <circle cx="22" cy="-3" r="3" fill="#a7ba95" />
            </>
          )}
        </g>
      )}
    </g>
  );
}
