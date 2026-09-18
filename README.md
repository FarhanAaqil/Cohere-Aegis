# Lemon Host Monitor

Lemon Host Monitor is an internal workforce attendance and monitoring platform. It includes a React web dashboard, Supabase PostgreSQL/Edge Functions, and a Chrome Manifest V3 extension for clock-in tracking, attendance, screenshots, browser-history duration tracking, team review, leave, shifts, policies, chat, tasks, reports, analytics, and HR/admin operations.

```text
React/Vite Dashboard <-> Supabase Edge Functions <-> PostgreSQL
        |                         ^
        v                         |
 Chrome MV3 Extension ------------+
```

Active Supabase project reference: `ivipigucanknjjvmnble`

Real credentials must stay out of git. Do not commit `.env`, `extension/config.js`, or `public/supabase-proxy.php` when they contain production values.

## Documentation

| Document or page | Purpose |
| --- | --- |
| `README.md` | Main project overview, setup, routes, commands, and maintenance notes |
| `PROJECT_DOCUMENTATION.md` | Full project documentation prepared for handoff |
| `DEPLOYMENT.md` | Production deployment runbook |
| `/manual` | In-app user manual for employees, managers, HR, admins, and extension setup |
| `public/downloads/lemon-host-monitor-extension.zip` | Packaged Chrome extension download used by the in-app manual |

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI, lucide-react |
| Routing | React Router DOM v6 |
| Data fetching | TanStack React Query v5 |
| Charts | Recharts |
| Backend | Supabase Edge Functions, Deno, TypeScript |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime and WebRTC for chat/calls |
| Extension | Chrome Extension Manifest V3 |
| Testing | Vitest, React Testing Library |

## Main Features

| Module | What it supports |
| --- | --- |
| Authentication | Custom email/password login, app-issued JWTs, role-aware sessions |
| Dashboard | Role-based dashboard views for employees, managers, HR managers, and admins |
| Workday | Clock in/out, break in/out, active status, notes, and session history |
| Attendance | Monthly attendance, late/early flags, correction requests, and review workflows |
| Timesheets | Work-session history, employee notes, manager comments, and CSV export |
| Leave | Leave requests, approval workflows, and attendance synchronization |
| Shifts | Shift creation, assignment, late tracking, early-leave tracking, and schedules |
| Teams | Team assignment, manager overview, active employee visibility |
| Departments | Department management and user assignment |
| Reports | Filters for date, employee, department, WFH/site, late, and early status |
| Analytics | Monthly hours, break averages, WFH/site split, and late/early counts |
| Policies | Employee policy reading and admin/HR policy management |
| Monitoring | Screenshot upload, browser-history duration tracking, and manager/admin review |
| Chat | Groups, direct messages, search, and WebRTC call UI |
| Tasks | Kanban-style task management and task activity history |
| User Manual | In-app operational guide and Chrome extension download |
| Audit | Admin/HR audit logs for operational changes |

## Roles

| Role | Access summary |
| --- | --- |
| `EMPLOYEE` | Dashboard, My Workday, timesheet, attendance, leave, policies, manual, chat, and tasks |
| `MANAGER` | Employee access plus team overview, reports, screenshots, browser history, and approvals |
| `HR_MANAGER` | HR/admin operations, users, teams, departments, shifts, policies, analytics, and audit logs |
| `ADMIN` | Full user, team, department, shift, policy, IP, audit, analytics, and monitoring administration |

Role helpers live in `src/lib/roles.ts`.

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm
- Supabase CLI for database/function deployment
- Chrome or another Chromium browser for extension testing

### Install and run

```bash
npm install
npm run dev
```

The local Vite app runs at:

```text
http://localhost:8080
```

### Environment files

For local development, copy the example files and fill the values for your environment:

```text
.env.example                      -> .env
extension/config.example.js       -> extension/config.js
public/supabase-proxy.example.php -> public/supabase-proxy.php
```

Frontend environment variables:

```env
VITE_SUPABASE_PROJECT_ID=your_project_ref
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
VITE_EXTENSION_ID=
```

Backend Supabase secrets:

```text
JWT_SECRET
CRON_SECRET
APP_URL
```

`JWT_SECRET` is required by `auth`, `admin`, `work-sessions`, `chat`, and `tasks`. Changing it invalidates existing app sessions.

## Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Vite app |
| `npm run build` | Create a production build in `dist/` |
| `npm run build:dev` | Build using Vite development mode |
| `npm run preview` | Preview the built app locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Run Vitest in watch mode |

## Project Structure

```text
Lc-Monitor-main/
|-- src/
|   |-- App.tsx                         # Routes and providers
|   |-- main.tsx                        # React entry point
|   |-- contexts/                       # Auth and theme contexts
|   |-- components/                     # Layout, sidebar, protected routes, UI, chat
|   |-- pages/                          # Route pages
|   |-- pages/admin/                    # Admin and HR management pages
|   |-- lib/                            # API clients, auth helpers, roles, utilities
|   |-- hooks/                          # App hooks, including WebRTC
|   |-- integrations/supabase/          # Supabase client/types
|   |-- test/                           # Vitest setup and examples
|-- supabase/
|   |-- functions/                      # Edge Functions
|   |-- migrations/                     # PostgreSQL schema migrations
|   |-- config.toml                     # Supabase local/project config
|-- extension/                         # Chrome MV3 extension source
|-- public/
|   |-- downloads/                      # Packaged extension ZIP for the in-app manual
|   |-- supabase-proxy.example.php      # Production Edge Function proxy template
|-- DEPLOYMENT.md                      # Production runbook
|-- PROJECT_DOCUMENTATION.md           # Final project documentation
```

## Application Routes

| Path | Page | Intended roles |
| --- | --- | --- |
| `/login` | Login | Public |
| `/` | Dashboard | All authenticated users |
| `/employee` | My Workday | All authenticated users |
| `/timesheet` | Timesheet | All authenticated users |
| `/attendance` | Attendance | All authenticated users |
| `/leave` | Leave Requests | All authenticated users |
| `/reports` | Reports | Manager, HR Manager, Admin |
| `/policies` | Policies | All users; write access for HR/Admin |
| `/manual` | User Manual and Extension Download | All authenticated users |
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

The route tree is defined in `src/App.tsx`. Server-side role and team checks are enforced in the Supabase Edge Functions.

## Authentication Model

Lemon Host Monitor uses custom authentication implemented in `supabase/functions/auth/index.ts`.

1. Users submit email and password to `/functions/v1/auth/login`.
2. The function validates credentials against the `users` table.
3. Passwords are verified with PBKDF2; legacy SHA-256 hashes are migrated after successful login.
4. The function signs a 24-hour HS256 JWT using `JWT_SECRET`.
5. The frontend stores the token in local storage and sends it as `Authorization: Bearer <token>`.
6. Edge Functions verify the JWT and enforce role/team access.

Frontend auth helpers live in `src/lib/auth.ts` and `src/contexts/AuthContext.tsx`.

## Backend Overview

Supabase Edge Functions:

| Function | Responsibility |
| --- | --- |
| `auth` | Login, signup, and current-user session validation |
| `work-sessions` | Clocking, breaks, attendance, leave, shifts, reports, screenshots, and browser history |
| `admin` | Users, teams, departments, policies, IP ranges, audit logs, and admin data |
| `chat` | Groups, direct messages, members, messages, and search |
| `tasks` | Task CRUD and task activity |

Frontend API wrappers live in `src/lib/*-api.ts`.

In development the app calls Edge Functions directly:

```text
https://<project-ref>.supabase.co/functions/v1/<function>
```

In production the app can call through the PHP proxy:

```text
/supabase-proxy.php?path=<function>/<endpoint>
```

## Database Overview

The database schema is managed by SQL files in `supabase/migrations/`.

Core tables:

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

Important enums include `user_role`, `user_status`, `event_type`, `session_source`, `attendance_status`, `correction_status`, `task_status`, and `task_priority`.

## Chrome Extension

The extension in `extension/` is a Chrome Manifest V3 extension. It stores the app session, listens for clock-in and clock-out messages, captures screenshots while the user is clocked in, and uploads browser-history duration data.

The in-app user manual provides a download button for:

```text
/downloads/lemon-host-monitor-extension.zip
```

The ZIP is intended for internal organization sharing and should contain the real extension files required by the organization. Do not include `.example` files in the shared package.

Local extension setup:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Download the ZIP from the in-app User Manual or use the local `extension/` folder.
4. Extract the ZIP if using the packaged download.
5. Click Load unpacked.
6. Select the extracted extension folder or the local `extension/` folder.
7. Log in to the web dashboard and clock in.

Monitoring retention:

| Data | Retention |
| --- | --- |
| Browser history | Deleted after 24 hours |
| Screenshots | Retained for 15 days |

## Development Workflow

1. Pull the latest code and install dependencies with `npm install`.
2. Copy and fill `.env`, `extension/config.js`, and `public/supabase-proxy.php` for local development.
3. Run `npm run dev`.
4. Use the Supabase-hosted Edge Functions for local backend calls.
5. Load the Chrome extension only when testing monitoring behavior.
6. Run `npm run lint` and `npm run test` before shipping changes.
7. Build with `npm run build` before deployment.

## Deployment Summary

High-level production steps:

1. Link the Supabase project with `npx supabase link --project-ref <project-ref>`.
2. Set required secrets, especially `JWT_SECRET`.
3. Apply database migrations with `npx supabase db push`.
4. Ensure the `screenshots` storage bucket exists.
5. Deploy Edge Functions.
6. Build the frontend with `npm run build`.
7. Upload the contents of `dist/` to the production host.
8. Confirm `supabase-proxy.php` is deployed and points at the correct project if the host uses the PHP proxy.
9. Confirm `/manual` can download the packaged Chrome extension.
10. Install the extension, log in, clock in, and verify screenshots and browser history appear in the dashboard.

Use `DEPLOYMENT.md` as the full deployment runbook.

## Testing

The project is configured for Vitest with jsdom and React Testing Library.

```bash
npm run test
npm run lint
npm run build
```

Current tests live in `src/test/`. Add focused tests around shared helpers, API wrappers, and high-risk UI workflows when modifying behavior.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| Login fails for every user | Missing or changed `JWT_SECRET` | Set the secret and redeploy `auth` |
| Production API calls fail | Proxy missing or wrong project URL | Deploy/fix `public/supabase-proxy.php` |
| Screenshots do not appear | Extension not loaded, user not clocked in, bucket missing, or proxy/function URL incorrect | Load extension, clock in, confirm bucket and API URL |
| Browser history is empty | Extension has no session, user is clocked out, or tracking permissions are missing | Log in again, clock in, and check extension popup/storage |
| Managers cannot see team data | Missing `team_id` or manager relationship | Check users and teams in Admin |
| WFH/site classification is wrong | Trusted office IP ranges are missing | Add CIDR ranges under Admin -> Trusted IPs |
| Extension download fails | ZIP missing from deployed `public/downloads` output | Rebuild and redeploy `dist/downloads/lemon-host-monitor-extension.zip` |

## Security Notes

- Real secrets must stay out of git.
- Edge Functions use the Supabase service role key server-side; never expose it to the browser.
- The frontend stores only the app JWT and user profile in local storage.
- Production requests should use the intended Supabase function URL or PHP proxy consistently.
- Admin and manager authorization must be enforced server-side, not only through hidden UI.
- Monitoring data is captured only while the user is clocked in.
- Browser history is short-lived by design and screenshots follow the configured retention window.

## Maintenance Notes

- Keep migrations append-only unless intentionally rebuilding a development database.
- Update `src/integrations/supabase/types.ts` when the database schema changes.
- Keep frontend API wrappers aligned with Edge Function endpoints.
- Regenerate and verify `public/downloads/lemon-host-monitor-extension.zip` when extension source files change.
- Update this README, `PROJECT_DOCUMENTATION.md`, and `DEPLOYMENT.md` whenever routes, workflows, functions, retention rules, or environment variables change.
