"use client";

import { useCallback, useRef } from "react";

/**
 * Web Audio API ile basit ses efektleri.
 * Hiçbir harici dosya gerektirmez — programatik olarak üretilir.
 *
 * Ayarlar localStorage'dan okunur:
 * - "kaify-sfx-enabled": genel ses efektleri (mesajlaşma, tarama, level-up vb. hariç)
 * - "kaify-chat-sfx-enabled": mesajlaşma sesleri
 */

export type SoundType = "send" | "receive" | "typing" | "scan" | "levelup";

const AUDIO_CTX_KEY = "kaify-audio-ctx";
const SFX_KEY = "kaify-sfx-enabled";
const CHAT_SFX_KEY = "kaify-chat-sfx-enabled";

function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    return null as unknown as AudioContext;
  }
  const existing = (window as any)[AUDIO_CTX_KEY] as AudioContext | undefined;
  if (existing && existing.state !== "closed") {
    return existing;
  }
  const ctx = new AudioContext();
  (window as any)[AUDIO_CTX_KEY] = ctx;
  return ctx;
}

function isEnabled(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const val = localStorage.getItem(key);
  if (val === null) return fallback;
  return val === "true";
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.08,
  delay = 0,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

export function useSound() {
  const enabledRef = useRef(true);

  const play = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;

    try {
      // Ses tipine göre hangi localStorage anahtarına bakılacağını belirle
      if (type === "send" || type === "receive" || type === "typing") {
        // Mesajlaşma sesleri — CHAT_SFX_KEY'e bakar
        if (!isEnabled(CHAT_SFX_KEY, true)) return;
      } else {
        // Diğer ses efektleri (scan, levelup vb.) — SFX_KEY'e bakar
        if (!isEnabled(SFX_KEY, true)) return;
      }

      const ctx = getAudioContext();
      if (!ctx || ctx.state === "closed") return;

      if (ctx.state === "suspended") {
        ctx.resume();
      }

      switch (type) {
        case "send": {
          // Kısa "pop" — mesaj gitti
          playTone(ctx, 880, 0.08, "sine", 0.06);
          playTone(ctx, 1100, 0.06, "sine", 0.04, 0.04);
          break;
        }
        case "receive": {
          // Yumuşak "ding" — mesaj geldi
          playTone(ctx, 660, 0.12, "sine", 0.07);
          playTone(ctx, 880, 0.1, "sine", 0.05, 0.08);
          break;
        }
        case "typing": {
          // Çok hafif tık — yazıyor efekti
          playTone(ctx, 440, 0.03, "triangle", 0.03);
          break;
        }
        case "scan": {
          // Teknolojik tarama sesi — yükselen ton
          playTone(ctx, 600, 0.15, "sine", 0.05);
          playTone(ctx, 900, 0.1, "sine", 0.04, 0.1);
          playTone(ctx, 1200, 0.08, "sine", 0.03, 0.18);
          break;
        }
        case "levelup": {
          // Level atlama sesi — zafer tonu
          playTone(ctx, 523, 0.2, "sine", 0.08);
          playTone(ctx, 659, 0.2, "sine", 0.07, 0.15);
          playTone(ctx, 784, 0.3, "sine", 0.06, 0.3);
          playTone(ctx, 1047, 0.4, "sine", 0.08, 0.5);
          break;
        }
      }
    } catch {
      // Audio çalışmazsa sessizce hata yut
    }
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  return { play, setEnabled };
}
