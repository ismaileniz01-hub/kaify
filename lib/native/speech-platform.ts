import type { PluginListenerHandle } from "@capacitor/core";

import { isNativePlatform } from "@/lib/native/platform";

/** Whether the native speech plugin is available on this device. */
export async function isNativeSpeechAvailable(): Promise<boolean> {
  if (!(await isNativePlatform())) return false;
  try {
    const { SpeechRecognition } = await import(
      "@capgo/capacitor-speech-recognition"
    );
    const { available } = await SpeechRecognition.available();
    return available;
  } catch {
    return false;
  }
}

export async function isNativeSpeechGranted(): Promise<boolean> {
  if (!(await isNativePlatform())) return false;
  try {
    const { SpeechRecognition } = await import(
      "@capgo/capacitor-speech-recognition"
    );
    const current = await SpeechRecognition.checkPermissions();
    return current.speechRecognition === "granted";
  } catch {
    return false;
  }
}

export async function removeSpeechListeners(
  handles: PluginListenerHandle[],
): Promise<void> {
  await Promise.all(handles.map((h) => h.remove().catch(() => {})));
}
