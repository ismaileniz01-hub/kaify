import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

type LighthouseConfig = {
  ci: {
    collect: { url: string[] };
    assert: {
      assertMatrix: Array<{
        matchingUrlPattern: string;
        assertions: Record<string, unknown>;
      }>;
    };
  };
};

const require = createRequire(import.meta.url);
const config = require("../../lighthouserc.cjs") as LighthouseConfig;

describe("Lighthouse route assertions", () => {
  it("applies the login matrix without also applying public SEO assertions", () => {
    const [loginMatrix, publicMatrix] = config.ci.assert.assertMatrix;
    const loginUrl = "http://127.0.0.1:3000/login";

    expect(new RegExp(loginMatrix.matchingUrlPattern).test(loginUrl)).toBe(true);
    expect(new RegExp(publicMatrix.matchingUrlPattern).test(loginUrl)).toBe(
      false,
    );
    expect(loginMatrix.assertions["categories:seo"]).toBe("off");
  });

  it("applies public assertions to every indexable collected URL", () => {
    const publicMatrix = config.ci.assert.assertMatrix[1];
    for (const url of config.ci.collect.url.filter(
      (candidate) => !candidate.endsWith("/login"),
    )) {
      expect(new RegExp(publicMatrix.matchingUrlPattern).test(url)).toBe(true);
    }
  });
});
