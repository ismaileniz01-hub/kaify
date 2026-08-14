# Live evidence directory

Artifacts from `npm run test:kaios:live` / `test:kaios:live:run`:

| File | Contents |
| --- | --- |
| `environment-probe.json` | Credential presence flags (no secrets) |
| `STATUS.json` | `BLOCKED` / `READY_BUT_NOT_EXECUTED` / `EXECUTED` |
| `deepseek-conversational.json` | Live DeepSeek samples (when run) |
| `gemini-vision.json` | Live Gemini samples (when run) |
| `supabase-multi-user.json` | Dual-user RLS findings (when run) |
| `maya-e2e.json` | Maya confirm chain (when run) |
| `council-e2e.json` | Council session (when run) |

Do not commit API keys or JWTs. Evidence JSON must not include secrets.
