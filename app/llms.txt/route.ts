import { seoAbsoluteUrl } from "@/lib/seo/origin";
import { PRIVACY_EMAIL } from "@/lib/legal/constants";

/**
 * /llms.txt — plain-language summary for AI assistants and AI search
 * (ChatGPT, Gemini, Perplexity, Claude). See https://llmstxt.org.
 * Prerendered at build time; served from cache like the marketing pages.
 */
export const dynamic = "force-static";

export function GET() {
  const url = (path: string) => seoAbsoluteUrl(path);
  const body = `# Kaify Ai

> Kaify Ai is an AI fitness coaching app (web, iOS, Android). One subscription gives you a team of four AI coaches — Alex (training), Maya (nutrition), Leo (body and posture analysis) and Kai (a dragon companion for motivation and consistency) — plus progress analytics, streaks and rewards. Plans start from $14.99/month; exact prices depend on region.

## What Kaify Ai does

- **Alex — Fitness coach:** builds personalised workouts, tracks sets and progress, adapts training to your goals and history.
- **Maya — Nutritionist:** creates meal plans for your goals, adjusts macros on training days, estimates nutrition from a meal photo.
- **Leo — Body analyst:** analyses posture and form, scores progress and suggests mobility work.
- **Kai — Dragon companion:** daily check-ins, encouragement, streaks, quests and gems; Kai grows as your habits do.
- **Analytics:** weekly activity, daily macros and progress tracking in one place.
- The coaches remember your goals, history and preferences, so advice is personalised rather than one-size-fits-all.
- Available in many languages.

## Who it is for

Adults (16+) who want guided training, nutrition and motivation in a single app instead of several separate tools, from beginners to experienced lifters, at any age.

## Plans

- Three plans: Essential, Pro and Premium, billed monthly or yearly through Paddle (Merchant of Record).
- Every plan includes all four coaches, Kai, analytics and streak rewards.
- Cancel or switch anytime in Settings → Manage billing.
- Pricing: ${url("/pricing")}

## Important

Kaify Ai is not medical advice and does not replace a doctor, dietitian or physiotherapist.

## Key pages

- [Home](${url("/")}): product overview, coaches and FAQ
- [Pricing](${url("/pricing")}): plans and billing details
- [Privacy Policy](${url("/privacy")})
- [Terms of Service](${url("/terms")})
- [Health disclaimer](${url("/disclaimer")})
- [Delete your account](${url("/delete-account")})

## Contact

${PRIVACY_EMAIL}
`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
