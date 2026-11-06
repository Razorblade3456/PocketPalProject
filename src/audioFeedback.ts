let context: AudioContext | null = null;
let nextStart = 0;
const active: OscillatorNode[] = [];

/** One reusable UI context; each short two-note cue is queued instead of overlapped. */
export function playUiSound(enabled: boolean, variation = 0) {
  if (!enabled || typeof AudioContext === "undefined") return;
  try {
    if (!context || context.state === "closed") context = new AudioContext();
    if (context.state === "suspended") void context.resume();
    const start = Math.max(context.currentTime, nextStart);
    nextStart = start + 0.4;
    const base = 440 + Math.max(-3, Math.min(2, variation)) * 16;
    [base, base * 1.25].forEach((frequency, index) => {
      const at = start + index * 0.12;
      const oscillator = context!.createOscillator();
      const envelope = context!.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(0.035, at + 0.02);
      envelope.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
      oscillator.connect(envelope);
      envelope.connect(context!.destination);
      active.push(oscillator);
      oscillator.onended = () => {
        const i = active.indexOf(oscillator);
        if (i >= 0) active.splice(i, 1);
        oscillator.disconnect();
        envelope.disconnect();
      };
      oscillator.start(at);
      oscillator.stop(at + 0.27);
    });
  } catch {
    // Browser audio can be unavailable until a user gesture or permission.
  }
}

/** Let real alarms take over immediately and cancel any queued decorative cues. */
export function stopUiSounds() {
  nextStart = 0;
  for (const oscillator of active.splice(0)) {
    try {
      oscillator.stop();
    } catch {
      // It may already have ended.
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    stopUiSounds();
    const old = context;
    context = null;
    if (old && old.state !== "closed") void old.close();
  });
}
