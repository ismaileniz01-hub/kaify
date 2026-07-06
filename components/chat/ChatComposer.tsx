"use client";

import { useEffect, useCallback } from "react";
import { Camera, Mic, Send } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { speechLocaleForLang } from "@/lib/speech-locale";

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
}: ChatComposerProps) {
  const { t, lang } = useLang();

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
    startListening();
  };

  const placeholder = isListening
    ? interimTranscript || t("chat.voice.listening")
    : t("chat.placeholder.chat");

  const displayValue =
    isListening && interimTranscript
      ? [input, interimTranscript].filter(Boolean).join(input ? " " : "")
      : input;

  return (
    <footer className="chat-composer shrink-0 border-t border-white/10 bg-[#0a0812]/95 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="glass-input flex items-center gap-1.5 rounded-full px-2 py-2 sm:gap-2">
        {showCamera && (
          <button
            type="button"
            onClick={onCameraClick}
            disabled={sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
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
            if (e.key === "Enter" && !sending) onSend();
          }}
          placeholder={placeholder}
          disabled={sending}
          readOnly={isListening && Boolean(interimTranscript)}
          className="min-w-0 flex-1 bg-transparent px-1 text-sm text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
        />

        <button
          type="button"
          onClick={handleToggleVoice}
          disabled={sending}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
            isListening
              ? "bg-red-500/30 text-red-200 ring-2 ring-red-400/60 animate-pulse"
              : "bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/40 hover:bg-purple-500/25 hover:text-purple-200"
          }`}
          aria-label={t("chat.aria.voice")}
          aria-pressed={isListening}
        >
          <Mic className="h-5 w-5" />
        </button>

        {compactSend ? (
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500 text-white shadow-md shadow-purple-500/40 transition active:scale-95 disabled:opacity-40"
            aria-label={t("chat.aria.send")}
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !input.trim()}
            className="shrink-0 rounded-full bg-purple-500 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
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
