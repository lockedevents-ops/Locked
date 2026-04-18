# Production Deployment Checklist

This document outlines all the critical steps, configurations, and environment variables required to move the **Locked Events** platform from development to production.

---

## 1. Environment Variables (Vercel)

Ensure the following variables are configured in your Vercel Project Settings.

### Core & Supabase
| Variable | Value/Description |
|----------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your production Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your production Supabase Anon Key |
| `NEXT_PUBLIC_SUPABASE_PROJECT_ID` | Your Supabase Project Ref (e.g., `abcdefghijk`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **[SECRET]** Production Service Role Key (Admin access) |
| `NEXT_PUBLIC_SITE_URL` | Your production domain (e.g., `https://locked.com`) |
| `NEXT_PUBLIC_APP_URL` | Same as `NEXT_PUBLIC_SITE_URL` |

### Communication (Email)
| Variable | Value/Description |
|----------|-------------------|
| `SMTP_HOST` | `smtp.gmail.com` (or your provider host) |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | **[SECRET]** Gmail App Password (NOT your account password) |
| `SMTP_FROM` | `"Locked Events" <your-email@gmail.com>` |

### Automation & Security
| Variable | Value/Description |
|----------|-------------------|
| `CRON_SECRET` | **[SECRET]** A long random string used to secure cron/webhook endpoints. |

### Payments (Hubtel)
| Variable | Value/Description |
|----------|-------------------|
| `HUBTEL_CLIENT_ID` | Your Hubtel Merchant Client ID |
| `HUBTEL_CLIENT_SECRET` | **[SECRET]** Your Hubtel Merchant Client Secret |
| `HUBTEL_MERCHANT_ACCOUNT_NUMBER` | Your Hubtel Merchant Account Number |
| `HUBTEL_PREPAID_DEPOSIT_ID` | Required for automated payouts |
| `NEXT_PUBLIC_HUBTEL_POS_SALES_ID` | For account verification services |

---

## 2. Supabase Dashboard Configuration

### Authentication Settings
1. **Site URL**: Set to `https://your-production-domain.com`.
2. **Redirect URLs**: Add `https://your-production-domain.com/auth/callback` to the allow list.
3. **Social Providers**: 
   - Follow the individual setup guides for OAuth:
     - [Google Auth Setup](./GOOGLE_AUTH_SETUP.md)
     - [Facebook Auth Setup](./FACEBOOK_AUTH_SETUP.md)
     - [Apple Auth Setup](./APPLE_AUTH_SETUP.md)

### Database Webhooks
Log in to Supabase and navigate to **Database > Webhooks** to create the following:

**Welcome Email Webhook**
- **Name**: `send_welcome_email`
- **Table**: `profiles`
- **Events**: `INSERT`
- **URL**: `https://your-production-domain.com/api/webhooks/welcome`
- **HTTP Header**: `Authorization: Bearer YOUR_CRON_SECRET`

---

## 3. Database Migrations

Before launching, ensure your production database is up to date:

1. Run the consolidated migration: `database/migrations/000_consolidated_migration.sql`.
   - This includes core tables, `cart_items`, and `email_reminders`.
2. Ensure the signup trigger is active: `database/migrations/individual/021_create_profile_on_signup.sql`.

---

## 4. GitHub Actions (Hourly Reminders)

To bypass Vercel's free tier cron limits, use GitHub Actions for reminders:

1. Go to your GitHub Repo **Settings > Secrets and variables > Actions**.
2. Add the following **Repository Secrets**:
   - `SITE_URL`: `https://your-production-domain.com`
   - `CRON_SECRET`: Must match the `CRON_SECRET` set in Vercel.

The workflow is located at `.github/workflows/reminders.yml`.

---

## 5. Hubtel Callback Configuration

In your Hubtel Portal, ensure the callback URL for payments is set to:
`https://your-production-domain.com/api/webhooks/hubtel/payments` (if applicable)

---

## 6. Pre-Launch Verification Checklist

- [ ] **Auth**: Can I sign up with Email? Can I sign in with Google/Facebook?
- [ ] **Emails**: Do I receive a welcome email on signup?
- [ ] **Tickets**: Check a free event — does it correctly show "spots remaining"?
- [ ] **Reminders**: Manually trigger the "hourly-reminders" Action in GitHub — does it complete with 200 OK?
- [ ] **Cart**: Add merch to cart — does it persist across refresh?
- [ ] **RLS**: Log out and try to access `/dashboards/user` — does it correctly redirect to sign-in?

---
*Created for Locked Events Go-Live Phase.*
