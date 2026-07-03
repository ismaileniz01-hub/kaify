import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * Best-effort device integrity (root / jailbreak) check.
 *
 * Because this app runs in Capacitor **remote-URL mode** (business logic lives
 * server-side, not bundled in the APK/IPA), a compromised device cannot leak
 * secrets or tamper with logic. This check is therefore an *advisory* signal —
 * we warn/telemeter rather than hard-block, so a false positive never locks a
 * legitimate user out of their health data.
 *
 * Real detection requires a native plugin. Install one that registers a plugin
 * named `JailbreakRootDetection`, then rebuild:
 *   npm i capacitor-jailbreak-root-detection && npx cap sync
 * No JS import is needed here: `registerPlugin` returns a proxy that resolves
 * to the native implementation when present and safely rejects otherwise, so
 * the web/CI build is never affected.
 */

type IntegrityResult = {
  checked: boolean;
  compromised: boolean;
  reasons: string[];
};

interface JailbreakRootDetectionPlugin {
  isJailbroken?: () => Promise<{ value?: boolean; result?: boolean }>;
  isRooted?: () => Promise<{ value?: boolean; result?: boolean }>;
  isJailbrokenOrRooted?: () => Promise<{ value?: boolean; result?: boolean }>;
  isRealDevice?: () => Promise<{ value?: boolean; result?: boolean }>;
}

const truthy = (r?: { value?: boolean; result?: boolean }): boolean =>
  Boolean(r?.value ?? r?.result);

export async function checkDeviceIntegrity(): Promise<IntegrityResult> {
  const out: IntegrityResult = { checked: false, compromised: false, reasons: [] };

  try {
    if (!Capacitor.isNativePlatform()) return out;
    if (!Capacitor.isPluginAvailable("JailbreakRootDetection")) return out;

    const plugin = registerPlugin<JailbreakRootDetectionPlugin>(
      "JailbreakRootDetection",
    );
    out.checked = true;

    if (plugin.isJailbrokenOrRooted) {
      if (truthy(await plugin.isJailbrokenOrRooted())) {
        out.compromised = true;
        out.reasons.push("jailbroken_or_rooted");
      }
    } else {
      if (plugin.isRooted && truthy(await plugin.isRooted())) {
        out.compromised = true;
        out.reasons.push("rooted");
      }
      if (plugin.isJailbroken && truthy(await plugin.isJailbroken())) {
        out.compromised = true;
        out.reasons.push("jailbroken");
      }
    }
  } catch {
    // Plugin missing or errored — treat as "unable to determine", never block.
  }

  return out;
}
