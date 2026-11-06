import { MiniPet } from "./MiniPet";
import { AlarmCountdown } from "./AlarmCountdown";
import { nearestAlarm } from "./alarms";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Pet, pets } from "./Pets";
import {
  categories,
  labels,
  parseState,
  initial,
  petRhythm,
  stage,
  type PetKind,
  type State,
} from "./model";
import "./style.css";
import "./careVisuals.css";
import "./miniMochi.css";
import "./countdown.css";
import "./desktopPet.css";
type LiveDisplay = {
  protocol: 1; revision: number; syncedAt: number;
  pet: { kind: PetKind; name: string; level: number; care: State["care"]; equipped?: State["equipped"] };
  petCare: boolean; motion: boolean; alarmsEnabled: boolean;
  alarm: (import("./alarms").AlarmRecord & { name: string; priority: "low" | "normal" | "high" }) | null;
};
type DesktopSettings = { kind?: PetKind; snapshot?: string; liveSync?: LiveDisplay };
type SyncStatus = { paired: boolean; pairReady: boolean; connected: boolean; lastSyncAt: number | null; error?: string };
declare global {
  interface Window {
    desktopPet: {
      settings(): Promise<DesktopSettings>;
      syncStatus(): Promise<SyncStatus>;
      beginPairing(): Promise<{ code: string; expiresAt: number } | null>;
      forgetPairing(): Promise<void>;
      select(kind: PetKind): Promise<void>;
      importBackup(): Promise<string | { error: string } | null>;
      snapshot(value: string): Promise<void>;
      popup(): void;
      menu(): void;
      close(): void;
      timerVisible(visible: boolean): void;
      drag(action: "start" | "move" | "end"): void;
      onChange(callback: () => void): () => void;
    };
  }
}
function DesktopPet() {
  const [settings, setSettings] = useState<DesktopSettings>({});
  const [saved, setSaved] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [sync, setSync] = useState<SyncStatus>({ paired: false, pairReady: false, connected: false, lastSyncAt: null });
  const [pairCode, setPairCode] = useState("");
  const [pairExpiry, setPairExpiry] = useState(0);
  const [rhythm, setRhythm] = useState(petRhythm());
  const pointer = useRef<{ x: number; y: number; dragging: boolean } | null>(
    null,
  );
  const popup = new URLSearchParams(location.search).has("popup");
  useEffect(() => {
    const load = async () => {
      const next = await window.desktopPet.settings();
      setSettings(next);
      const status = await window.desktopPet.syncStatus();
      if (status) setSync(status);
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
    const syncTimer = window.setInterval(() => void window.desktopPet.syncStatus().then(setSync), 12000);
    return () => {
      remove();
      clearInterval(timer);
      clearInterval(syncTimer);
    };
  }, []);
  const kind = settings.liveSync?.pet.kind || settings.kind || saved?.pet || "mochi";
  const alarm =
    saved?.settings.alarmsEnabled === false
      ? undefined
      : nearestAlarm(saved?.alarms);
  const alarmName =
    saved?.tasks.find((t) => t.id === alarm?.taskId)?.name || "";
  const live = settings.liveSync;
  const displayState: State | null = live ? (() => {
    const base = saved || initial(live.syncedAt);
    return {
      ...base,
      name: live.pet.name,
      pet: live.pet.kind,
      care: live.pet.care,
      equipped: live.pet.equipped || {},
      tasks: live.alarm ? [{ id: live.alarm.taskId, name: live.alarm.name, description: "", time: "00:00", repeat: "once", date: "2000-01-01", days: [], category: "happy" as const }] : [],
      alarms: live.alarm ? [{ ...live.alarm }] : [],
      settings: { ...base.settings, petCare: live.petCare, motion: live.motion, alarmsEnabled: live.alarmsEnabled },
      updated: live.syncedAt,
    };
  })() : saved;
  const displayAlarm = live ? (live.alarmsEnabled ? live.alarm : null) : alarm;
  const liveAlarmName = live ? (live.alarm?.name || "") : alarmName;
  const liveAlarmPriority = live ? (live.alarm?.priority || "normal") : (saved?.tasks.find(t => t.id === alarm?.taskId)?.priority || "normal");
  useEffect(() => {
    if (!popup) window.desktopPet.timerVisible(!!displayAlarm);
  }, [popup, !!displayAlarm]);
  if (popup)
    return (
      <main className="desktop-popup">
        <h1>{displayState?.name || pets[kind].name}</h1>
        {displayState ? (
          <>
            <small>
              {live ? `Last synced · ${new Date(live.syncedAt).toLocaleString()}` : `Imported snapshot · ${new Date(saved!.updated).toLocaleString()}`}
            </small>
            {displayState.settings.petCare !== false &&
              categories.map((key) => (
                <div className="desktop-stat" key={key}>
                  <label htmlFor={key}>
                    {labels[key]} <b>{Math.round(displayState.care[key])}%</b>
                  </label>
                  <progress id={key} max="100" value={displayState.care[key]} />
                </div>
              ))}
            <small>{live ? (sync.connected ? "Connected · updates arrive automatically" : "Disconnected · showing the last synced pet") : "Not live. Load a fresh export to update."}</small>
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
        {!live && <button
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
        </button>}
        <section className="desktop-sync-settings" aria-label="PocketPal connection">
          <h2>Desktop sync</h2>
          <small>{sync.error || (sync.paired ? "Paired · waiting for PocketPal website" : "Not paired")}</small>
          {sync.lastSyncAt && <small>Last sync · {new Date(sync.lastSyncAt).toLocaleString()}</small>}
          {!sync.paired && <button onClick={async () => { const result = await window.desktopPet.beginPairing(); if (result) { setPairCode(result.code); setPairExpiry(result.expiresAt); setSync(await window.desktopPet.syncStatus()); } }}>{pairCode ? "Generate new code" : "Connect to PocketPal"}</button>}
          {pairCode && pairExpiry > Date.now() && <div className="desktop-pair-code"><b>{pairCode}</b><small>Enter this code on PocketPal · expires in 5 minutes</small></div>}
          {sync.paired && <button onClick={async () => { await window.desktopPet.forgetPairing(); setPairCode(""); setSync(await window.desktopPet.syncStatus()); }}>Forget connection</button>}
        </section>
        {error && <small role="alert">{error}</small>}
      </main>
    );
  const level = displayState ? (live?.pet.level ?? stage(displayState)) : 0;
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
      <div className="desktop-pet-stage">
        {displayState ? (
          <MiniPet
            s={displayState}
            level={level}
            sleep={rhythm.sleeping && level < 3}
            calm={rhythm.calm}
            host={window}
            interactiveStats={false}
            alarms={displayState.settings.alarmsEnabled === false ? [] : displayState.alarms}
            showCountdown={false}
          />
        ) : (
          <Pet
            kind={kind}
            level={level}
            sleep={rhythm.sleeping && level < 3}
            calm={rhythm.calm}
            onPet={() => {
              /* Drag handler owns clicks. */
            }}
          />
        )}
      </div>
      {displayAlarm && (
        <div className="desktop-timer" aria-label="Task countdown">
          {liveAlarmName && (
            <span className={`desktop-timer-name priority-${liveAlarmPriority}`} title={`${liveAlarmPriority} priority · ${liveAlarmName}`}>
              {liveAlarmName}
            </span>
          )}
          <AlarmCountdown compact alarm={displayAlarm} name={liveAlarmName} />
        </div>
      )}
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
