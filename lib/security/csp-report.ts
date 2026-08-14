import { z } from "zod";

export const CSP_REPORT_MAX_BYTES = 8 * 1024;
export const CSP_REPORT_GROUP = "csp-endpoint";
export const CSP_REPORT_PATH = "/api/security/csp-report";

const SENSITIVE_QUERY = /([?&](?:token|access_token|refresh_token|code|email|password|secret|key|authorization)=)[^&]*/gi;

export function redactReportUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim().slice(0, 512);
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    parsed.search = parsed.search.replace(SENSITIVE_QUERY, "$1[redacted]");
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return trimmed.replace(SENSITIVE_QUERY, "$1[redacted]").slice(0, 256);
  }
}

const cspBodySchema = z
  .object({
    documentURL: z.string().optional(),
    documentUri: z.string().optional(),
    "document-uri": z.string().optional(),
    blockedURL: z.string().optional(),
    blockedUri: z.string().optional(),
    "blocked-uri": z.string().optional(),
    effectiveDirective: z.string().optional(),
    "effective-directive": z.string().optional(),
    violatedDirective: z.string().optional(),
    "violated-directive": z.string().optional(),
    disposition: z.string().optional(),
    statusCode: z.number().optional(),
    "status-code": z.number().optional(),
    sourceFile: z.string().optional(),
    sample: z.string().optional(),
  })
  .passthrough();

export type SanitizedCspReport = {
  documentUrl: string | null;
  blockedUrl: string | null;
  directive: string | null;
  disposition: string | null;
  statusCode: number | null;
};

function pickBody(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj["csp-report"] && typeof obj["csp-report"] === "object") {
    return obj["csp-report"] as Record<string, unknown>;
  }
  if (Array.isArray(obj) || Array.isArray(raw)) {
    const list = Array.isArray(raw) ? raw : [];
    const first = list[0] as Record<string, unknown> | undefined;
    if (first && typeof first.body === "object" && first.body) {
      return first.body as Record<string, unknown>;
    }
    if (first?.type === "csp-violation" && first.body) {
      return first.body as Record<string, unknown>;
    }
  }
  if (obj.type === "csp-violation" && obj.body && typeof obj.body === "object") {
    return obj.body as Record<string, unknown>;
  }
  if (obj["document-uri"] || obj.documentURL || obj.effectiveDirective) {
    return obj;
  }
  return null;
}

export function sanitizeCspReport(raw: unknown): SanitizedCspReport | null {
  const body = pickBody(raw);
  if (!body) return null;
  const parsed = cspBodySchema.safeParse(body);
  if (!parsed.success) return null;
  const b = parsed.data;
  const documentUrl = redactReportUrl(
    b.documentURL ?? b.documentUri ?? b["document-uri"],
  );
  const blockedUrl = redactReportUrl(
    b.blockedURL ?? b.blockedUri ?? b["blocked-uri"],
  );
  const directive =
    (b.effectiveDirective ??
      b["effective-directive"] ??
      b.violatedDirective ??
      b["violated-directive"] ??
      null)?.slice(0, 120) ?? null;
  if (!documentUrl && !blockedUrl && !directive) return null;
  return {
    documentUrl,
    blockedUrl,
    directive,
    disposition: b.disposition?.slice(0, 32) ?? null,
    statusCode: b.statusCode ?? b["status-code"] ?? null,
  };
}

export function parseCspReportBody(
  text: string,
): { ok: true; report: SanitizedCspReport } | { ok: false; reason: "oversized" | "malformed" } {
  if (text.length > CSP_REPORT_MAX_BYTES) {
    return { ok: false, reason: "oversized" };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const report = sanitizeCspReport(json);
  if (!report) return { ok: false, reason: "malformed" };
  return { ok: true, report };
}
