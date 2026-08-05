"use client";

import { useEffect, useRef } from "react";
import { applyGreenScreenKey } from "@/lib/chroma-key";
import {
  getMotionBudget,
  useDocumentVisible,
} from "@/lib/motion/perf-guards";

type Props = {
  src: string;
  className?: string;
  /** Called when the video finishes playing. */
  onEnded?: () => void;
  /** Called once playback starts (first frame painted). */
  onStart?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
};

/**
 * Plays a green-screen video with real-time chroma key on a canvas.
 * Pauses the rAF loop when the tab is hidden; skips CPU keying on
 * reduced-motion / when the motion budget disables chroma.
 */
export function ChromaKeyVideo({
  src,
  className = "",
  onEnded,
  onStart,
  autoPlay = true,
  muted = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const onEndedRef = useRef(onEnded);
  const onStartRef = useRef(onStart);
  const visible = useDocumentVisible();
  const budget = getMotionBudget();
  const skipKeying = budget.chromaScale <= 0;

  useEffect(() => {
    onEndedRef.current = onEnded;
    onStartRef.current = onStart;
  }, [onEnded, onStart]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (skipKeying) {
      const handleEnded = () => onEndedRef.current?.();
      const handlePlaying = () => {
        if (!startedRef.current) {
          startedRef.current = true;
          onStartRef.current?.();
        }
      };
      video.addEventListener("ended", handleEnded);
      video.addEventListener("playing", handlePlaying);
      if (autoPlay) {
        void video.play().catch(() => {
          video.muted = true;
          void video.play().catch(() => {});
        });
      }
      return () => {
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("playing", handlePlaying);
      };
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;

    const paint = () => {
      if (document.visibilityState !== "visible") {
        rafRef.current = 0;
        return;
      }
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(paint);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(paint);
        return;
      }

      const scale = budget.chromaScale;
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));

      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
        offscreen.width = cw;
        offscreen.height = ch;
      }

      offCtx.drawImage(video, 0, 0, cw, ch);
      const frame = offCtx.getImageData(0, 0, cw, ch);
      applyGreenScreenKey(frame.data, cw, ch);

      ctx.clearRect(0, 0, cw, ch);
      ctx.putImageData(frame, 0, 0);

      if (!startedRef.current && !video.paused) {
        startedRef.current = true;
        onStartRef.current?.();
      }

      if (!video.ended) {
        rafRef.current = requestAnimationFrame(paint);
      }
    };

    const handlePlay = () => {
      startedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      if (document.visibilityState === "visible") {
        rafRef.current = requestAnimationFrame(paint);
      }
    };

    const handleEnded = () => {
      cancelAnimationFrame(rafRef.current);
      onEndedRef.current?.();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !video.paused && !video.ended) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(paint);
        return;
      }
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("ended", handleEnded);
    document.addEventListener("visibilitychange", handleVisibility);

    if (autoPlay) {
      void video.play().catch(() => {
        video.muted = true;
        void video.play().catch(() => {});
      });
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [src, autoPlay, skipKeying, budget.chromaScale, visible]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={src}
        playsInline
        muted={muted}
        className={skipKeying ? "h-full w-full object-contain" : "pointer-events-none absolute h-px w-px opacity-0"}
        aria-hidden={!skipKeying}
      />
      {!skipKeying && (
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain"
          aria-hidden
        />
      )}
    </div>
  );
}
