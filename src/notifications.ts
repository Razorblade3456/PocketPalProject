export async function notifyTask(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  const key = "pocketpal-notified:" + tag;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, String(Date.now()));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (
        k?.startsWith("pocketpal-notified:") &&
        Number(localStorage.getItem(k)) < Date.now() - 7 * 86400000
      )
        localStorage.removeItem(k);
    }
  } catch {
    /* Notification tags coalesce delivery when storage is unavailable. */
  }
  try {
    const reg =
      "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistration()
        : undefined;
    const options = { body, tag, silent: true };
    if (reg?.active) await reg.showNotification(title, options);
    else {
      const n = new Notification(title, options);
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* In-app reminder remains available. */
    }
  }
}
