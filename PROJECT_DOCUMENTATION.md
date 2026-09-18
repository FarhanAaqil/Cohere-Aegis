# LC Monitor - Final Project Documentation

## Project Summary

LC Monitor is an internal workforce monitoring and attendance platform for AIIDA. It provides a React-based web dashboard, Supabase PostgreSQL database, Supabase Edge Function backend, and Chrome Manifest V3 extension for employee work-session tracking, attendance, leave management, reporting, screenshots, browser-history monitoring, chat, tasks, policies, and admin operations.

```text
React/Vite Dashboard <-> Supabase Edge Functions <-> PostgreSQL
        |                         ^
        v                         |
 Chrome MV3 Extension ------------+
```

Active Supabase project reference:

```text
ivipigucanknjjvmnble
```

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI, lucide-react |
| Routing | React Router DOM v6 |
| Data fetching | TanStack React Query v5 |
| Charts | Recharts |
| Backend | Supabase Edge Functions, Deno, TypeScript |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime and WebRTC |
| Extension | Chrome Extension Manifest V3 |
| Testing | Vitest, React Testing Library |
| Email | Resend through Supabase Edge Function |

## Core Features

| Module | Description |
| --- | --- |
| Authentication | Custom email/password login, app-issued JWT sessions, role-aware access |
| Workday Tracking | Clock in/out, break in/out, active status, daily multi-session tracking |
| Attendance | Monthly attendance view, attendance corrections, manager/admin review |
| Timesheets | Session history, employee notes, manager comments, CSV export |
| Leave Management | Employee leave requests, manager/admin/HR approval, attendance sync |
| Shift Scheduling | Shift creation, user assignment, late and early flag detection |
| Team Management | Team assignment, manager overview, active employee tracking |
| Departments | Admin-managed departments and department assignment |
| Reports | Date, employee, department, WFH/site, late, and early filters |
| Analytics | Monthly KPIs, total hours, break averages, WFH/site split |
| Policies | Employee policy access and admin/HR policy management |
| Monitoring | Screenshot upload and browser-history duration tracking |
| Chat | Groups, direct messages, search, and WebRTC call UI |
| Tasks | Kanban-style task management and activity history |
| Email Notifications | Welcome, leave, missed clock-out, daily summary, and test emails |
| Audit Logs | Admin/HR audit log review |
| Trusted IPs | CIDR-based office IP ranges for WFH/site classification |

## User Roles

| Role | Access Summary |
| --- | --- |
| `EMPLOYEE` | Dashboard, workday, timesheet, attendance, leave, policies, chat, tasks |
| `MANAGER` | Employee access plus team overview, reports, screenshots, browser history, approvals |
| `HR_MANAGER` | Admin-level HR/admin access without being named `ADMIN` |
| `ADMIN` | Full user, team, department, shift, policy, IP, audit, analytics, and email administration |

## Application Routes

| Path | Page | Intended Roles |
| --- | --- | --- |
| `/login` | Login | Public |
| `/` | Dashboard | All authenticated users |
| `/employee` | My Workday | All authenticated users |
| `/timesheet` | Timesheet | All authenticated users |
| `/attendance` | Attendance | All authenticated users |
| `/leave` | Leave Requests | All authenticated users |
| `/reports` | Reports | Manager, HR Manager, Admin |
| `/policies` | Policies | All users; write access for HR/Admin |
| `/chats` | Chat | All authenticated users |
| `/tasks` | Tasks | All authenticated users |
| `/team` | Team Overview | Manager, HR Manager, Admin |
| `/browser-history` | Browser History | Manager, HR Manager, Admin |
| `/screenshots` | Screenshots | Manager, HR Manager, Admin |
| `/admin` | Admin Home | HR Manager, Admin |
| `/admin/users` | User Management | HR Manager, Admin |
| `/admin/teams` | Team Management | HR Manager, Admin |
| `/admin/browser-history` | Admin Browser History | HR Manager, Admin |
| `/admin/shifts` | Shift Scheduling | HR Manager, Admin |
| `/admin/departments` | Departments | HR Manager, Admin |
| `/admin/analytics` | Analytics | HR Manager, Admin |
| `/admin/audit-logs` | Audit Logs | HR Manager, Admin |
| `/admin/ip-config` | Trusted IP Ranges | HR Manager, Admin |
| `/admin/email` | Email Settings | HR Manager, Admin |

## Project Structure

```text
Lc-Monitor-main/
|-- src/
|   |-- App.tsx                         # Routes and providers
|   |-- main.tsx                        # React entry point
|   |-- contexts/                       # Auth and theme contexts
|   |-- components/                     # Layout, sidebar, protected routes, UI, chat
|   |-- pages/                          # Route pages
|   |-- pages/admin/                    # Admin and HR pages
|   |-- lib/                            # API clients, auth helpers, roles, utilities
|   |-- hooks/                          # App hooks, including WebRTC
|   |-- integrations/supabase/          # Supabase client/types
|   |-- test/                           # Vitest setup and tests
|-- supabase/
|   |-- functions/                      # Supabase Edge Functions
|   |-- migrations/                     # PostgreSQL migrations
|   |-- config.toml                     # Supabase configuration
|-- extension/                         # Chrome MV3 extension
|-- public/                            # Static files and production PHP proxy
|-- docs/                              # Detailed architecture/API/extension docs
|-- README.md                          # Developer documentation
|-- DEPLOYMENT.md                      # Deployment runbook
|-- PROJECT_DOCUMENTATION.md           # Final project documentation file
```

## Architecture Overview

The frontend handles the user interface and calls backend APIs through Supabase Edge Functions. Edge Functions perform authentication, authorization, business logic, and privileged database access. PostgreSQL stores all operational records. The Chrome extension receives the logged-in session from the web dashboard and uploads monitoring records only while a user is clocked in.

### Frontend

The frontend is built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. Route-level pages are stored in `src/pages/`, reusable UI is in `src/components/`, and API clients are in `src/lib/`.

The app uses TanStack React Query for server-state fetching and caching. Authentication state is managed through `src/contexts/AuthContext.tsx`.

### Backend

The backend is implemented using Supabase Edge Functions:

| Function | Responsibility |
| --- | --- |
| `auth` | Login, signup, current user, JWT creation |
| `work-sessions` | Clocking, breaks, attendance, leave, shifts, reports, screenshots, browser history |
| `admin` | Users, teams, departments, policies, IP ranges, audit logs, email checks |
| `chat` | Groups, direct messages, members, messages, search |
| `tasks` | Task CRUD and task activity |
| `notifications` | Resend email delivery and scheduled notification jobs |

### Database

The database schema is managed by SQL migrations under `supabase/migrations/`.

Core tables include:

```text
users
teams
devices
events
work_sessions
breaks
attendance
attendance_corrections
screenshots
browser_history
chat_groups
chat_group_members
chat_messages
tasks
task_activity
departments
shifts
user_shifts
leave_requests
policies
office_ip_ranges
```

## Authentication Model

LC Monitor uses custom authentication implemented in the `auth` Edge Function rather than relying on Supabase Auth as the primary application auth system.

Authentication flow:

1. User submits email and password from the login page.
2. The `auth` Edge Function validates credentials against the `users` table.
3. Passwords are verified using PBKDF2.
4. The backend signs a 24-hour JWT using `JWT_SECRET`.
5. The frontend stores the token and user profile in local storage.
6. API requests include `Authorization: Bearer <token>`.
7. Edge Functions verify the token and enforce role/team access.

Changing `JWT_SECRET` invalidates existing user sessions.

## Work Session Flow

Clock-in flow:

1. Employee clicks Clock In.
2. Frontend calls `work-sessions/clock-in`.
3. Backend closes stale open sessions if needed.
4. Backend captures client IP from proxy/CDN headers.
5. Backend classifies login as `SITE` or `WFH` using trusted IP ranges.
6. Backend checks assigned shift start time and sets `late_flag`.
7. A new `work_sessions` row is created.
8. Frontend tells the Chrome extension to start monitoring.

Clock-out flow:

1. Employee clicks Clock Out.
2. Backend closes active breaks.
3. Backend calculates active working seconds minus break duration.
4. Backend checks assigned shift end time and sets `early_flag`.
5. Work session is closed.
6. Frontend tells the Chrome extension to stop monitoring.

## Chrome Extension

The Chrome extension is located in `extension/`. It is responsible for collecting monitoring data while an employee is clocked in.

Extension responsibilities:

- Store the logged-in LC Monitor session.
- Start monitoring after clock-in.
- Stop monitoring after clock-out or logout.
- Capture screenshots approximately every 15 minutes.
- Track active tab focus duration.
- Flush browser-history records approximately every 60 seconds.
- Upload screenshots and browser-history records to the `work-sessions` Edge Function.

Local extension setup:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select the `extension/` folder.
5. Log in to the LC Monitor web app.
6. Clock in to start monitoring.

## Environment Configuration

Frontend `.env` variables:

```env
VITE_SUPABASE_PROJECT_ID=your_project_ref
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
VITE_EXTENSION_ID=
```

Backend Supabase secrets:

```text
JWT_SECRET
RESEND_API_KEY
RESEND_FROM
CRON_SECRET
APP_URL
```

Important local files:

```text
.env.example                      -> .env
extension/config.example.js       -> extension/config.js
public/supabase-proxy.example.php -> public/supabase-proxy.php
```

Real secrets and keys must not be committed to git.

## Setup and Development

Prerequisites:

- Node.js 18 or newer
- npm
- Supabase CLI
- Chrome or Chromium browser for extension testing

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Local app URL:

```text
http://localhost:8080
```

Common commands:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Create production build in `dist/` |
| `npm run build:dev` | Build using Vite development mode |
| `npm run preview` | Preview built app locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |

## Deployment Overview

High-level production deployment steps:

1. Link Supabase project:

```bash
npx supabase login
npx supabase link --project-ref ivipigucanknjjvmnble
```

2. Set required secrets:

```bash
npx supabase secrets set JWT_SECRET=paste-a-long-random-string
npx supabase secrets set APP_URL=https://your-production-domain.com
npx supabase secrets set RESEND_API_KEY=re_your_key
npx supabase secrets set RESEND_FROM="LC Monitor <no-reply@your-domain.com>"
npx supabase secrets set CRON_SECRET=paste-a-long-random-string
```

3. Apply database migrations:

```bash
npx supabase db push
```

4. Ensure Supabase Storage contains a public bucket named:

```text
screenshots
```

5. Deploy Edge Functions:

```bash
npx supabase functions deploy auth
npx supabase functions deploy work-sessions
npx supabase functions deploy admin
npx supabase functions deploy chat
npx supabase functions deploy tasks
npx supabase functions deploy notifications
```

6. Build frontend:

```bash
npm run build
```

7. Upload the contents of `dist/` to the production web host.

Production hosting must support PHP because production API calls use `supabase-proxy.php`.

## Production Proxy

In development, the app calls Supabase Edge Functions directly:

```text
https://<project-ref>.supabase.co/functions/v1/<function>
```

In production, the app calls:

```text
/supabase-proxy.php?path=<function>/<endpoint>
```

The PHP proxy forwards requests to Supabase Edge Functions and helps avoid CORS issues on PHP-based hosting.

Expected proxy health check:

```text
https://your-domain.com/supabase-proxy.php
```

Expected response:

```json
{ "error": "Path is required" }
```

## Email Notifications

Emails are sent by the `notifications` Edge Function through Resend.

Supported notification types:

```text
leave
leave-submitted
welcome
test
missed-clock-out
daily-summary
```

If `RESEND_API_KEY` is not configured, the function returns stubbed responses and does not send real email.

Scheduled jobs must include `x-cron-secret` matching `CRON_SECRET`, or use the Supabase service role key.

Suggested scheduled jobs:

| Job | Cron | Meaning |
| --- | --- | --- |
| Missed clock-out | `0 14 * * 1-5` | 7:30 PM IST weekdays |
| Daily summary | `30 3 * * *` | 9:00 AM IST daily |

## Testing

The project uses Vitest and React Testing Library.

Run tests:

```bash
npm run test
```

Run linting:

```bash
npm run lint
```

Existing tests are stored in:

```text
src/test/
```

## Security Notes

- Do not commit `.env`, `extension/config.js`, or `public/supabase-proxy.php` with real credentials.
- Supabase service role keys must only be used server-side.
- Frontend stores the app JWT and user profile in local storage.
- Server-side Edge Function role checks are required for admin and manager operations.
- Changing `JWT_SECRET` invalidates existing sessions.
- The Chrome extension should only monitor while a user is clocked in.

## Troubleshooting

| Problem | Likely Cause | Fix |
| --- | --- | --- |
| Cannot log in | Missing `JWT_SECRET` or undeployed `auth` function | Set secret and redeploy `auth` |
| Existing users are logged out | `JWT_SECRET` changed | Users must log in again |
| Production API calls fail | Missing or incorrect `supabase-proxy.php` | Upload/fix proxy and project URL |
| Proxy returns PHP source code | Host is not executing PHP | Enable PHP or use PHP-capable hosting |
| No screenshots | Extension not loaded, user not clocked in, or bucket missing | Load extension, clock in, create `screenshots` bucket |
| Browser history missing | Extension session missing or user is clocked out | Log in again and clock in |
| Emails not sent | Resend secrets missing or sender not verified | Configure Resend and redeploy functions |
| Manager cannot see team | Incorrect team assignment | Fix users and teams in Admin |
| WFH/SITE classification wrong | Missing trusted IP ranges | Add office CIDR ranges in Admin -> Trusted IPs |

## Maintenance Notes

- Keep database migrations append-only after production deployment.
- Update Supabase generated types after schema changes.
- Keep frontend API wrappers aligned with Edge Function routes.
- Update documentation whenever routes, roles, environment variables, deployment steps, or backend workflows change.

## Supporting Documentation

Additional detailed documentation is available in:

```text
README.md
DEPLOYMENT.md
docs/ARCHITECTURE.md
docs/API_REFERENCE.md
docs/CHROME_EXTENSION.md
```
