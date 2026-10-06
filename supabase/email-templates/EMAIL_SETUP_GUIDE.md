# Email Deliverability & Password Reset Setup Guide

This guide ensures password reset and confirmation emails **reliably reach the user's Inbox instead of the Spam/Junk folder** and links work without expiring prematurely.

---

## 1. Why Emails Go to Spam (and How to Fix It)

By default, Supabase sends emails through a shared pool (`noreply@mail.app.supabase.io`). Major mail providers (Gmail, Microsoft 365, Yahoo) frequently flag shared pool emails as spam because:
1. Shared IPs lack dedicated SPF, DKIM, and DMARC alignment.
2. Built-in Supabase email has a strict rate limit of **3 emails per hour**.

### The Permanent Solution: Custom SMTP
To achieve 99.9%+ inbox delivery:
1. Open your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Go to **Project Settings** > **Authentication** > **SMTP Settings**.
3. Toggle **Enable Custom SMTP**.
4. Configure one of the recommended free/inexpensive transactional email providers:

| Provider | Free Tier | Host | Port | Encryption |
| :--- | :--- | :--- | :--- | :--- |
| **Resend** (Recommended) | 3,000 emails/mo | `smtp.resend.com` | `465` or `587` | TLS / STARTTLS |
| **Brevo** (Sendinblue) | 300 emails/day | `smtp-relay.brevo.com` | `587` | STARTTLS |
| **SendGrid** | 100 emails/day | `smtp.sendgrid.net` | `587` | STARTTLS |
| **Gmail SMTP** | 500 emails/day | `smtp.gmail.com` | `465` (SSL) | SSL |

5. Set **Sender Email** to your custom domain or verified address (e.g. `noreply@yourdomain.com` or your Gmail address).
6. Set **Sender Name** to `Barangay Gordon Heights`.

---

## 2. Update the Reset Password Email Template in Supabase

1. In Supabase Dashboard, go to **Authentication** > **Email Templates**.
2. Select **Reset Password**.
3. Set the **Subject Line**:
   ```
   Reset your Barangay Gordon Heights account password
   ```
4. Copy the entire contents of `supabase/email-templates/reset-password.html` and paste it into the **Message Body (HTML)** editor.
5. Click **Save Changes**.

---

## 3. Configure Redirect URLs in Supabase

To ensure links never fail with "Invalid redirect URL":
1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**.
2. Verify **Site URL** is set to your production domain or local environment:
   - For local development: `http://localhost:3000`
   - For production: `https://your-production-domain.vercel.app`
3. Under **Redirect URLs**, add the following entries:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/reset-password`
   - `https://your-production-domain.vercel.app/auth/callback`
   - `https://your-production-domain.vercel.app/reset-password`
4. Click **Save**.
