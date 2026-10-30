import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Monitor } from "lucide-react";
import { Pet } from "./Pets";
import { categories, labels, type State } from "./model";
import "./miniMochi.css";

type PictureInPicture = { requestWindow(options: { width: number; height: number }): Promise<Window> };

export function MiniMochi({ s, level, sleep, calm }: {
  s: State; level: number; sleep: boolean; calm: boolean;
}) {
  const pip = (window as Window & { documentPictureInPicture?: PictureInPicture }).documentPictureInPicture;
  const active = useRef<Window | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [stats, setStats] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; active.current?.close(); active.current = null; };
  }, []);

  async function toggle() {
    if (active.current && !active.current.closed) { active.current.close(); return; }
    if (!pip) { setMessage("Mini Mochi needs Chrome or Edge with Picture-in-Picture support. Keep PocketPal open in that browser."); return; }
    if (pending.current) return;
    pending.current = true;
    setMessage("");
    try {
      // Call directly from this click to preserve browser user activation.
      const win = await pip.requestWindow({ width: 160, height: 160 });
      if (!mounted.current) { win.close(); return; }
      active.current = win;
      win.document.title = "Mini Mochi";
      // Share the existing artwork/animation styles, including Vite's dev styles.
      document.querySelectorAll('link[rel="stylesheet"], style').forEach(node => {
        win.document.head.appendChild(node.cloneNode(true));
      });
      win.document.body.className = "mini-mochi-window";
      const root = win.document.createElement("div");
      win.document.body.append(root);
      win.addEventListener("pagehide", () => {
        if (active.current !== win) return;
        active.current = null;
        if (mounted.current) { setTarget(null); setStats(false); }
      }, { once: true });
      setStats(false);
      setTarget(root);
    } catch {
      setMessage("Mini Mochi couldn’t open. Try Chrome or Edge and allow Picture-in-Picture. Keep this tab open.");
    } finally { pending.current = false; }
  }

  return <>
    <div className="mini-mochi-control">
      <button type="button" className="mini-mochi-button" aria-pressed={!!target}
        title={target ? "Close Mini Mochi" : "Float your pet · keep this tab open"} onClick={() => void toggle()}>
        <Monitor size={13} aria-hidden="true" /> Mini Mochi
      </button>
      {message && <small role="status">{message}</small>}
    </div>
    {target && createPortal(<main className={`mini-mochi-content ${s.settings.motion ? "" : "still"}`}>
      <Pet kind={s.pet} care={s.care} equipped={s.equipped} level={level} sleep={sleep} calm={calm}
        onPet={() => {
          setStats(value => !value);
          // Browsers enforce their own minimum size; resizing is only a hint.
          try { active.current?.resizeTo(160, stats ? 190 : 350); } catch { /* Keep stats scrollable if resize is blocked. */ }
        }} />
      {stats && <section className="mini-mochi-stats" aria-label="Live pet needs">
        {categories.map(key => <label key={key}>{labels[key]} <b>{Math.round(s.care[key])}%</b>
          <progress max={100} value={s.care[key]} aria-label={labels[key]} />
        </label>)}
      </section>}
    </main>, target)}
  </>;
}
