import { WebPlugin } from "@capacitor/core";
import type {
  KaifyRecaptchaEnterprisePlugin,
  KaifyRecaptchaExecuteOptions,
  KaifyRecaptchaExecuteResult,
} from "./definitions";

/**
 * Web stub — Kaify uses classic web v2 Invisible on the Next app, not this plugin.
 */
export class KaifyRecaptchaEnterpriseWeb
  extends WebPlugin
  implements KaifyRecaptchaEnterprisePlugin
{
  async execute(
    _options: KaifyRecaptchaExecuteOptions,
  ): Promise<KaifyRecaptchaExecuteResult> {
    throw this.unavailable(
      "KaifyRecaptchaEnterprise is only available on iOS native.",
    );
  }
}
