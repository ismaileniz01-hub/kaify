# Breach Tabletop Exercise — July 2026

Last updated: 2026-07-05 · Compliance Faz 4  
**Type:** Tabletop (no production changes)  
**Facilitator:** Engineering / privacy contact  
**Duration:** 90 minutes

---

## Scenario

**Title:** Supabase service role key leaked via public GitHub commit

**Inject (T+0):** A dependency bot email reports a exposed `SUPABASE_SERVICE_ROLE_KEY` in a public fork. The key was committed 6 hours ago in a debug script. The repository has since been fixed, but the key may have been scraped.

**Assumed impact:**
- Attacker could bypass RLS with service role
- Potential read of `profiles`, `chat_messages`, `health_steps`
- No evidence of write/delete yet

---

## Exercise timeline (simulated)

| Time | Team action | Decision |
|------|-------------|----------|
| T+15m | Rotate service role key in Supabase dashboard | ✅ Done |
| T+30m | Review Supabase audit logs for anomalous API calls | Found 12 GET requests from unknown IP |
| T+45m | Classify as **S1 Critical** — possible mass read | Escalate to privacy@ |
| T+60m | Draft regulator notification (72h clock started at discovery) | Legal review queued |
| T+75m | Prepare user comms if >500 users affected | Hold pending log analysis |
| T+90m | Post-mortem: pre-commit hook for secrets, gitleaks CI | Action items assigned |

---

## Decisions tested

| Question | Outcome |
|----------|---------|
| Who is incident lead? | privacy@kaifyai.org |
| 72h GDPR clock start? | At discovery (not leak time) |
| User notification threshold? | If chat/health data confirmed accessed |
| KVKK Kurul notification? | Legal counsel to decide (VERBİS status TBD) |

---

## Gaps identified

| Gap | Remediation | Owner | Due |
|-----|-------------|-------|-----|
| No formal incident Slack/channel | Create `#incident-privacy` | Eng | 2026-07-12 |
| Service role rotation runbook | Add to docs/security | Eng | 2026-07-12 |
| User count estimate script | SQL template in playbook | Eng | 2026-07-19 |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Privacy contact | _[fill]_ | | |
| Engineering | _[fill]_ | | |
| Legal (optional) | _[fill]_ | | |

**Next tabletop:** January 2027
