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

export type SoundType =
  | "send"
  | "receive"
  | "typing"
  | "scan"
  | "levelup"
  | "whoosh"
  | "transform"
  | "chestDrop"
  | "chestLand"
  | "chestOpen"
  | "chestPop"
  | "jackpotTick"
  | "chestRevealCommon"
  | "chestRevealRare"
  | "chestRevealUltraRare"
  | "chestRevealEpic"
  | "chestRevealLegendary";

const AUDIO_CTX_KEY = "kaify-audio-ctx";
const SFX_KEY = "kaify-sfx-enabled";
const CHAT_SFX_KEY = "kaify-chat-sfx-enabled";

function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    return null as unknown as AudioContext;
  }
  const existing = (window as unknown as Record<string, AudioContext | undefined>)[AUDIO_CTX_KEY];
  if (existing && existing.state !== "closed") {
    return existing;
  }
  const ctx = new AudioContext();
  (window as unknown as Record<string, AudioContext>)[AUDIO_CTX_KEY] = ctx;
  return ctx;
}

function isEnabled(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const val = localStorage.getItem(key);
  if (val === null) return fallback;
  return val === "true";
}

function playNoiseBurst(
  ctx: AudioContext,
  duration: number,
  volume = 0.04,
  delay = 0,
) {
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime + delay);
  source.stop(ctx.currentTime + delay + duration);
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
        case "whoosh": {
          // Modern enerji patlaması — yumuşak başlangıç, güçlü vuruş
          // Derin bas vuruşu (sine ile yumuşak)
          playTone(ctx, 100, 0.3, "sine", 0.1);
          playTone(ctx, 150, 0.25, "sine", 0.07, 0.05);
          // Yükselen enerji
          playTone(ctx, 400, 0.12, "triangle", 0.06, 0.08);
          playTone(ctx, 600, 0.1, "triangle", 0.05, 0.12);
          // Parlak patlama
          playTone(ctx, 1200, 0.06, "sine", 0.04, 0.15);
          playTone(ctx, 1600, 0.04, "sine", 0.03, 0.17);
          break;
        }
        case "transform": {
          // Dönüşüm tamamlanma sesi — yükselen parlak tonlar
          playTone(ctx, 440, 0.15, "sine", 0.07);
          playTone(ctx, 554, 0.15, "sine", 0.06, 0.1);
          playTone(ctx, 659, 0.15, "sine", 0.06, 0.2);
          playTone(ctx, 880, 0.2, "sine", 0.07, 0.3);
          playTone(ctx, 1108, 0.25, "sine", 0.06, 0.4);
          playTone(ctx, 1320, 0.3, "sine", 0.05, 0.5);
          playTone(ctx, 1760, 0.4, "triangle", 0.04, 0.65);
          break;
        }
        case "chestDrop": {
          playTone(ctx, 280, 0.18, "triangle", 0.06);
          playTone(ctx, 220, 0.22, "triangle", 0.05, 0.08);
          playTone(ctx, 160, 0.28, "sine", 0.04, 0.16);
          break;
        }
        case "chestLand": {
          playTone(ctx, 90, 0.12, "sine", 0.1);
          playNoiseBurst(ctx, 0.08, 0.05);
          playTone(ctx, 130, 0.08, "triangle", 0.04, 0.04);
          break;
        }
        case "chestOpen": {
          playTone(ctx, 330, 0.12, "sine", 0.07);
          playTone(ctx, 440, 0.14, "sine", 0.06, 0.08);
          playTone(ctx, 554, 0.16, "sine", 0.06, 0.16);
          playTone(ctx, 659, 0.2, "triangle", 0.05, 0.24);
          break;
        }
        case "chestPop": {
          playNoiseBurst(ctx, 0.06, 0.035);
          playTone(ctx, 180, 0.1, "sine", 0.08);
          playTone(ctx, 880, 0.08, "sine", 0.04, 0.05);
          playTone(ctx, 1320, 0.12, "triangle", 0.03, 0.07);
          break;
        }
        case "jackpotTick": {
          playTone(ctx, 640 + Math.random() * 40, 0.028, "sine", 0.02);
          break;
        }
        case "chestRevealCommon": {
          playTone(ctx, 392, 0.12, "sine", 0.05);
          playTone(ctx, 494, 0.1, "sine", 0.04, 0.1);
          break;
        }
        case "chestRevealRare": {
          playTone(ctx, 440, 0.12, "sine", 0.06);
          playTone(ctx, 554, 0.12, "sine", 0.05, 0.1);
          playTone(ctx, 659, 0.14, "triangle", 0.05, 0.2);
          break;
        }
        case "chestRevealUltraRare": {
          playTone(ctx, 523, 0.14, "sine", 0.06);
          playTone(ctx, 659, 0.14, "sine", 0.06, 0.12);
          playTone(ctx, 784, 0.16, "sine", 0.05, 0.24);
          playTone(ctx, 988, 0.12, "triangle", 0.04, 0.36);
          break;
        }
        case "chestRevealEpic": {
          playTone(ctx, 523, 0.18, "sine", 0.07);
          playTone(ctx, 659, 0.18, "sine", 0.07, 0.14);
          playTone(ctx, 784, 0.22, "sine", 0.06, 0.28);
          playTone(ctx, 1047, 0.28, "sine", 0.07, 0.42);
          playTone(ctx, 1319, 0.2, "triangle", 0.05, 0.56);
          break;
        }
        case "chestRevealLegendary": {
          playTone(ctx, 523, 0.35, "sine", 0.08);
          playTone(ctx, 659, 0.35, "sine", 0.07, 0.12);
          playTone(ctx, 784, 0.4, "sine", 0.07, 0.24);
          playTone(ctx, 988, 0.45, "triangle", 0.06, 0.36);
          playTone(ctx, 1175, 0.5, "sine", 0.06, 0.48);
          playTone(ctx, 1319, 0.55, "sine", 0.06, 0.58);
          playTone(ctx, 1568, 0.65, "sine", 0.05, 0.68);
          playTone(ctx, 1760, 0.75, "triangle", 0.05, 0.78);
          playTone(ctx, 2093, 0.85, "sine", 0.04, 0.9);
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
