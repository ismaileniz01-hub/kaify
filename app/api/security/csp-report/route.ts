import { defineRouteRaw } from "@/lib/api/route-handler";
import { logger } from "@/lib/logger";
import { CSP_REPORT_MAX_BYTES, parseCspReportBody } from "@/lib/security/csp-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/security/csp-report
 * Browser Reporting API / report-uri sink. Must never affect page rendering.
 */
export const POST = defineRouteRaw(
  {
    route: "POST /api/security/csp-report",
    auth: "none",
    publicRateLimit: "csp_report",
    requireCsrf: false,
  },
  async ({ request }) => {
    const text = await request.text();
    if (text.length > CSP_REPORT_MAX_BYTES) {
      return new Response(null, { status: 413 });
    }
    const parsed = parseCspReportBody(text);
    if (parsed.ok) {
      logger.warn("csp.violation", {
        documentUrl: parsed.report.documentUrl,
        blockedUrl: parsed.report.blockedUrl,
        directive: parsed.report.directive,
        disposition: parsed.report.disposition,
        statusCode: parsed.report.statusCode,
      });
    }
    return new Response(null, { status: 204 });
  },
);
