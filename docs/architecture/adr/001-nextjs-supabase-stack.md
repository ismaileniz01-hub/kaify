# ADR 001: Next.js App Router + Supabase

**Status:** Accepted · 2026-06-30

## Context

Kaify needs auth, realtime-ready DB, RLS, and fast iteration for a solo/small team.

## Decision

- **Next.js 15** App Router on Vercel (SSR + API routes in one deploy)
- **Supabase** Postgres + Auth + Storage in EU (Frankfurt)

## Consequences

- (+) Single codebase, RLS security at DB layer
- (+) Magic link auth without custom auth server
- (−) Vendor coupling; RPC migrations required for mutations
- (−) Serverless memory/time limits for long AI streams (mitigated by SSE + chunking)
