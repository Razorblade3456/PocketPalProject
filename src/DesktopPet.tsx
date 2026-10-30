import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Pet, pets } from "./Pets";
import {
  categories,
  labels,
  parseState,
  petRhythm,
  stage,
  type PetKind,
  type State,
} from "./model";
import "./style.css";
import "./careVisuals.css";
import "./desktopPet.css";
type DesktopSettings = { kind?: PetKind; snapshot?: string };
declare global {
  interface Window {
    desktopPet: {
      settings(): Promise<DesktopSettings>;
      select(kind: PetKind): Promise<void>;
      importBackup(): Promise<string | { error: string } | null>;
      snapshot(value: string): Promise<void>;
      popup(): void;
      menu(): void;
      close(): void;
      drag(action: "start" | "move" | "end"): void;
      onChange(callback: () => void): () => void;
    };
  }
}
function DesktopPet() {
  const [settings, setSettings] = useState<DesktopSettings>({});
  const [saved, setSaved] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [rhythm, setRhythm] = useState(petRhythm());
  const pointer = useRef<{ x: number; y: number; dragging: boolean } | null>(
    null,
  );
  const popup = new URLSearchParams(location.search).has("popup");
  useEffect(() => {
    const load = async () => {
      const next = await window.desktopPet.settings();
      setSettings(next);
      try {
        const data = next.snapshot ? JSON.parse(next.snapshot) : null;
        setSaved(data ? parseState(data, data.updated) : null);
      } catch {
        setSaved(null);
      }
    };
    void load();
    const remove = window.desktopPet.onChange(() => void load());
    const timer = window.setInterval(() => setRhythm(petRhythm()), 60000);
    return () => {
      remove();
      clearInterval(timer);
    };
  }, []);
  const kind = saved?.pet || settings.kind || "mochi";
  if (popup)
    return (
      <main className="desktop-popup">
        <h1>{saved?.name || pets[kind].name}</h1>
        {saved ? (
          <>
            <small>
              Saved snapshot · {new Date(saved.updated).toLocaleString()}
            </small>
            {categories.map((key) => (
              <div className="desktop-stat" key={key}>
                <label htmlFor={key}>
                  {labels[key]} <b>{Math.round(saved.care[key])}%</b>
                </label>
                <progress id={key} max="100" value={saved.care[key]} />
              </div>
            ))}
            <small>Not live. Load a fresh export to update.</small>
          </>
        ) : (
          <>
            <p>Live stats aren’t connected yet.</p>
            <label>
              Companion
              <select
                value={kind}
                onChange={(e) =>
                  void window.desktopPet.select(e.target.value as PetKind)
                }
              >
                {Object.entries(pets).map(([id, pet]) => (
                  <option key={id} value={id}>
                    {pet.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button
          onClick={async () => {
            const raw = await window.desktopPet.importBackup();
            if (!raw) return;
            try {
              if (typeof raw !== "string") throw Error(raw.error);
              const data = JSON.parse(raw);
              const parsed = parseState(data, data.updated);
              if (!parsed)
                throw Error("Choose a current PocketPal exported backup.");
              await window.desktopPet.snapshot(JSON.stringify(parsed));
              setSaved(parsed);
              setError("");
            } catch {
              setError("Could not read that PocketPal backup.");
            }
          }}
        >
          Load saved stats…
        </button>
        {error && <small role="alert">{error}</small>}
      </main>
    );
  const level = saved ? stage(saved) : 0;
  return (
    <div
      className="desktop-pet"
      onContextMenu={(e) => {
        e.preventDefault();
        window.desktopPet.menu();
      }}
      onKeyDown={(e) => {
        if (e.target instanceof Element && e.target.closest(".desktop-close"))
          return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          window.desktopPet.popup();
        }
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        pointer.current = { x: e.screenX, y: e.screenY, dragging: false };
        window.desktopPet.drag("start");
      }}
      onPointerMove={(e) => {
        const p = pointer.current;
        if (!p) return;
        if (Math.hypot(e.screenX - p.x, e.screenY - p.y) > 4) p.dragging = true;
        if (p.dragging) window.desktopPet.drag("move");
      }}
      onPointerUp={() => {
        const p = pointer.current;
        pointer.current = null;
        window.desktopPet.drag("end");
        if (p && !p.dragging) window.desktopPet.popup();
      }}
      onPointerCancel={() => {
        pointer.current = null;
        window.desktopPet.drag("end");
      }}
    >
      <Pet
        kind={kind}
        level={level}
        care={saved?.care}
        equipped={saved?.equipped}
        sleep={rhythm.sleeping && level < 3}
        calm={rhythm.calm}
        onPet={() => {
          /* Pointer handler distinguishes clicks from drags. */
        }}
      />
      <button
        type="button"
        className="desktop-close"
        aria-label="Close desktop pet"
        title="Close pet"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          window.desktopPet.close();
        }}
      >
        ×
      </button>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<DesktopPet />);
