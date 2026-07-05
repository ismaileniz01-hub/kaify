# WAF Runbook (Faz 3.4)

Kaify application-layer controls (CSP, CSRF, rate limits, RLS) are necessary but not sufficient for DDoS and automated scanning. Deploy one edge WAF before production launch.

## Option A — Cloudflare (recommended free tier)

1. Add `kaifyai.org` to Cloudflare; proxy orange-cloud enabled
2. SSL/TLS → Full (strict)
3. Security → WAF → managed ruleset ON
4. Security → Bots → Bot Fight Mode ON for `/login`, `/api/waitlist`, `/api/subscribe`
5. Rate limiting rule: `/api/*` → 100 req/min/IP (adjust after baseline)
6. Preserve headers: `cf-connecting-ip` (already used in `getClientIP`)

## Option B — Vercel Firewall

1. Vercel Dashboard → Project → Firewall
2. Enable DDoS mitigation
3. Custom rule: challenge traffic with suspicious User-Agent to `/api/*`
4. Block known scanner ASNs if noise persists

## Verification

- `curl -I https://kaifyai.org` shows `cf-ray` or Vercel edge headers
- Load test stays below origin saturation (Upstash + Supabase limits)
- securityheaders.com grade A or A+ after deploy

## Rollback

Disable aggressive rules first; never disable origin CSRF/MFA if WAF misconfigured.
