"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/** Stop listening after this many ms without speech activity. */
export const SPEECH_SILENCE_CLOSE_MS = 4000;

type SpeechRecognitionOptions = {
  onError?: (code: string) => void;
};

type SpeechRecognitionHook = {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  supported: boolean;
};

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResult[];
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string };
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export function useSpeechRecognition(
  locale = "tr-TR",
  options?: SpeechRecognitionOptions,
): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interimRef = useRef("");
  const stoppingRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const onErrorRef = useRef(options?.onError);
  onErrorRef.current = options?.onError;

  const SpeechRecognition: SpeechRecognitionConstructor | null =
    typeof window !== "undefined"
      ? (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ??
        null
      : null;

  const supported =
    SpeechRecognition !== null &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const finishListening = useCallback(() => {
    clearSilenceTimer();
    sessionActiveRef.current = false;
    recognitionRef.current = null;
    stoppingRef.current = false;
    setIsListening(false);
    setInterimTranscript("");
    interimRef.current = "";
  }, [clearSilenceTimer]);

  const scheduleSilenceClose = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      stoppingRef.current = true;
      const pending = interimRef.current.trim();
      if (pending) {
        setTranscript((prev) => (prev ? `${prev} ${pending}` : pending).trim());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* already stopped */
        }
      } else {
        finishListening();
      }
    }, SPEECH_SILENCE_CLOSE_MS);
  }, [clearSilenceTimer, finishListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    interimRef.current = "";
  }, []);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    sessionActiveRef.current = false;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
    interimRef.current = "";
    stoppingRef.current = false;
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition || !navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current?.("unsupported");
      return;
    }

    stopListening();
    stoppingRef.current = false;

    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => {
        if (stoppingRef.current) return;

        const recognition = new SpeechRecognition();
        recognition.lang = locale;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          scheduleSilenceClose();

          let interim = "";
          let finalText = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const chunk = result[0].transcript;
            if (result.isFinal) {
              finalText += chunk;
            } else {
              interim += chunk;
            }
          }

          if (interim) {
            interimRef.current = interim;
            setInterimTranscript(interim);
          }
          if (finalText) {
            interimRef.current = "";
            setInterimTranscript("");
            setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText).trim());
          }
        };

        recognition.onend = () => {
          if (stoppingRef.current || !sessionActiveRef.current) {
            finishListening();
            return;
          }
          const active = recognitionRef.current;
          if (!active) {
            finishListening();
            return;
          }
          try {
            active.start();
          } catch {
            finishListening();
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          const benign = event.error === "no-speech" || event.error === "aborted";
          if (!benign) {
            onErrorRef.current?.(event.error);
          }
          stoppingRef.current = true;
          finishListening();
        };

        try {
          recognitionRef.current = recognition;
          sessionActiveRef.current = true;
          recognition.start();
          setIsListening(true);
          setTranscript("");
          setInterimTranscript("");
          interimRef.current = "";
          scheduleSilenceClose();
        } catch {
          onErrorRef.current?.("start-failed");
          finishListening();
        }
      })
      .catch(() => {
        onErrorRef.current?.("not-allowed");
        finishListening();
      });
  }, [
    SpeechRecognition,
    locale,
    stopListening,
    scheduleSilenceClose,
    finishListening,
  ]);

  useEffect(
    () => () => {
      stoppingRef.current = true;
      sessionActiveRef.current = false;
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* unmount */
        }
      }
    },
    [clearSilenceTimer],
  );

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript,
    supported,
  };
};
