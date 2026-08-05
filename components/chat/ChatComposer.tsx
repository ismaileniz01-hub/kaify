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
    <footer
      className="chat-composer shrink-0 border-t border-white/[0.07] bg-[#0a0812]/95 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl"
      aria-busy={sending}
    >
      <div className="glass-input chat-composer__surface flex items-center gap-1.5 rounded-[1.35rem] px-1.5 py-1.5 sm:gap-2">
        {showCamera && (
          <button
            type="button"
            onClick={onCameraClick}
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
            if (e.key === "Enter" && !sending) onSend();
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
            onClick={onSend}
            disabled={sending || !input.trim()}
            className="touch-44 flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-950/40 active:scale-95 disabled:shadow-none disabled:opacity-35"
            aria-label={t("chat.aria.send")}
          >
            <Send className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !input.trim()}
            className="touch-44 shrink-0 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-950/30 active:scale-[0.97] disabled:shadow-none disabled:opacity-35"
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
