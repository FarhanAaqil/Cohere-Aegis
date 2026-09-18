# Cohere Aegis Deployment Runbook

This runbook covers deploying **Cohere Aegis** to a target Supabase project and a web host (optionally supporting PHP for CORS proxying).

---

## Prerequisites

Ensure you have installed:
- **Node.js**: v18 or newer
- **npm**: v9 or newer
- **Supabase CLI**: (`npm install -g supabase` or `npx supabase`)
- Access to your target Supabase project
- Web hosting document root (e.g. Vercel, Netlify, Apache, or Nginx with PHP)

---

## 1. Local Configuration

Prepare local configuration from templates:

```bash
# Frontend environment
cp .env.example .env

# Chrome extension configuration
cp extension/config.example.js extension/config.js

# Production PHP proxy (if deploying behind PHP host)
cp public/supabase-proxy.example.php public/supabase-proxy.php
```

Fill in `.env`:

```env
VITE_SUPABASE_PROJECT_ID=your_project_ref
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
VITE_EXTENSION_ID=
```

Fill `extension/config.js` with your Supabase URL and anon key.

In `public/supabase-proxy.php`, set:

```php
$SUPABASE_FUNCTIONS_BASE = "https://your_project_ref.supabase.co/functions/v1/";
```

> [!IMPORTANT]
> Never commit `.env`, `extension/config.js`, or live proxy files containing production secrets to git.

---

## 2. Build & Validate

Test the build locally before deploying:

```bash
npm install
npm run lint
npm run test
npm run build
```

The optimized production assets will be generated in `dist/`.

---

## 3. Link Supabase Project

Link your local environment to your remote Supabase project:

```bash
npx supabase login
npx supabase link --project-ref your_project_ref
```

Verify that the linked project reference matches your intended target.

---

## 4. Set Environment Secrets

Set a cryptographically strong, stable JWT secret:

```bash
npx supabase secrets set JWT_SECRET="your-long-random-secret-string"
```

> [!CAUTION]
> Changing `JWT_SECRET` after launch invalidates all active user sessions and requires re-authentication.

Configure optional production services:

```bash
npx supabase secrets set APP_URL="https://your-domain.com"
npx supabase secrets set RESEND_API_KEY="re_your_api_key"
npx supabase secrets set RESEND_FROM="Cohere Aegis <no-reply@your-domain.com>"
npx supabase secrets set CRON_SECRET="your-cron-secret-key"
```

---

## 5. Storage Configuration

In **Supabase Dashboard → Storage**, ensure a public bucket is created:

```text
screenshots
```

This bucket stores activity verification captures uploaded via the extension or web client.

---

## 6. Deploy Edge Functions

Deploy the backend services:

```bash
npx supabase functions deploy auth
npx supabase functions deploy work-sessions
npx supabase functions deploy admin
npx supabase functions deploy chat
npx supabase functions deploy tasks
npx supabase functions deploy notifications
```

---

## 7. Provision the Initial Administrator

Once `auth` is deployed and `JWT_SECRET` is set, create the first administrator account:

### PowerShell:
```powershell
$body = '{"email":"admin@example.com","password":"<your-secure-password>","first_name":"Admin","last_name":"User","role":"ADMIN"}'
Invoke-RestMethod -Uri "https://your_project_ref.supabase.co/functions/v1/auth/signup" -Method POST -ContentType "application/json" -Body $body
```

### cURL:
```bash
curl -X POST "https://your_project_ref.supabase.co/functions/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"<your-secure-password>","first_name":"Admin","last_name":"User","role":"ADMIN"}'
```

After initial login, additional users and managers can be created directly from **Admin → Users** in the dashboard.

---

## 8. Deploy the Web Application

Upload the contents of `dist/` to your web server document root (`public_html`, `www`, or hosting platform).

If using the PHP reverse proxy (`supabase-proxy.php`):
1. Verify `https://your-domain.com/supabase-proxy.php` returns:
   ```json
   { "error": "Path is required" }
   ```
2. Open `https://your-domain.com` in your browser.
3. Sign in with your admin credentials to confirm API connectivity.

---

## 9. Chrome Extension Packaging

To distribute the companion extension:
1. Ensure `extension/config.js` is updated with your production Supabase URL and anon key.
2. In `extension/manifest.json`, verify extension permissions.
3. Create a zip archive containing the `extension/` files and place it in `public/downloads/cohere-aegis-extension.zip`.
4. Rebuild the frontend (`npm run build`) so users can download the packaged extension from `/manual`.

---

## 10. Post-Deployment Checklist

- [ ] Admin and Employee login succeed.
- [ ] Clock-in and Clock-out record sessions.
- [ ] Break start/stop accurately tracks duration.
- [ ] Timesheet and attendance tables load data.
- [ ] Leave requests can be submitted and reviewed.
- [ ] Screenshot upload functions to the `screenshots` bucket.
- [ ] Extension syncs active session from the dashboard.
- [ ] Admin IP configuration applies correct WFH/Office classifications.
