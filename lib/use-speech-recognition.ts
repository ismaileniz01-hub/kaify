"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/** Stop listening after this many ms without speech activity. */
export const SPEECH_SILENCE_CLOSE_MS = 4000;

type SpeechRecognitionHook = {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  supported: boolean;
};

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
  onerror: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export function useSpeechRecognition(locale = "tr-TR"): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interimRef = useRef("");

  const SpeechRecognition: SpeechRecognitionConstructor | null =
    typeof window !== "undefined"
      ? (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition ??
        null
      : null;

  const supported = SpeechRecognition !== null;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const finishListening = useCallback(() => {
    clearSilenceTimer();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimTranscript("");
    interimRef.current = "";
  }, [clearSilenceTimer]);

  const scheduleSilenceClose = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
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
      }
      finishListening();
    }, SPEECH_SILENCE_CLOSE_MS);
  }, [clearSilenceTimer, finishListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    interimRef.current = "";
  }, []);

  const stopListening = useCallback(() => {
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
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    stopListening();

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
      finishListening();
    };

    recognition.onerror = () => {
      finishListening();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
    setInterimTranscript("");
    interimRef.current = "";
    scheduleSilenceClose();
  }, [
    SpeechRecognition,
    locale,
    stopListening,
    scheduleSilenceClose,
    finishListening,
  ]);

  useEffect(
    () => () => {
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
