/** @type {import('@lhci/cli').Config} */
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      url: [
        "http://127.0.0.1:3000/",
        "http://127.0.0.1:3000/pricing",
        "http://127.0.0.1:3000/privacy",
      ],
      settings: {
        preset: "desktop",
        chromePath: process.env.CHROME_PATH || undefined,
        onlyCategories: ["performance", "accessibility", "best-practices"],
        skipAudits: ["uses-http2", "is-on-https"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["error", { minScore: 0.85 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        interactive: ["warn", { maxNumericValue: 4500 }],
        "total-byte-weight": ["error", { maxNumericValue: 2500000 }],
        "unused-javascript": ["warn", { maxNumericValue: 400000 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
