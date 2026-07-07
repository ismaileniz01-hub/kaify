"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { PluginListenerHandle } from "@capacitor/core";
import {
  isNativeSpeechAvailable,
  removeSpeechListeners,
} from "@/lib/native/speech-platform";

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

function webSpeechCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor })
      .SpeechRecognition ??
    (
      window as unknown as {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }
    ).webkitSpeechRecognition ??
    null
  );
}

function webSpeechSupported(): boolean {
  return (
    webSpeechCtor() !== null &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function useSpeechRecognition(
  locale = "tr-TR",
  options?: SpeechRecognitionOptions,
): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [supported, setSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interimRef = useRef("");
  const stoppingRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const nativeModeRef = useRef(false);
  const nativeListenersRef = useRef<PluginListenerHandle[]>([]);
  const onErrorRef = useRef(options?.onError);
  onErrorRef.current = options?.onError;

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

  const commitInterimToTranscript = useCallback(() => {
    const pending = interimRef.current.trim();
    if (!pending) return;
    setTranscript((prev) => (prev ? `${prev} ${pending}` : pending).trim());
    interimRef.current = "";
    setInterimTranscript("");
  }, []);

  const scheduleSilenceClose = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      stoppingRef.current = true;
      commitInterimToTranscript();
      if (nativeModeRef.current) {
        void (async () => {
          try {
            const { SpeechRecognition } = await import(
              "@capgo/capacitor-speech-recognition"
            );
            await SpeechRecognition.stop();
          } catch {
            finishListening();
          }
        })();
        return;
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
  }, [clearSilenceTimer, commitInterimToTranscript, finishListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    interimRef.current = "";
  }, []);

  const teardownNativeListeners = useCallback(async () => {
    const handles = nativeListenersRef.current;
    nativeListenersRef.current = [];
    await removeSpeechListeners(handles);
  }, []);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    sessionActiveRef.current = false;
    clearSilenceTimer();

    if (nativeModeRef.current) {
      void (async () => {
        commitInterimToTranscript();
        try {
          const { SpeechRecognition } = await import(
            "@capgo/capacitor-speech-recognition"
          );
          await SpeechRecognition.stop();
        } catch {
          /* already stopped */
        }
        await teardownNativeListeners();
        setIsListening(false);
        setInterimTranscript("");
        interimRef.current = "";
        stoppingRef.current = false;
      })();
      return;
    }

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
  }, [clearSilenceTimer, commitInterimToTranscript, teardownNativeListeners]);

  const startNativeListening = useCallback(async () => {
    try {
      const { SpeechRecognition } = await import(
        "@capgo/capacitor-speech-recognition"
      );

      const perms = await SpeechRecognition.checkPermissions();
      if (perms.speechRecognition !== "granted") {
        const requested = await SpeechRecognition.requestPermissions();
        if (requested.speechRecognition !== "granted") {
          onErrorRef.current?.("not-allowed");
          return;
        }
      }

      await teardownNativeListeners();
      stoppingRef.current = false;
      sessionActiveRef.current = true;

      const partialHandle = await SpeechRecognition.addListener(
        "partialResults",
        (event) => {
          scheduleSilenceClose();
          const text =
            event.accumulatedText?.trim() ||
            event.matches?.[0]?.trim() ||
            "";
          if (!text) return;
          interimRef.current = text;
          setInterimTranscript(text);
        },
      );

      const stateHandle = await SpeechRecognition.addListener(
        "listeningState",
        (event) => {
          const stopped =
            event.state === "stopped" || event.status === "stopped";
          if (!stopped) return;
          if (stoppingRef.current || !sessionActiveRef.current) {
            void teardownNativeListeners().then(finishListening);
            return;
          }
          if (event.reason === "silence") {
            commitInterimToTranscript();
            stoppingRef.current = true;
            sessionActiveRef.current = false;
            void SpeechRecognition.stop().catch(() => {});
          }
        },
      );

      const errorHandle = await SpeechRecognition.addListener("error", (event) => {
        const benign =
          event.code === "no-speech" || event.code === "aborted";
        if (!benign) {
          onErrorRef.current?.(event.code || "failed");
        }
        stoppingRef.current = true;
        void teardownNativeListeners().then(finishListening);
      });

      nativeListenersRef.current = [
        partialHandle,
        stateHandle,
        errorHandle,
      ];

      await SpeechRecognition.start({
        language: locale,
        partialResults: true,
        popup: false,
        addPunctuation: true,
        allowForSilence: SPEECH_SILENCE_CLOSE_MS,
        contextualStrings: ["Kaify", "K.AIFY", "freezie", "streak"],
      });

      setIsListening(true);
      setTranscript("");
      setInterimTranscript("");
      interimRef.current = "";
      scheduleSilenceClose();
    } catch {
      onErrorRef.current?.("start-failed");
      await teardownNativeListeners();
      finishListening();
    }
  }, [
    locale,
    scheduleSilenceClose,
    finishListening,
    teardownNativeListeners,
    commitInterimToTranscript,
  ]);

  const startWebListening = useCallback(() => {
    const SpeechRecognition = webSpeechCtor();
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
            setTranscript((prev) =>
              (prev ? `${prev} ${finalText}` : finalText).trim(),
            );
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
          const benign =
            event.error === "no-speech" || event.error === "aborted";
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
    locale,
    stopListening,
    scheduleSilenceClose,
    finishListening,
  ]);

  const startListening = useCallback(() => {
    if (nativeModeRef.current) {
      void startNativeListening();
      return;
    }
    startWebListening();
  }, [startNativeListening, startWebListening]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const native = await isNativeSpeechAvailable();
      if (cancelled) return;
      nativeModeRef.current = native;
      setSupported(native || webSpeechSupported());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      void (async () => {
        try {
          if (nativeModeRef.current) {
            const { SpeechRecognition } = await import(
              "@capgo/capacitor-speech-recognition"
            );
            await SpeechRecognition.stop();
          }
        } catch {
          /* unmount */
        }
        await teardownNativeListeners();
      })();
    },
    [clearSilenceTimer, teardownNativeListeners],
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
}
