# Subprocessor Change Notification Process

Last updated: 2026-07-05 · Compliance Faz 4 (H7)

---

## When to use

Add, remove, or materially change a subprocessor that processes personal data on Kaify's behalf.

---

## Process

| Step | Action | SLA |
|------|--------|-----|
| 1 | Engineering proposes vendor change | — |
| 2 | Privacy review: data categories, location, DPA availability | 5 business days |
| 3 | Update [subprocessors.md](./subprocessors.md) | Before deploy |
| 4 | Update Privacy Policy subprocessor section | Before deploy |
| 5 | Update [ropa.md](./ropa.md) recipients column | Before deploy |
| 6 | Accept vendor DPA / SCC — [transfer-signing-checklist.md](./transfer-signing-checklist.md) | Before prod traffic |
| 7 | **Notify users** if material change | **30 days advance** where feasible |
| 8 | Log change in [policy-changelog.md](./policy-changelog.md) | Same release |

---

## Notification methods

- Privacy Policy "Last updated" date bump
- In-app banner for material changes (optional, recommended for new AI provider)
- Email to active users if high-risk transfer change (legal counsel decides)

---

## Material vs non-material

| Material (notify) | Non-material (document only) |
|-------------------|------------------------------|
| New AI/health data processor | CDN edge region change |
| New country for existing vendor | Patch version / security fix |
| Payment processor change | Monitoring vendor config |
| Analytics that tracks users | |

---

Contact: privacy@kaifyai.org
