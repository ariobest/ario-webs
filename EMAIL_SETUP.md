# SunnyScripts email delivery setup

This repository contains the branded Supabase Auth email templates. The website can request confirmation and password-reset emails, but SMTP delivery is configured in the Supabase project—not in browser JavaScript. Never put SMTP credentials, provider API keys, a Supabase service-role key, or an access token in this repository or in public website settings.

## 1. Configure the sender

1. Open the [Supabase Auth SMTP settings](https://supabase.com/dashboard/project/cqtwmxojwwyeasstuhgb/auth/smtp).
2. In your email provider (for example Brevo or Resend), verify the sending domain `arioscripts.cyou` and add the exact SPF/DKIM DNS records the provider gives you. Use a sender address on that verified domain, such as `ario@arioscripts.cyou`.
3. Enable custom SMTP in Supabase and copy the host, port, SMTP username, and SMTP password from the provider's SMTP settings. These values vary by provider/account; do not substitute an API key unless the provider explicitly says it is the SMTP password.
4. Set the sender email to `ario@arioscripts.cyou` and sender name to `SunnyScripts`. Port 587 with STARTTLS is common, but use the exact settings provided by your mail provider.
5. Save settings and send a test signup to an email address you control. Check Supabase Auth logs if it fails.

## 2. Configure Auth URLs

In [Supabase URL Configuration](https://supabase.com/dashboard/project/cqtwmxojwwyeasstuhgb/auth/url-configuration), set the Site URL to the production website origin. Add that exact origin and any preview origins you use to the Redirect URLs allowlist. This website sends the current origin as the confirmation and recovery redirect.

Keep email confirmation enabled. The app now includes signup confirmation messaging, a resend-confirmation action, forgot-password email requests, and a new-password screen for recovery sessions.

## 3. Paste the SunnyScripts templates

Open [Supabase Email Templates](https://supabase.com/dashboard/project/cqtwmxojwwyeasstuhgb/auth/templates).

- **Confirm signup**: copy `email-templates/confirm-signup.html` into the template HTML/content field. Subject: `Confirm your SunnyScripts email`.
- **Reset password**: copy `email-templates/reset-password.html` into the reset-password template. Subject: `Reset your SunnyScripts password`.

Both templates use Supabase's supported `{{ .ConfirmationURL }}` variable. Keep provider click-tracking/link rewriting disabled for authentication emails so it does not rewrite verification links.

## 4. Verify end to end

- Create an account using an email you control; check inbox and spam.
- Use **Resend confirmation email** if needed.
- Confirm the email, then sign in.
- Use **Forgot password?**, open the reset email, and submit a new password.
- If a message is not sent, inspect Supabase Auth logs and the email provider's delivery/event logs. A branded template changes the appearance; it cannot fix missing SMTP credentials, an unverified sender domain, or provider delivery limits.

## Security note

Only the Supabase project URL and public publishable/anon key belong in browser code. SMTP credentials and provider API keys must remain in provider/Supabase settings or a trusted server-side secret store.

## 5. Reduce signup abuse and email spam

The website now includes a hidden honeypot field and blocks duplicate form submissions while a request is in progress. These are lightweight friction only; browser-side checks cannot stop a determined bot from calling Supabase directly.

For real protection, open the Supabase dashboard and:
1. Go to **Authentication → Rate Limits** and use conservative limits for signups and email sends.
2. Go to **Authentication → Bot and Abuse Protection** and configure a CAPTCHA provider such as Cloudflare Turnstile.
3. Add the Turnstile site key to the signup page and the matching secret to Supabase, then pass the CAPTCHA token with Supabase Auth requests. CAPTCHA is not active until both dashboard configuration and the client token integration are complete.
4. In Resend, keep domain authentication (SPF/DKIM) valid and monitor bounce/complaint events. Do not repeatedly resend confirmation emails to addresses that bounce or complain.

Never place the Turnstile secret, SMTP password, Resend API key, or Supabase service-role key in frontend files.

