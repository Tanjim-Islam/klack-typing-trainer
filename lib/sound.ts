/**
 * A synthesised keyswitch click. Generated with the Web Audio API rather than
 * shipped as an audio file: no asset to download, and the pitch can vary per
 * keystroke so a fast run doesn't sound like a machine gun.
 */

let context: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (context) return context;

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;

  try {
    context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

export type ClickKind = "key" | "error" | "done";

export function playClick(kind: ClickKind = "key") {
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "bandpass";
  filter.Q.value = kind === "error" ? 1.2 : 2.4;

  if (kind === "error") {
    osc.type = "square";
    osc.frequency.value = 150;
    filter.frequency.value = 420;
  } else if (kind === "done") {
    osc.type = "triangle";
    osc.frequency.value = 660;
    filter.frequency.value = 1400;
  } else {
    osc.type = "triangle";
    // A little jitter keeps repeated keystrokes from sounding mechanical.
    osc.frequency.value = 1150 + Math.random() * 260;
    filter.frequency.value = 2200;
  }

  const peak = kind === "done" ? 0.1 : 0.045;
  const length = kind === "done" ? 0.16 : 0.035;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + length + 0.02);
}
