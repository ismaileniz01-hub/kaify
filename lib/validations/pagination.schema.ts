import { z } from "zod";

/** Shared list pagination query (?limit=&offset=). */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
