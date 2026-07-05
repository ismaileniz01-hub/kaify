# DSAR Process — Data Subject Access Requests

Last updated: 2026-07-05 · Compliance Faz 4  
**SLA:** 30 calendar days (GDPR Art. 12(3), KVKK m.13)

---

## 1. Channels

| Channel | Address | Auto-response |
|---------|---------|---------------|
| Email | privacy@kaifyai.org | Within 2 business days |
| In-app (preferred) | Settings → Security → Export JSON | Immediate (authenticated) |
| KVKK written | privacy@kaifyai.org (subject: "KVKK Başvuru") | Within 2 business days |

---

## 2. Request types

| Type | Self-service | Manual SLA |
|------|--------------|------------|
| **Access / copy (Art. 15)** | ✅ JSON export | 30 days if account locked |
| **Portability (Art. 20)** | ✅ JSON export | Same |
| **Erasure (Art. 17)** | ✅ Delete account UI | 30 days if verified identity by email |
| **Rectification (Art. 16)** | ✅ Profile settings | 30 days for complex cases |
| **Restrict processing (Art. 18)** | Email only | 30 days |
| **Object to marketing** | ✅ Settings toggle | Immediate |
| **Withdraw AI consent** | ✅ Settings | Immediate |

---

## 3. Manual request workflow

```
1. Receive email → log ticket (date, requester email, type)
2. Verify identity:
   - Match auth.users email, OR
   - MFA / government ID for account recovery (legal review)
3. If self-service available → direct user to Settings
4. If not (locked account, legal hold):
   - Service-role export via exportUserData(userId)
   - Deliver encrypted zip link (7-day expiry)
5. Log in data_export_logs (manual note in metadata if added)
6. Close within 30 days — send confirmation email
```

---

## 4. Extension (+60 days)

Permitted if request is complex or numerous. Notify user within 30 days with reason.

---

## 5. Refusal grounds (document if used)

- Manifestly unfounded or excessive (fee or refuse)
- Cannot verify identity
- Legal obligation to retain (billing_events 7y)

---

## 6. KVKK m.11 checklist

- [ ] Başvuru alındı kaydı
- [ ] Kimlik doğrulama
- [ ] 30 gün içinde yanıt
- [ ] Red ise gerekçeli yazılı cevap
- [ ] Kurul'a şikayet hakkı hatırlatması

---

## 7. Metrics (review quarterly)

| Metric | Target |
|--------|--------|
| Self-service export success rate | >95% |
| Manual DSAR median response | <14 days |
| Overdue (>30d) | 0 |

Contact: privacy@kaifyai.org
