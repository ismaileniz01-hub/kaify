export type KaifyRecaptchaExecuteOptions = {
  siteKey: string;
  action: string;
  /** Client-side timeout in milliseconds (default 10000). */
  timeoutMs?: number;
};

export type KaifyRecaptchaExecuteResult = {
  token: string;
  action: string;
};

export interface KaifyRecaptchaEnterprisePlugin {
  execute(
    options: KaifyRecaptchaExecuteOptions,
  ): Promise<KaifyRecaptchaExecuteResult>;
}
