import { NextRequest, NextResponse } from "next/server";

/**
 * Validates reCAPTCHA token with Google's API
 */
export async function validateRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey || secretKey === "your_recaptcha_secret_key_here") {
    console.error("RECAPTCHA_SECRET_KEY is not configured");
    return false;
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${token}`,
      }
    );
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("reCAPTCHA validation error:", error);
    return false;
  }
}

/**
 * Validates that required environment variables are set
 */
export function validateEnvVars(vars: string[]): { valid: boolean; missing: string[] } {
  const missing = vars.filter(
    (v) => !process.env[v] || process.env[v]?.includes("your_") || process.env[v]?.includes("_here")
  );
  return { valid: missing.length === 0, missing };
}

/**
 * Standard API error response
 */
export function apiError(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Sanitize string input to prevent XSS
 * Escapes HTML special characters to their entity equivalents
 */
export function sanitizeInput(input: string): string {
  const AMP = String.fromCharCode(38) + "amp;";
  const LT = String.fromCharCode(38) + "lt;";
  const GT = String.fromCharCode(38) + "gt;";
  const QUOT = String.fromCharCode(38) + "quot;";
  const APOS = String.fromCharCode(38) + "#x27;";
  
  let result = "";
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    switch (ch) {
      case String.fromCharCode(38):
        result += AMP;
        break;
      case String.fromCharCode(60):
        result += LT;
        break;
      case String.fromCharCode(62):
        result += GT;
        break;
      case String.fromCharCode(34):
        result += QUOT;
        break;
      case String.fromCharCode(39):
        result += APOS;
        break;
      default:
        result += ch;
    }
  }
  return result.trim().slice(0, 1000);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Check if request method is allowed
 */
export function allowMethods(
  request: NextRequest,
  methods: string[]
): NextResponse | null {
  if (!methods.includes(request.method)) {
    return new NextResponse(null, {
      status: 405,
      headers: { Allow: methods.join(", ") },
    });
  }
  return null;
}
