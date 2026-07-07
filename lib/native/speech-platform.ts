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

/**
 * Request mic + speech permissions once at app launch so chat does not
 * trigger a separate browser-style permission flow.
 */
export async function warmUpNativeSpeechPermissions(): Promise<void> {
  if (!(await isNativePlatform())) return;
  try {
    const { SpeechRecognition } = await import(
      "@capgo/capacitor-speech-recognition"
    );
    const current = await SpeechRecognition.checkPermissions();
    if (current.speechRecognition === "granted") return;
    await SpeechRecognition.requestPermissions();
  } catch {
    // Plugin missing in web CI builds — ignore.
  }
}

export async function removeSpeechListeners(
  handles: PluginListenerHandle[],
): Promise<void> {
  await Promise.all(handles.map((h) => h.remove().catch(() => {})));
}
