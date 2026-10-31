import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
let installEvent: InstallEvent | null = null;
let waiting: ServiceWorker | null = null;
const notify = () => window.dispatchEvent(new Event("pocketpal-pwa"));
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e as InstallEvent;
  notify();
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  notify();
});
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((reg) => {
        const check = () => {
          if (reg.waiting && navigator.serviceWorker.controller) {
            waiting = reg.waiting;
            notify();
          }
        };
        check();
        reg.addEventListener("updatefound", () =>
          reg.installing?.addEventListener("statechange", check),
        );
        window.addEventListener("focus", () => {
          void reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  });
}
function usePwa() {
  const [, render] = useState(0);
  useEffect(() => {
    const changed = () => render((v) => v + 1);
    window.addEventListener("pocketpal-pwa", changed);
    return () => window.removeEventListener("pocketpal-pwa", changed);
  }, []);
}
export function PwaSettings() {
  usePwa();
  const installed =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone;
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const [instructions, setInstructions] = useState(false);
  return (
    <section className="pwa-settings">
      <h3>PocketPal Beta</h3>
      {installed ? (
        <p className="fine">Installed on this device.</p>
      ) : (
        <>
          <button
            type="button"
            className="secondary"
            onClick={async () => {
              if (installEvent) {
                const event = installEvent;
                installEvent = null;
                await event.prompt();
                await event.userChoice;
                notify();
              } else setInstructions((v) => !v);
            }}
          >
            Install PocketPal
          </button>
          {instructions && (
            <p className="fine">
              {ios
                ? "In Safari, tap Share → Add to Home Screen → Add."
                : "Use your browser’s Install app option. Installation requires HTTPS and a supported browser."}
            </p>
          )}
        </>
      )}
      <p className="fine">
        Progress is saved on this device. Alarms need the app open; closed-app
        and sleeping-device alarms aren’t supported.
      </p>
    </section>
  );
}
export function PwaUpdate() {
  usePwa();
  const [later, setLater] = useState(false);
  if (!waiting || later) return null;
  return (
    <aside className="pwa-update" role="status">
      <span>Update available</span>
      <button
        type="button"
        onClick={() => {
          if (
            document.querySelector(".task-editor") &&
            !confirm("Refresh and discard unsaved task edits?")
          )
            return;
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => location.reload(),
            { once: true },
          );
          waiting?.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        Refresh
      </button>
      <button type="button" onClick={() => setLater(true)}>
        Later
      </button>
    </aside>
  );
}
