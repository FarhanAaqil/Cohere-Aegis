# LC Monitor Deployment Runbook

This runbook covers deploying LC Monitor to the active Supabase project and a PHP-capable web host.

Active Supabase project reference:

```text
ivipigucanknjjvmnble
```

Required local tools:

- Node.js 18 or newer
- npm
- Supabase CLI
- Access to the target Supabase project
- Access to the production web host

## 1. Prepare Local Config

Copy these templates if you are starting from a fresh clone:

```text
.env.example                      -> .env
extension/config.example.js       -> extension/config.js
public/supabase-proxy.example.php -> public/supabase-proxy.php
```

Fill `.env`:

```env
VITE_SUPABASE_PROJECT_ID=ivipigucanknjjvmnble
VITE_SUPABASE_URL=https://ivipigucanknjjvmnble.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
VITE_EXTENSION_ID=
```

Fill `extension/config.js` with the same Supabase URL and anon/publishable key.

In `public/supabase-proxy.php`, set:

```php
$SUPABASE_FUNCTIONS_BASE = "https://ivipigucanknjjvmnble.supabase.co/functions/v1/";
```

Never commit files containing real keys.

## 2. Install and Validate Locally

```bash
npm install
npm run lint
npm run test
npm run build
```

The production build is written to `dist/`.

## 3. Link Supabase

```bash
npx supabase login
npx supabase link --project-ref ivipigucanknjjvmnble
```

Confirm the linked project before applying migrations or deploying functions.

## 4. Set Supabase Secrets

Set a stable JWT secret. Use a long random value and do not rotate it casually; changing it logs everyone out.

```bash
npx supabase secrets set JWT_SECRET=paste-a-long-random-string
```

Optional but recommended production secrets:

```bash
npx supabase secrets set APP_URL=https://your-production-domain.com
npx supabase secrets set RESEND_API_KEY=re_your_key
npx supabase secrets set RESEND_FROM="LC Monitor <no-reply@your-domain.com>"
npx supabase secrets set CRON_SECRET=paste-a-long-random-string
```

`RESEND_API_KEY` enables real email delivery. Without it, notification responses are stubbed.

## 5. Apply Database Migrations

```bash
npx supabase db push
```

If CLI migration fails, open Supabase Dashboard -> SQL Editor and apply the files in `supabase/migrations/` from oldest to newest.

Important late migrations include:

```text
20260812_001_departments.sql
20260812000200_shifts.sql
20260812000300_leave_requests.sql
20260812000400_policies.sql
20260812000500_ip_and_flags.sql
20260813000100_hr_manager_role.sql
20260813000200_fix_attendance_corrections.sql
20260814000100_manager_comment.sql
```

## 6. Configure Storage

In Supabase Dashboard -> Storage, ensure a public bucket named:

```text
screenshots
```

The screenshot upload flow depends on this bucket.

## 7. Deploy Edge Functions

```bash
npx supabase functions deploy auth
npx supabase functions deploy work-sessions
npx supabase functions deploy admin
npx supabase functions deploy chat
npx supabase functions deploy tasks
npx supabase functions deploy notifications
```

Redeploy the relevant function whenever its code or required secrets change.

## 8. Create the First Admin

After `auth` is deployed and `JWT_SECRET` is set, create an admin user.

PowerShell example:

```powershell
$body = '{"email":"admin@lemoncode.com","password":"admin12345","first_name":"Admin","last_name":"User","role":"ADMIN"}'
Invoke-RestMethod -Uri "https://ivipigucanknjjvmnble.supabase.co/functions/v1/auth/signup" -Method POST -ContentType "application/json" -Body $body
```

Passwords must be at least 8 characters.

After login, create real users from Admin -> Users.

## 9. Build and Upload the Web App

```bash
npm run build
```

Upload everything inside `dist/` to the web host document root, such as:

```text
public_html
htdocs
www
```

The host must support PHP because production API calls use `supabase-proxy.php`.

## 10. Verify Production Proxy

Open:

```text
https://your-domain.com/supabase-proxy.php
```

Expected response:

```json
{ "error": "Path is required" }
```

Then open:

```text
https://your-domain.com
```

Log in and confirm that dashboard API calls succeed.

## 11. Configure the Chrome Extension

For local/unpacked testing:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select the `extension/` folder.
5. Copy the extension ID if needed.
6. Set `VITE_EXTENSION_ID` and rebuild the frontend if direct extension messaging is required.

For production packaging, keep the extension ID stable and update `manifest.json` domain rules if the production domain changes.

## 12. Configure Scheduled Emails

Scheduled notification jobs call the `notifications` Edge Function with one of these bodies:

```json
{ "type": "missed-clock-out" }
```

```json
{ "type": "daily-summary" }
```

Suggested schedules for India time:

| Job | Cron | Meaning |
| --- | --- | --- |
| Missed clock-out | `0 14 * * 1-5` | 7:30 PM IST weekdays |
| Daily summary | `30 3 * * *` | 9:00 AM IST daily |

Scheduled requests must include header:

```text
x-cron-secret: <CRON_SECRET>
```

Alternatively, authorize with the Supabase service role key.

## 13. Post-Deployment Checklist

- Login works for admin and employee accounts.
- Admin -> Users can create and update users.
- Clock in/out works.
- Break in/out works.
- Attendance and timesheet pages load.
- Leave submission and approval work.
- Reports and analytics load for manager/admin users.
- Admin -> Trusted IPs has office CIDR ranges configured.
- Screenshot bucket exists and screenshot uploads work.
- Browser history records appear after extension testing.
- Email status shows configured when Resend is enabled.
- Production proxy points to the correct Supabase project.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Cannot log in | `JWT_SECRET` missing or `auth` not redeployed | Set the secret and redeploy `auth` |
| Existing users are logged out | `JWT_SECRET` changed | Users must log in again |
| Production API calls fail | Missing/wrong `supabase-proxy.php` | Upload proxy and check project URL |
| Proxy returns PHP source code | Host is not executing PHP | Enable PHP or use a PHP-capable host |
| No screenshots | Extension not loaded, user not clocked in, or bucket missing | Load extension, clock in, create `screenshots` bucket |
| Screenshot upload fails | Storage bucket or permissions issue | Confirm public `screenshots` bucket exists |
| Browser history missing | Extension session missing or user clocked out | Log in again, clock in, check extension popup/storage |
| Emails not sent | Resend secrets missing or unverified sender | Set `RESEND_API_KEY`, verify domain, redeploy |
| Manager cannot see team | User/team assignment incorrect | Fix team and manager assignments in Admin |
| WFH/SITE wrong | Missing CIDR ranges | Add office ranges in Admin -> Trusted IPs |

## Rollback Notes

Frontend rollback is usually replacing the web host files with a previous `dist/` build.

Function rollback requires redeploying the previous function source. Database migrations are not automatically reversible; create a new corrective migration rather than editing already-applied production migrations.
