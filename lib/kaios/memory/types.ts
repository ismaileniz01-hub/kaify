/**
 * Structured coaching memory items for KAIOS context selection.
 */

export type StructuredMemoryFact = {
  key: string;
  value: string;
};

export type StructuredMemoryItem = {
  id?: string;
  kind: string;
  /** Free-text memory summary / note. */
  text?: string;
  /** Optional structured fact pair. */
  fact?: StructuredMemoryFact;
  source: string;
  createdAt?: string;
};

export type SelectMemoriesOptions = {
  coach?: string;
  intent?: string;
  /** Soft max; hard-capped at 5. Default 5. */
  limit?: number;
};
