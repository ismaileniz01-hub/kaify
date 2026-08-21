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
  /** Current user turn — overlap is required for casual, and boosts ranking. */
  userMessage?: string;
  /** Soft max; hard-capped at 8. Default 8. Not a minimum. */
  limit?: number;
};
