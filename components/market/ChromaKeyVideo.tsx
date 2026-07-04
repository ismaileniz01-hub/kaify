"use client";

import { useEffect, useRef } from "react";
import { applyGreenScreenKey } from "@/lib/chroma-key";

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
      applyGreenScreenKey(frame.data, w, h);

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
      {/* Fade any residual floor green into the modal background */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[22%] max-h-[64px]"
        style={{
          background:
            "linear-gradient(to top, rgba(15, 7, 32, 0.95) 0%, rgba(15, 7, 32, 0.55) 55%, transparent 100%)",
        }}
      />
    </div>
  );
}
