# Auth OTP email templates — RUNBOOK

Templates live under `supabase/email-templates/`:

- `confirm-signup-otp.en.html` + `.subject.txt`
- `magic-link-otp.en.html` + `.subject.txt`

Both branch on Go template language:

```
{{ if eq .Data.language "tr" }}
…Turkish…
{{ else }}
…English…
{{ end }}
```

## Apply to hosted Supabase

1. Ensure OTP length is **6** in Auth → Providers / Email settings.
2. Set `SUPABASE_ACCESS_TOKEN` (and project ref env vars expected by the script).
3. From repo root:

```bash
npm run auth:otp-template
```

4. Smoke: request OTP with `kaify-lang=tr` (or locale on the send-otp request) and confirm the email body is Turkish; English otherwise.

## Manual Dashboard path (fallback)

Auth → Email Templates → paste HTML/subject from the files above for Confirm signup and Magic Link (OTP). Keep `{{ .Token }}` and the `Data.language` branch intact.

## Notes

- App send path sets `data.language` from the request locale (`send-otp-server.ts`).
- Re-run the apply script after template edits; Dashboard and CLI can overwrite each other.
