"use client";

import { useEffect, useRef } from "react";

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
 * Audio from the source video is preserved when `muted` is false.
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

  useEffect(() => {
    onEndedRef.current = onEnded;
    onStartRef.current = onStart;
  }, [onEnded, onStart]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offCtx) return;

    const paint = () => {
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

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        offscreen.width = w;
        offscreen.height = h;
      }

      offCtx.drawImage(video, 0, 0, w, h);
      const frame = offCtx.getImageData(0, 0, w, h);
      const d = frame.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const maxRB = Math.max(r, b);
        const greenExcess = g - maxRB;

        if (g > 55 && greenExcess > 16) {
          const spill = Math.min(255, greenExcess * 4.5);
          const alpha = Math.max(0, 255 - spill);
          d[i + 3] = Math.min(d[i + 3], alpha);
          if (alpha < 220) {
            d[i + 1] = Math.min(g, Math.max(r, b));
          }
        }
        if (g > 95 && r < 85 && b < 85 && greenExcess > 35) {
          d[i + 3] = 0;
        }
      }

      ctx.clearRect(0, 0, w, h);
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
      rafRef.current = requestAnimationFrame(paint);
    };

    const handleEnded = () => {
      cancelAnimationFrame(rafRef.current);
      onEndedRef.current?.();
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("ended", handleEnded);

    if (autoPlay) {
      void video.play().catch(() => {
        // Autoplay blocked — fall back to muted playback.
        video.muted = true;
        void video.play().catch(() => {});
      });
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("ended", handleEnded);
    };
  }, [src, autoPlay]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={src}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        playsInline
        muted={muted}
        preload="auto"
      />
      <canvas ref={canvasRef} className="mx-auto h-auto max-h-[280px] w-full max-w-[320px]" />
    </div>
  );
}
