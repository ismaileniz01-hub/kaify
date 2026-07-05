# Account Deletion Behavior (Compliance Faz 2)

Last updated: 2026-07-05

## Flow

1. User confirms `DELETE` in Settings → Security
2. MFA step-up if enrolled (via `defineRoute` sensitiveAction)
3. CSRF token required
4. `DELETE /api/profile` → `deleteUserAccount(userId)`
5. Avatar storage cleanup (best-effort)
6. `auth.admin.deleteUser(userId)` → CASCADE via `profiles.id → auth.users.id`

## Table behavior on delete

| Table | FK behavior | Notes |
|-------|-------------|-------|
| All `profiles` children | **CASCADE** | streaks, chat, ledger, settings, etc. |
| `ai_usage_ledger` | **CASCADE** (Faz 2) | Was SET NULL — fixed |
| `consent_records` | CASCADE | Audit trail removed with user |
| `consent_revocations` | CASCADE | |
| `data_export_logs` | CASCADE | |
| `billing_events` | SET NULL | Financial audit retained, user_id cleared |
| `admin_audit_log` | SET NULL on `admin_id` | Admin actions by user anonymized |
| Supabase Storage `avatars/` | Explicit delete | Not covered by FK |

## Post-deletion verification (Faz 4)

Automated: `tests/compliance/deletion-completeness.test.ts` + `lib/compliance/deletion-config.ts`

After deletion, no rows should remain with the user's UUID in CASCADE tables. `billing_events` may exist with `user_id = null`. Third-party retention: [sentry-retention.md](./sentry-retention.md).

Contact: privacy@kaifyai.org
