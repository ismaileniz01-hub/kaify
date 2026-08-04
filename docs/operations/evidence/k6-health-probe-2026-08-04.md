# Faz 3 evidence — load / health SLO probe (2026-08-04)

## Environment

- Target: `https://kaifyai.org`
- Tool: Node `fetch` (k6 binary not installed on agent host)
- Soft bar (roadmap): k6 hotpaths 20 VU / p95 &lt; 500ms when `K6_ACCESS_TOKEN` available

## Public health probe

```json
{"status":200,"ms":557,"body":"{\"status\":\"ok\",\"timestamp\":\"2026-08-04T12:43:35.161Z\"}"}
```

Verdict: `/api/health` OK under 1s from agent network.

## Authenticated hotpaths (pending operator)

```bash
# Install k6, then:
K6_VUS=20 K6_DURATION=60s BASE_URL=https://kaifyai.org \
  K6_ACCESS_TOKEN=<supabase_user_jwt> \
  npm run load-test:k6:hotpaths
```

Archive summary JSON under this folder as `k6-hotpaths-YYYYMMDD.json` when run.
