import { useId } from "react";
/** Mochi's mismatched cream eyes and tiny wandering pupils: an original stitched-plush face. */
export function MochiEyes({
  level = 0,
  mood = 0,
  sleep = false,
  pleading = false,
}: {
  level?: number;
  mood?: number;
  sleep?: boolean;
  pleading?: boolean;
}) {
  const tired = level >= 1 || mood >= 2;
  return (
    <>
      {[115, 205].map((x, i) => (
        <g key={x} data-mochi-eye={i ? "right" : "left"}>
          {level === 5 ? (
            <path
              d={`M${x - 14} 122l28 26m0-26-28 26`}
              fill="none"
              stroke="#454c42"
              strokeWidth="5"
              strokeLinecap="round"
            />
          ) : sleep ? (
            <path
              d={`M${x - 22} 138q22 ${i ? 13 : 9} 44-2`}
              fill="none"
              stroke="#414b3d"
              strokeWidth="5"
              strokeLinecap="round"
            />
          ) : (
            <>
              <ellipse
                cx={x}
                cy={i ? 136 : 131}
                rx={i ? 26 : 23}
                ry={i ? 28 : 26}
                fill={level >= 3 ? "#d0d1b6" : "#f1efda"}
                stroke="#637653"
                strokeWidth="2.5"
                transform={`rotate(${i ? 7 : -9} ${x} ${i ? 136 : 131})`}
              />
              <ellipse
                cx={x + (i ? -5 : 5)}
                cy={(i ? 139 : 127) + (tired ? 5 : 0)}
                rx={pleading ? 8 : i ? 6 : 7}
                ry={pleading ? 10 : i ? 8 : 9}
                fill="#303c31"
              />
              <circle
                cx={x + (i ? -3 : 7)}
                cy={(i ? 136 : 124) + (tired ? 5 : 0)}
                r="2.5"
                fill="#fffbe9"
              />
              {tired && (
                <path
                  d={`M${x - 21} ${i ? 126 : 120}q21 ${i ? 9 : 5} 43 0`}
                  fill="none"
                  stroke="var(--pet)"
                  strokeWidth={level >= 3 ? 13 : 8}
                  strokeLinecap="round"
                />
              )}
              {pleading && (
                <path
                  d={`M${x - 16} 100q16 ${i ? 8 : -8} 32 0`}
                  fill="none"
                  stroke="#71805b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              )}
              {mood >= 3 && (
                <g
                  className={`rolling-tears tear-${i}`}
                  fill="#a7d8e0"
                  stroke="#dbf2ef"
                  strokeWidth="1"
                >
                  <path d={`M${x - 8} 157q8-6 16 0l-3 17q-5 7-10 0z`} />
                  <path
                    className="tear-drop"
                    d={`M${x} 171q-9 12 0 14q9-2 0-14`}
                  />
                </g>
              )}
            </>
          )}
        </g>
      ))}
    </>
  );
}
export function MochiMouth({ variant = "open" }: { variant?: string }) {
  const id = useId();
  if (variant === "sip")
    return <ellipse cx="166" cy="192" rx="8" ry="10" fill="#51453e" />;
  if (variant === "sleep")
    return (
      <path
        d="M150 188q11 9 22-2"
        stroke="#485440"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    );
  if (variant === "dead" || variant === "frown")
    return (
      <path
        d="M138 191q16-15 37-1l9-3"
        stroke="#655246"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    );
  const shape =
    variant === "sob"
      ? "M143 193q19-26 37-1q-3 20-20 13q-14 6-17-12"
      : "M130 177Q153 188 192 172L188 194Q166 217 141 199Z";
  return (
    <>
      <defs>
        <clipPath id={id}>
          <path d={shape} />
        </clipPath>
      </defs>
      <path
        d={shape}
        fill="#51453e"
        stroke="#655246"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${id})`}>
        {variant !== "sob" && (
          <>
            <path d="M145 181l4 13 12-11z" fill="#fff5dd" />
            <path d="M179 177l5 9 5-13z" fill="#fff5dd" />
          </>
        )}
        <ellipse
          cx="166"
          cy={variant === "sob" ? 202 : 203}
          rx="13"
          ry="6"
          fill="#cd8c91"
        />
      </g>
    </>
  );
}
