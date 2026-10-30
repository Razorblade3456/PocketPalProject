import type { Care } from "./model";
import { petExpression, type FaceAction } from "./petExpression";

/** Species-specific shapes, using the same exclusive expression priority as every pet. */
export function RattleFace({
  care,
  level,
  look,
  action,
  anticipating,
}: {
  care: Care;
  level: number;
  look: { x: number; y: number };
  action: FaceAction;
  anticipating: boolean;
}) {
  const face = petExpression(
    "rattle",
    care,
    level,
    false,
    action,
    anticipating,
  );
  const { mood, thirst } = face;
  const fierce = mood >= 3;
  return (
    <g
      className={`care-face mood-${mood}`}
      data-active-face="care"
      data-happiness-layer={mood}
      data-eye-variant={face.eyes}
      transform={`translate(${look.x},${look.y + (mood >= 2 ? 3 : 0)})`}
    >
      <g
        className="care-eyes"
        fill="#27242d"
        stroke="#27242d"
        strokeWidth="3"
        strokeLinejoin="round"
      >
        {[116, 204].map((x, i) => (
          <g key={x} transform={`translate(${x} 132)`}>
            <path
              data-eye-socket={i ? "right" : "left"}
              d={
                mood === 0
                  ? i
                    ? "M-23-4l36-13 9 18-10 17-27-3z"
                    : "M-22-15l39 9-3 22-29 1-10-13z"
                  : fierce
                    ? i
                      ? "M-22 1l40-15-4 23-22 9-14-4z"
                      : "M-19-14l40 15-4 14-26 2-14-11z"
                    : i
                      ? "M-23-3l42-8-4 23-27 4-12-8z"
                      : "M-22-10l41 8-3 16-28 2-12-10z"
              }
            />
            <path
              d={i ? "M-5 1l8-3-2 11-7 2z" : "M-3-1l8 2-1 9-7-1z"}
              fill={fierce ? "#adbc72" : "#c7c5a0"}
              stroke="none"
            />
            <path
              d={
                mood === 0
                  ? i
                    ? "M-24-16l31-11"
                    : "M-19-25l35 10"
                  : i
                    ? `M-25-12l44-${7 + mood * 2}`
                    : `M-19-${19 + mood * 2}l41 ${8 + mood * 2}`
              }
              fill="none"
              strokeWidth={fierce ? 5 : 3.5}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
      <g
        className={`mouth care-mouth ${!action && thirst === 4 ? "panting-mouth" : ""}`}
        data-mouth-variant={face.mouth}
      >
        {face.mouth === "sip" ? (
          <path d="M151 177q10-6 17 0l-3 15-11-1z" fill="#27242d" />
        ) : face.open ? (
          <>
            <path
              d="M117 173q37 12 88-7l-9 25q-38 27-68 3z"
              fill="#27242d"
              stroke="#343039"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d="M124 177l9 14 7-11 12 11 7-13 11 9 7-14 10 8 9-11"
              fill="#d9d5bd"
            />
            <path d="M141 198q15-12 29-3l-10 5z" fill="#8e4e64" />
          </>
        ) : (
          <path
            d={
              fierce
                ? "M130 187l14-9 14 6 15-10 16 6"
                : mood === 2
                  ? "M137 185l19-7 15 5 15-3"
                  : "M140 183l15-3 12 5 14-4"
            }
            fill="none"
            stroke="#343039"
            strokeWidth={fierce ? 4.5 : 3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {thirst > 0 && (
          <g
            className="dry-lips"
            fill="none"
            stroke="#9d8f73"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path
              d={
                face.open
                  ? "M136 205l-2 4m14-2 1 5m28-14 2 5"
                  : "M128 187l-3 5m67-11 4 4"
              }
            />
          </g>
        )}
      </g>
      {fierce && (
        <g
          className="frustration-marks"
          data-feisty="true"
          fill="none"
          stroke="#9d4e68"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M233 103l-2 9 8 1m-15-2-8-1 2-8m14 17-2 8-8-2" />
          {mood === 4 && <path d="M81 116q-10-9-4-16m-2 20q-14-5-11-14" />}
        </g>
      )}
    </g>
  );
}
