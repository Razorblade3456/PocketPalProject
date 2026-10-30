import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { parseState } from "./model";
import "./style.css";
import "./polish.css";
import "./careVisuals.css";
import "./habits.css";
class SaveBoundary extends React.Component<
  React.PropsWithChildren,
  { error: boolean; message: string }
> {
  state = { error: false, message: "" };
  static getDerivedStateFromError() {
    return {
      error: true,
      message:
        "Your saved little world could not be opened. It has not been overwritten.",
    };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="save-recovery">
        <span className="eyebrow">LET'S KEEP YOUR LITTLE WORLD SAFE</span>
        <h1>A little help getting home.</h1>
        <p role="alert">{this.state.message}</p>
        <p>
          Download your current save before restoring a valid PocketPal backup.
        </p>
        <button
          className="secondary"
          onClick={() => {
            try {
              const raw = localStorage.getItem("pocketpal-v1") || "{}";
              const url = URL.createObjectURL(
                new Blob([raw], { type: "application/json" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "pocketpal-save-recovery.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch {
              this.setState({
                message:
                  "Browser storage is unavailable. Allow site storage and reload to try again.",
              });
            }
          }}
        >
          Download current save
        </button>
        <label>
          Restore a backup
          <input
            type="file"
            accept="application/json"
            onChange={async (e) => {
              const f = e.currentTarget.files?.[0];
              if (!f) return;
              try {
                if (f.size > 10000000) throw Error();
                const restored = parseState(JSON.parse(await f.text()));
                if (!restored) throw Error();
                if (confirm("Replace the unreadable save with this backup?")) {
                  localStorage.setItem(
                    "pocketpal-v1",
                    JSON.stringify(restored),
                  );
                  location.reload();
                }
              } catch {
                this.setState({
                  message:
                    "That backup could not be restored. Your current save is still untouched.",
                });
              }
            }}
          />
        </label>
        <button className="primary" onClick={() => location.reload()}>
          Try again
        </button>
      </main>
    );
  }
}
const root =
  import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if (import.meta.hot) import.meta.hot.data.root = root;
root.render(
  <React.StrictMode>
    <SaveBoundary>
      <App />
    </SaveBoundary>
  </React.StrictMode>,
);
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  });
}
