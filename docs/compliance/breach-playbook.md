# Data Breach Response Playbook

Last updated: 2026-07-05 · Compliance Faz 4  
**Classification:** Internal — share with engineering + legal counsel on incident

---

## 1. Scope

Personal data breach = confidentiality, integrity, or availability loss affecting Kaify user data (Supabase, auth, chat, health metrics, billing metadata, etc.).

**Contacts:**
- **Incident lead:** privacy@kaifyai.org
- **Technical:** support@kaifyai.org
- **External legal (TR/EU):** _[assign counsel]_

---

## 2. Severity matrix

| Level | Examples | Regulator notify? | User notify? |
|-------|----------|-------------------|--------------|
| **S1 Critical** | DB dump, mass auth bypass, unencrypted health export leak | Likely yes (72h GDPR) | Likely yes |
| **S2 High** | Single-account takeover with data access | Case-by-case | If high risk to rights |
| **S3 Medium** | Scrubbed Sentry leak, misconfigured RLS (no exploit) | Unlikely | No |
| **S4 Low** | Failed attack, no data access | No | No |

---

## 3. Timeline (GDPR Art. 33 / KVKK)

| Hour | Action |
|------|--------|
| **0–1** | Contain: revoke keys, disable route, block IP, rotate secrets |
| **1–4** | Assess: what data, how many users, root cause |
| **4–24** | Document: timeline, systems, individuals involved |
| **≤72** | **GDPR:** Notify supervisory authority if risk to rights/freedoms |
| **≤72** | **KVKK:** Evaluate Kurul / VERBİS notification — **legal counsel decides** |
| **ASAP** | Notify affected users if **high risk** (Art. 34) |
| **7 days** | Post-mortem + remediation plan |
| **30 days** | Update ROPA / DPIA if processing changed |

---

## 4. Containment checklist

- [ ] Identify affected systems (Supabase, Vercel, LS, Sentry, AI providers)
- [ ] Revoke compromised service role / API keys
- [ ] Force session logout affected users (`auth.admin.signOut` / revoke refresh)
- [ ] Enable maintenance mode if ongoing exfiltration
- [ ] Preserve logs (do not delete evidence)
- [ ] Snapshot audit tables: `consent_records`, `data_export_logs`, `admin_audit_log`, `billing_events`

---

## 5. Assessment questions

1. What categories of personal data? (email, chat, health, photos metadata, billing)
2. Approximate number of data subjects?
3. Was data encrypted at rest / in transit?
4. Likely consequences for individuals?
5. Measures already taken?
6. Ongoing or contained?

---

## 6. Notification templates

### 6a. Supervisory authority (draft — legal review)

```
Subject: Personal data breach notification — Kaify Ai

Controller: Kaify Ai, Toros Mah., Çukurova, Adana 01150, Türkiye
Contact: privacy@kaifyai.org
Date of breach: [DATE]
Date discovered: [DATE]

Nature: [DESCRIPTION]
Categories affected: [e.g. email, chat messages]
Approximate subjects: [N]
Likely consequences: [TEXT]
Measures taken: [TEXT]
Contact for DPO/privacy: privacy@kaifyai.org
```

### 6b. User notification (high-risk breach)

```
Subject: Important security notice about your Kaify account

We detected [INCIDENT SUMMARY] on [DATE].

What happened: [PLAIN LANGUAGE]
What data may have been involved: [LIST]
What we did: [ACTIONS]
What you should do: [RESET PASSWORD / REVOKE SESSIONS / MONITOR]

Contact: privacy@kaifyai.org
```

---

## 7. KVKK-specific notes

- **VERBİS** registration status: confirm with legal counsel
- **KVKK m.12:** Veri sorumlusu bildirim yükümlülüğü — Kurul'a en kısa sürede
- Keep Turkish translation of user notice for TR users

---

## 8. Post-incident

- [ ] Root cause analysis document
- [ ] Update [verification-2026-07.md](./verification-2026-07.md) breach section
- [ ] Tabletop lessons → [breach-tabletop-2026-07.md](./breach-tabletop-2026-07.md)
- [ ] Vendor notification if subprocessor involved (Supabase, Vercel, etc.)

---

## 9. Related documents

- [breach-tabletop-2026-07.md](./breach-tabletop-2026-07.md)
- [sentry-retention.md](./sentry-retention.md)
- [deletion-behavior.md](./deletion-behavior.md)
