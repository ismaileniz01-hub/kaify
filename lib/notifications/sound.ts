/** Short chime when a new in-app notification arrives. */
export function playNotificationChime(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    master.connect(ctx.destination);

    const oscA = ctx.createOscillator();
    oscA.type = "sine";
    oscA.frequency.setValueAtTime(880, now);
    oscA.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
    oscA.connect(master);

    const oscB = ctx.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.setValueAtTime(1318.51, now + 0.1);
    oscB.connect(master);

    oscA.start(now);
    oscB.start(now + 0.1);
    oscA.stop(now + 0.5);
    oscB.stop(now + 0.55);

    window.setTimeout(() => void ctx.close(), 700);
  } catch {
    // Audio blocked or unavailable — silent fallback.
  }
}
