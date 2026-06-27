# FlavourFlow Auth Email Templates

FF-styled HTML for Supabase auth emails. Paste each file into:

**Supabase Dashboard → Authentication → Emails → Templates**

| File | Template in dashboard | Key variable |
|---|---|---|
| `confirm-signup.html` | "Confirm signup" | `{{ .Token }}` (6-digit OTP) + `{{ .ConfirmationURL }}` |
| `magic-link.html` | "Magic Link" | `{{ .Token }}` + `{{ .ConfirmationURL }}` |
| `reset-password.html` | "Reset Password" | `{{ .Token }}` + `{{ .ConfirmationURL }}` |
| `change-email.html` | "Change Email Address" | `{{ .Token }}` + `{{ .ConfirmationURL }}` |

## Notes
- Your app uses **OTP code entry** (the "Verify Email — Enter the Code" screen), so every template shows the 6-digit `{{ .Token }}` prominently, with the magic/confirm link as a fallback.
- For OTP to work, in **Auth → Providers → Email**, keep "Confirm email" on and make sure the template includes `{{ .Token }}` (it does).
- **SMTP**: For real delivery (not the limited built-in sandbox that only sends to team members), configure a custom SMTP provider under **Project Settings → Auth → SMTP Settings** (e.g. Resend, SendGrid, Brevo, Amazon SES). The built-in Supabase email service is rate-limited (~2–3/hour) and only delivers to your own org members — that is almost certainly why OTPs aren't arriving.
- Colors: bg `#FFFDF5`, accent `#FBA82E`, text `#3B3328`, card border `#F5E3D8`.
- To add the ChefBoo logo, host `chatbot-image.webp` on a public URL and set it as the `src` of the `<img>` in the header (placeholder included, commented).
