import { useCallback, useEffect, useRef, useState } from "react";
import { MonitorDown, RefreshCw, Unplug } from "lucide-react";
import { parseState, type State } from "./model";
import type { AlarmRecord } from "./alarms";
import { desktopDisplayPayload, type DesktopDisplayPayload } from "./desktopSyncModel";
import "./desktopSync.css";

const endpoint = "http://127.0.0.1:47821";
const tokenKey = "pocketpal-desktop-pair-v1";
const revisionKey = "pocketpal-desktop-revision-v1";
const downloadUrl = import.meta.env.VITE_DESKTOP_DOWNLOAD_URL as string | undefined;
type Status = "checking" | "not-running" | "needs-pairing" | "connected" | "disconnected" | "permission" | "version";
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(endpoint + path, { ...init, cache: "no-store", credentials: "omit", mode: "cors", targetAddressSpace: "loopback" } as RequestInit & { targetAddressSpace: "loopback" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || `Local companion returned ${response.status}.`), { status: response.status, data });
  return data;
}
async function connectionError(error: unknown): Promise<{ state: Status; message: string }> {
  const e = error as { status?: number; message?: string };
  if (e.status === 426) return { state: "version", message: "Desktop version mismatch. Update PocketPal Desktop and try again." };
  if (e instanceof TypeError || /fetch|network|permission|private network/i.test(e.message || "")) {
    try {
      const permission = await navigator.permissions.query({ name: "loopback-network" as PermissionName });
      if (permission.state === "denied") return { state: "permission", message: "Loopback access is blocked. Allow PocketPal's Local Network/Loopback permission in browser site settings, then retry." };
    } catch { /* Older browser: give recovery steps with the companion status. */ }
    return { state: "not-running", message: "Desktop companion not detected. If it is open, allow PocketPal's Loopback/Local Network access in browser site settings, then retry." };
  }
  return { state: "disconnected", message: e.message || "Connection interrupted. PocketPal will retry automatically." };
}
function nextRevision() {
  const current = Number(localStorage.getItem(revisionKey)) || 0;
  const next = Math.max(current + 1, Date.now());
  localStorage.setItem(revisionKey, String(next));
  return next;
}

export function DesktopSync({ s, level, alarms }: { s: State; level: number; alarms: AlarmRecord[] }) {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const token = useRef("");
  const lastSignature = useRef("");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const open = useRef(false);
  const payload = useCallback((): DesktopDisplayPayload => {
    // Resolve against the latest browser save so an older tab cannot push stale state.
    let source = s;
    try {
      const raw = localStorage.getItem("pocketpal-v1");
      const stored = raw ? parseState(JSON.parse(raw)) : null;
      if (stored && stored.updated > s.updated) source = stored;
    } catch { /* Keep the validated in-memory state. */ }
    const alarmRecords = source === s ? alarms : source.alarms || [];
    return desktopDisplayPayload(source, alarmRecords);
  }, [s, alarms]);
  const syncNow = useCallback(async (force = false) => {
    if (!token.current) return;
    const data = payload();
    const signature = JSON.stringify({ ...data, syncedAt: 0, revision: 0 });
    if (!force && signature === lastSignature.current) return;
    const rawRevision = Number(localStorage.getItem(revisionKey)) || 0;
    data.revision = signature === lastSignature.current ? rawRevision : nextRevision();
    try {
      const result = await request("/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.current}` }, body: JSON.stringify(data) });
      if (result.protocol !== 1) { setStatus("version"); setMessage("Desktop version mismatch. Update PocketPal Desktop."); return; }
      lastSignature.current = signature;
      setStatus("connected"); setMessage("Desktop Pet Connected · updates sync automatically."); setLastSync(Date.now());
    } catch (error) {
      if ((error as { status?: number }).status === 401) { token.current = ""; localStorage.removeItem(tokenKey); setStatus("needs-pairing"); setMessage("Pairing expired. Connect the desktop pet again."); return; }
      lastSignature.current = "";
      const next = await connectionError(error); setStatus(next.state); setMessage(next.message);
    }
  }, [payload]);

  const check = useCallback(async (showErrors = false) => {
    try {
      const data = await request("/status");
      if (data.protocol !== 1) { setStatus("version"); setMessage("Desktop version mismatch. Update the companion."); return false; }
      const storedToken = token.current || localStorage.getItem(tokenKey) || "";
      token.current = storedToken;
      if (storedToken) {
        await request("/heartbeat", { method: "POST", headers: { Authorization: `Bearer ${storedToken}` } });
        setStatus("connected");
        if (open.current) setMessage("Companion found · checking connection…");
        await syncNow();
      } else {
        setStatus(data.paired ? "needs-pairing" : "needs-pairing");
        setMessage(data.pairReady ? "Companion found. Enter the temporary code shown in its popup." : "Companion found. Open its popup and choose Connect to PocketPal to get a code.");
      }
      return true;
    } catch (error) {
      if (showErrors) { const next = await connectionError(error); setStatus(next.state); setMessage(next.message); }
      else if (token.current) { lastSignature.current = ""; setStatus("disconnected"); setMessage("Desktop pet is temporarily offline · reconnecting…"); }
      else setStatus("not-running");
      return false;
    }
  }, [syncNow]);

  useEffect(() => {
    token.current = localStorage.getItem(tokenKey) || "";
    if (token.current) setStatus("disconnected");
    void check(!!token.current);
    const heartbeat = window.setInterval(() => void check(), 12000);
    const wake = () => { if (!document.hidden) void check(); };
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => { clearInterval(heartbeat); window.removeEventListener("focus", wake); document.removeEventListener("visibilitychange", wake); };
  }, [check]);
  useEffect(() => { if (token.current) void syncNow(); }, [s, alarms, syncNow]);

  const connect = async () => {
    setWorking(true); open.current = true; setMessage("Checking the Windows companion…");
    try {
      const found = await request("/status");
      if (found.protocol !== 1) throw Object.assign(new Error("Desktop version mismatch. Update PocketPal Desktop."), { status: 426 });
      if (found.paired && !token.current) { setStatus("needs-pairing"); setMessage("This companion is paired to another browser profile. Use Forget connection in its popup, then pair again."); return; }
      setStatus("needs-pairing");
      setMessage(found.pairReady ? "Enter the temporary code shown in the desktop pet popup." : "Companion found. In the desktop pet popup, choose Connect to PocketPal to generate a code.");
    } catch (error) {
      const code = (error as { status?: number }).status;
      if (code === 401 || code === 410 || code === 429) { setStatus("needs-pairing"); setMessage((error as Error).message); }
      else { const next = await connectionError(error); setStatus(next.state); setMessage(next.message); }
    }
    finally { setWorking(false); }
  };
  const pair = async (event: React.FormEvent) => {
    event.preventDefault(); setWorking(true);
    try {
      const result = await request("/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim().toUpperCase() }) });
      if (result.protocol !== 1 || typeof result.token !== "string") throw Object.assign(new Error("Desktop version mismatch."), { status: 426 });
      token.current = result.token; localStorage.setItem(tokenKey, result.token); setCode(""); lastSignature.current = "";
      setMessage("Pairing complete. Sending the current pet and alarm…"); await syncNow(true);
    } catch (error) {
      const code = (error as { status?: number }).status;
      if (code === 401 || code === 410 || code === 429) { setStatus("needs-pairing"); setMessage((error as Error).message); }
      else { const next = await connectionError(error); setStatus(next.state); setMessage(next.message); }
    }
    finally { setWorking(false); }
  };
  const disconnect = async () => {
    setWorking(true);
    try { await request("/disconnect", { method: "POST", headers: { Authorization: `Bearer ${token.current}` } }); token.current = ""; localStorage.removeItem(tokenKey); lastSignature.current = ""; setStatus("needs-pairing"); setMessage("Desktop connection forgotten."); }
    catch (error) {
      if ((error as { status?: number }).status === 401) { token.current = ""; localStorage.removeItem(tokenKey); setStatus("needs-pairing"); setMessage("This pairing expired. Forget the connection on the desktop, then pair again."); }
      else { const next = await connectionError(error); setStatus(next.state); setMessage(next.message); }
    }
    finally { setWorking(false); }
  };
  const label = status === "connected" ? "Connected" : status === "disconnected" ? "Disconnected" : status === "permission" ? "Permission needed" : status === "version" ? "Update needed" : status === "not-running" ? "Not detected" : "Ready to pair";
  return <section className="desktop-sync-control" aria-label="Transparent desktop pet">
    <div className="desktop-sync-heading"><MonitorDown size={14} aria-hidden="true"/><b>Transparent Desktop Pet</b><span className={`desktop-sync-dot is-${status}`} /> <small>{label}</small></div>
    <div className="desktop-sync-actions">
      <button type="button" onClick={() => downloadUrl ? window.open(downloadUrl, "_blank", "noopener,noreferrer") : undefined} disabled={!downloadUrl} title={downloadUrl ? "Download PocketPal Desktop" : "No portable release has been published for download yet"}>Download Desktop Pet</button>
      {!token.current ? <button type="button" onClick={() => void connect()} disabled={working}><RefreshCw size={12}/> Connect Desktop Pet</button> : <button type="button" onClick={() => void check(true)} disabled={working}><RefreshCw size={12}/> Sync now</button>}
      {token.current && <button type="button" onClick={() => void disconnect()} disabled={working}><Unplug size={12}/> Disconnect</button>}
    </div>
    {status === "needs-pairing" && <form className="desktop-pair-form" onSubmit={pair}><label htmlFor="desktop-pair-code">Pairing code from desktop popup</label><div><input id="desktop-pair-code" value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 10))} maxLength={10} autoComplete="one-time-code" placeholder="10-character code"/><button type="submit" disabled={working || code.trim().length !== 10}>Pair</button></div></form>}
    <small className="desktop-sync-message" role="status">{message || (lastSync ? `Last synced ${new Date(lastSync).toLocaleTimeString()}` : "The desktop companion stays visible while disconnected; updates resume when both are open.")}</small>
    {!downloadUrl && <small className="desktop-sync-note">Portable download is not published yet. Build it on Windows with <code>npm run build:desktop</code>.</small>}
    <small className="desktop-sync-note">Requires the PocketPal tab to stay open for live updates. Browser Local Network permission may be requested.</small>
  </section>;
}
