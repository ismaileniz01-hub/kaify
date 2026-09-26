import { ApiError } from "@/lib/api/errors";
import { defineRoute } from "@/lib/api/route-handler";
import { saveSignupBasics } from "@/lib/services/onboarding.service";
import { signupBasicsSchema } from "@/lib/validations/signup-basics.schema";

export const dynamic = "force-dynamic";

/** POST /api/onboarding/basics — name, age, country before mandatory checkout. */
export const POST = defineRoute(
  { route: "POST /api/onboarding/basics" },
  async ({ request }) => {
    const rawBody = await request.json().catch(() => null);
    const parsed = signupBasicsSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Geçersiz kayıt profili.",
        parsed.error.issues,
      );
    }
    return saveSignupBasics(parsed.data);
  },
);
