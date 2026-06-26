# Auth email templates (reference copies)

These are **not** auto-applied — pintr deploys migrations via the GitHub
integration, not the full Supabase CLI config. They're version-controlled
copies of what must be pasted into the dashboard so the brand stays in sync.

**Where:** Supabase → **Auth → Email Templates**. Paste into **both**:

| Template | File | Subject |
|---|---|---|
| **Confirm signup** (first-time users) | [`confirmation.html`](confirmation.html) | `Welcome to pintr — your sign-in link` |
| **Magic Link** (returning users) | [`magic_link.html`](magic_link.html) | `Your pintr sign-in link` |

First-time users hit *Confirm signup*; returning users hit *Magic Link* —
**both must carry the same link** or login breaks for one group:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

This routes through the server-side `/auth/confirm` handler (`verifyOtp`),
which works regardless of which browser/device opens the email (the default
`{{ .ConfirmationURL }}` flow only works in the requesting browser).

Templates are only editable once **custom SMTP** is configured (see the root
`README.md`, Supabase setup §4–5).
