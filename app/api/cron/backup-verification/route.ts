import { defineCronRoute } from "@/lib/api/route-handler";
import { recordCronRun } from "@/lib/services/cron-monitor.service";
import {
  persistBackupVerification,
  runBackupVerification,
} from "@/lib/services/backup-verification.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/cron/backup-verification — daily DR manifest snapshot (Vercel Cron). */
export const GET = defineCronRoute("/api/cron/backup-verification", async () => {
  try {
    const result = await runBackupVerification();
    await persistBackupVerification(result);

    const payload = {
      ranAt: new Date().toISOString(),
      status: result.status,
      manifest: result.manifest,
      errors: result.errors,
    };

    await recordCronRun("backup-verification", result.status === "error" ? "error" : "ok", {
      status: result.status,
      tableCount: Object.keys(result.manifest.tables).length,
      migrationVersion: result.manifest.migrations.latestVersion,
    });

    return payload;
  } catch (error) {
    await recordCronRun("backup-verification", "error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
});
