"use client";

import { useEffect, useCallback, useRef, useState, type CSSProperties } from "react";
import { Camera, Mic, Send, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { speechLocaleForLang } from "@/lib/speech-locale";
import { hapticImpact, hapticSelection } from "@/lib/native/haptics";
import { isNativeSpeechGranted } from "@/lib/native/speech-platform";
import { isNativePlatform } from "@/lib/native/platform";

type ChatComposerProps = {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending?: boolean;
  showCamera?: boolean;
  onCameraClick?: () => void;
  onVoiceError?: (message: string) => void;
  /** Demo / icon-only send button */
  compactSend?: boolean;
  /** Pending photo attached to the composer (not yet sent). */
  attachmentPreviewUrl?: string | null;
  onRemoveAttachment?: () => void;
  /** Coach accent for the send-button burst. */
  accentColor?: string;
};

export function ChatComposer({
  input,
  onInputChange,
  onSend,
  sending = false,
  showCamera = false,
  onCameraClick,
  onVoiceError,
  compactSend = false,
  attachmentPreviewUrl = null,
  onRemoveAttachment,
  accentColor = "#a855f7",
}: ChatComposerProps) {
  const { t, lang } = useLang();
  const [sendBurst, setSendBurst] = useState(false);
  const [launchText, setLaunchText] = useState<string | null>(null);
  const [speechRationaleOpen, setSpeechRationaleOpen] = useState(false);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  const voiceErrorMessage = useCallback(
    (code: string) => {
      switch (code) {
        case "not-allowed":
        case "permission-denied":
          return t("chat.error.voicePermission");
        case "service-not-allowed":
          return t("chat.error.voiceService");
        case "network":
          return t("chat.error.voiceNetwork");
        case "unsupported":
          return t("chat.error.voiceUnsupported");
        default:
          return t("chat.error.voiceFailed");
      }
    },
    [t],
  );

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    supported: voiceSupported,
  } = useSpeechRecognition(speechLocaleForLang(lang), {
    onError: (code) => onVoiceError?.(voiceErrorMessage(code)),
  });

  useEffect(() => {
    if (!transcript) return;
    const next = input ? `${input} ${transcript}` : transcript;
    onInputChange(next.trim());
    clearTranscript();
  }, [transcript, clearTranscript, input, onInputChange]);

  const handleToggleVoice = () => {
    if (!voiceSupported) {
      onVoiceError?.(t("chat.error.voiceUnsupported"));
      return;
    }
    if (isListening) {
      stopListening();
      return;
    }
    void hapticSelection();
    void (async () => {
      if ((await isNativePlatform()) && !(await isNativeSpeechGranted())) {
        setSpeechRationaleOpen(true);
        return;
      }
      startListening();
    })();
  };

  const confirmSpeechRationale = () => {
    setSpeechRationaleOpen(false);
    startListening();
  };

  const placeholder = isListening
    ? interimTranscript || t("chat.voice.listening")
    : attachmentPreviewUrl
      ? t("chat.photo.caption_placeholder")
      : t("chat.placeholder.chat");

  const displayValue =
    isListening && interimTranscript
      ? [input, interimTranscript].filter(Boolean).join(input ? " " : "")
      : input;

  const canSend = !sending && (Boolean(input.trim()) || Boolean(attachmentPreviewUrl));

  const fireSend = () => {
    if (!canSend) return;
    void hapticImpact("light");
    setSendBurst(true);
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => setSendBurst(false), 420);
    const snapshot = input.trim();
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (snapshot && !reduceMotion) setLaunchText(snapshot);
    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }
    onSend();
  };

  return (
    <footer
      className="chat-composer relative shrink-0 border-t border-white/[0.07] bg-[#0a0812]/95 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"
      aria-busy={sending}
      style={
        {
          "--chat-accent": accentColor,
          "--chat-accent-ring": `${accentColor}73`,
        } as CSSProperties
      }
    >
      {launchText ? (
        <div
          className="chat-send-launch pointer-events-none absolute bottom-[calc(100%-0.35rem)] right-14 z-30 line-clamp-4 max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
          }}
          onAnimationEnd={() => setLaunchText(null)}
          aria-hidden
        >
          {launchText}
        </div>
      ) : null}
      {attachmentPreviewUrl ? (
        <div
          className={`mb-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/35 p-2 ${
            sending ? "origin-bottom-right scale-90 opacity-70 transition-all duration-300" : ""
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachmentPreviewUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
          <p className="min-w-0 flex-1 text-xs leading-snug text-zinc-400">
            {t("chat.photo.attached")}
          </p>
          <button
            type="button"
            onClick={onRemoveAttachment}
            disabled={sending}
            className="touch-44 flex shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label={t("chat.photo.remove")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {speechRationaleOpen ? (
        <div className="mb-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-zinc-300">
            {t("speech.permission.rationale")}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="touch-44 rounded-xl bg-purple-600 px-3 text-xs font-semibold text-white"
              onClick={confirmSpeechRationale}
            >
              {t("speech.permission.continue")}
            </button>
            <button
              type="button"
              className="touch-44 rounded-xl px-3 text-xs text-zinc-400"
              onClick={() => setSpeechRationaleOpen(false)}
            >
              {t("speech.permission.not_now")}
            </button>
          </div>
        </div>
      ) : null}
      <div className="glass-input chat-composer__surface flex items-center gap-1.5 rounded-[1.35rem] px-1.5 py-1.5 sm:gap-2">
        {showCamera && (
          <button
            type="button"
            onClick={() => {
              void hapticSelection();
              onCameraClick?.();
            }}
            disabled={sending}
            className="touch-44 flex shrink-0 items-center justify-center rounded-2xl text-zinc-400 hover:bg-white/[0.07] hover:text-white disabled:opacity-40"
            aria-label={t("chat.aria.photo")}
          >
            <Camera className="h-5 w-5" />
          </button>
        )}

        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            if (isListening) return;
            onInputChange(e.target.value);
          }}
            onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) fireSend();
          }}
          placeholder={placeholder}
          disabled={sending}
          readOnly={isListening && Boolean(interimTranscript)}
          autoComplete="off"
          enterKeyHint="send"
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm leading-5 text-white caret-purple-300 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleToggleVoice}
          disabled={sending}
          className={`touch-44 flex shrink-0 items-center justify-center rounded-2xl disabled:opacity-40 ${
            isListening
              ? "animate-pulse bg-red-500/25 text-red-200 ring-1 ring-red-400/55"
              : "bg-purple-500/12 text-purple-300 ring-1 ring-purple-400/25 hover:bg-purple-500/22 hover:text-purple-200"
          }`}
          aria-label={t("chat.aria.voice")}
          aria-pressed={isListening}
        >
          <Mic className="h-5 w-5" />
        </button>

        {compactSend ? (
          <button
            type="button"
            onClick={fireSend}
            disabled={!canSend}
            className={`touch-44 flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-950/40 active:scale-95 disabled:shadow-none disabled:opacity-35 ${
              sendBurst ? "chat-send-burst" : ""
            }`}
            aria-label={t("chat.aria.send")}
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={fireSend}
            disabled={!canSend}
            className={`touch-44 shrink-0 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-950/30 active:scale-[0.97] disabled:shadow-none disabled:opacity-35 ${
              sendBurst ? "chat-send-burst" : ""
            }`}
          >
            {t("chat.send")}
          </button>
        )}
      </div>
      <p
        role="note"
        className="mt-2 px-2 text-center text-[10px] leading-snug text-zinc-500"
      >
        {t("chat.disclaimer.footer")}
      </p>
    </footer>
  );
}
