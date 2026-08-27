import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIN_RECAPTCHA_ENTERPRISE_IOS_SDK = "18.9.0";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function parseSemver(raw: string): [number, number, number] {
  const match = raw.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid semver: ${raw}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function semverGte(actual: string, minimum: string): boolean {
  const a = parseSemver(actual);
  const m = parseSemver(minimum);
  for (let i = 0; i < 3; i++) {
    if (a[i] > m[i]) return true;
    if (a[i] < m[i]) return false;
  }
  return true;
}

describe("reCAPTCHA Enterprise iOS / API-key contract", () => {
  const packageSwift = source(
    "native-plugins/kaify-recaptcha-enterprise/Package.swift",
  );
  const enterpriseMobile = source("lib/security/recaptcha-enterprise-mobile.ts");

  it(`pins RecaptchaEnterprise iOS SDK from >= ${MIN_RECAPTCHA_ENTERPRISE_IOS_SDK}`, () => {
    expect(packageSwift).toContain(
      "https://github.com/GoogleCloudPlatform/recaptcha-enterprise-mobile-sdk.git",
    );
    expect(packageSwift).toContain('.product(name: "RecaptchaEnterprise"');

    const fromMatch = packageSwift.match(
      /recaptcha-enterprise-mobile-sdk\.git[\s\S]*?from:\s*"(\d+\.\d+\.\d+)"/,
    );
    expect(fromMatch?.[1]).toBeTruthy();
    const pinned = fromMatch![1];
    expect(semverGte(pinned, MIN_RECAPTCHA_ENTERPRISE_IOS_SDK)).toBe(true);
  });

  it("keeps REST assessment auth on RECAPTCHA_ENTERPRISE_API_KEY only (no service-account/IAM path)", () => {
    expect(enterpriseMobile).toContain("RECAPTCHA_ENTERPRISE_API_KEY");
    expect(enterpriseMobile).toContain(
      "recaptchaenterprise.googleapis.com/v1/projects/",
    );
    expect(enterpriseMobile).toContain("/assessments?key=");
    expect(enterpriseMobile).toContain("recaptchaEnterpriseApiKey");

    expect(enterpriseMobile).not.toMatch(/service[_-]?account/i);
    expect(enterpriseMobile).not.toMatch(/GOOGLE_APPLICATION_CREDENTIALS/);
    expect(enterpriseMobile).not.toMatch(/google-auth-library/);
    expect(enterpriseMobile).not.toMatch(/JWT|iam\.credentials/i);
    expect(enterpriseMobile).not.toMatch(/Bearer \$\{/);
  });
});
