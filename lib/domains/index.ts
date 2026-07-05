/**
 * Bounded context entry points (Architecture Faz 2).
 *
 * Import from `@/lib/domains/<context>` in new code. Legacy `@/lib/services/*`
 * imports remain valid during migration.
 */
export * as auth from "@/lib/domains/auth";
export * as market from "@/lib/domains/market";
export * as ai from "@/lib/domains/ai";
export * as billing from "@/lib/domains/billing";
export * as compliance from "@/lib/domains/compliance";
export * as platform from "@/lib/domains/platform";
