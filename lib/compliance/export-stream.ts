/**
 * Paginated user-data export (PRIV-002).
 * Bounds memory to one page per table and fails closed if a table cannot be
 * fully read.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";

export const EXPORT_PAGE_SIZE = 200;
/** Hard cap per table — above this we refuse rather than silently truncate. */
export const EXPORT_TABLE_ROW_CAP = 100_000;

export async function fetchOwnedRowPage(
  db: SupabaseClient,
  table: string,
  column: string,
  userId: string,
  from: number,
  pageSize = EXPORT_PAGE_SIZE,
): Promise<{ rows: unknown[]; complete: boolean }> {
  const to = from + pageSize - 1;
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq(column, userId)
    .range(from, to);

  if (error) {
    throw new ApiError("INTERNAL_ERROR", "Veri dışa aktarımı tamamlanamadı.");
  }

  const rows = (data ?? []) as unknown[];
  return { rows, complete: rows.length < pageSize };
}

export async function fetchOwnedRowsPaged(
  db: SupabaseClient,
  table: string,
  column: string,
  userId: string,
  pageSize = EXPORT_PAGE_SIZE,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let from = 0;
  for (;;) {
    const page = await fetchOwnedRowPage(db, table, column, userId, from, pageSize);
    rows.push(...page.rows);
    if (rows.length > EXPORT_TABLE_ROW_CAP) {
      throw new ApiError(
        "INTERNAL_ERROR",
        "Veri dışa aktarımı bu hesap için çok büyük. Lütfen destek ile iletişime geç.",
      );
    }
    if (page.complete) return rows;
    from += pageSize;
  }
}
