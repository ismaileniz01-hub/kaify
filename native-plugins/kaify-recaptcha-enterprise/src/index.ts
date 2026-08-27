import { registerPlugin } from "@capacitor/core";
import type { KaifyRecaptchaEnterprisePlugin } from "./definitions";

const KaifyRecaptchaEnterprise =
  registerPlugin<KaifyRecaptchaEnterprisePlugin>("KaifyRecaptchaEnterprise", {
    web: () => import("./web").then((m) => new m.KaifyRecaptchaEnterpriseWeb()),
  });

export * from "./definitions";
export { KaifyRecaptchaEnterprise };
