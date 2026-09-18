# Cohere Aegis - Complete Technical Documentation

## 1. System Overview

**Cohere Aegis** is an integrated workforce operations, attendance, and activity monitoring platform. It delivers a modern web dashboard, a Chrome Manifest V3 companion extension, and a Supabase backend for managing work sessions, timesheets, shift scheduling, leave requests, team analytics, visual monitoring, chat, tasks, policies, and administrative operations.

```text
React/Vite Dashboard <-> Supabase Edge Functions <-> PostgreSQL
        |                         ^
        v                         |
 Chrome MV3 Extension ------------+
```

---

## 2. Technology Stack

| Layer | Technology | Key Dependencies |
|---|---|---|
| **Frontend Web** | React 18, TypeScript, Vite | `react-router-dom`, `@tanstack/react-query`, `lucide-react`, `recharts` |
| **Design System** | Tailwind CSS, Radix UI | `@radix-ui/*`, `shadcn/ui`, `class-variance-authority`, `tailwind-merge` |
| **Backend API** | Supabase Edge Functions | Deno runtime, TypeScript |
| **Database** | PostgreSQL | Supabase-managed PostgreSQL with Row Level Security (RLS) |
| **Realtime & Calling** | Supabase Realtime, WebRTC | WebSocket event subscription, peer-to-peer audio/video streaming |
| **Companion Extension** | Chrome Manifest V3 | Service Workers, Tab & Scripting APIs, Alarms API |
| **Testing** | Vitest | `@testing-library/react`, `jsdom` |

---

## 3. Core Modules & Functionality

### 3.1 Authentication & Authorization
- Custom app-issued JWT session tokens with role claims.
- Cryptographic verification using server-side `JWT_SECRET`.
- Supported roles:
  - `EMPLOYEE`: Access to personal workday, attendance, timesheets, leave submissions, policy guides, tasks, and chat.
  - `MANAGER`: Employee capabilities plus team activity monitoring, report generation, screenshots, history logs, and correction approvals.
  - `HR_MANAGER`: Administrative oversight over policies, leave, teams, and departments.
  - `ADMIN`: Full platform governance including user administration, shift templates, trusted IP configuration, audit logs, and analytics.

### 3.2 Workday & Session Tracking
- Granular tracking for Clock In, Clock Out, Break Start, and Break End.
- Session metadata: start timestamp, duration, employee notes, client IP, and WFH/Site classification.
- Support for multiple discrete sessions in a single workday.

### 3.3 Attendance & Corrections
- Dynamic monthly attendance calendar with visual presence indicators.
- Automatic late arrival and early departure tagging based on assigned shifts.
- Correction request submission by employees with multi-level manager/admin approval.

### 3.4 Timesheets & Reporting
- Detailed session logs with employee remarks and manager review comments.
- One-click CSV timesheet export with filtering by date range, department, and team.
- Aggregate hours calculations: total hours, break duration, and overtime metrics.

### 3.5 Shift Scheduling
- Configurable shift definitions: start time, end time, grace periods, and work days.
- User shift assignments with automated operational flag detection.

### 3.6 Companion Chrome Extension (MV3)
- Background service worker tracking focused tab URL and active duration during clocked-in periods.
- Periodic background screenshot capture (e.g. 15-minute intervals) uploaded to the secure Supabase storage bucket.
- Bi-directional session handshake between web dashboard and extension content script via `window.postMessage`.

### 3.7 In-App Collaboration & AI Assistant
- Group channels and direct messaging with unread badges and search.
- Integrated WebRTC video/voice calling interface.
- **Cohere Aegis Assistant**: Live AI query helper providing instant answers to queries like "Who is working now?", "Today's attendance", and "Explain my hours this week".

### 3.8 Security & Network Governance
- CIDR-based Trusted IP management for categorizing sessions as Remote (WFH) or On-Site (Office).
- Comprehensive immutable audit logging of critical actions.

---

## 4. Application Routes

| Path | Component | Target Role |
|---|---|---|
| `/` | `Dashboard.tsx` | All Authenticated Roles |
| `/login` | `LoginPage.tsx` | Public / Unauthenticated |
| `/employee` | `EmployeeDashboardPage.tsx` | `EMPLOYEE`, `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/timesheet` | `TimesheetPage.tsx` | `EMPLOYEE`, `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/attendance` | `AttendancePage.tsx` | `EMPLOYEE`, `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/leave` | `LeaveRequestsPage.tsx` | `EMPLOYEE`, `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/reports` | `ReportsPage.tsx` | `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/policies` | `PoliciesPage.tsx` | `EMPLOYEE`, `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/manual` | `UserManualPage.tsx` | All Authenticated Roles |
| `/chats` | `ChatsPage.tsx` | All Authenticated Roles |
| `/tasks` | `TasksPage.tsx` | All Authenticated Roles |
| `/team` | `TeamPage.tsx` | `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/browser-history` | `BrowserHistoryPage.tsx` | `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/screenshots` | `ScreenshotsPage.tsx` | `MANAGER`, `HR_MANAGER`, `ADMIN` |
| `/admin` | `AdminPage.tsx` | `ADMIN`, `HR_MANAGER` |
| `/admin/users` | `AdminUsersPage.tsx` | `ADMIN`, `HR_MANAGER` |
| `/admin/teams` | `AdminTeamsPage.tsx` | `ADMIN`, `HR_MANAGER` |
| `/admin/shifts` | `ShiftSchedulingPage.tsx` | `ADMIN`, `HR_MANAGER` |
| `/admin/departments` | `DepartmentsPage.tsx` | `ADMIN`, `HR_MANAGER` |
| `/admin/analytics` | `AnalyticsPage.tsx` | `ADMIN`, `HR_MANAGER` |
| `/admin/audit-logs` | `AuditLogsPage.tsx` | `ADMIN`, `HR_MANAGER` |
| `/admin/ip-config` | `IpConfigPage.tsx` | `ADMIN` |

---

## 5. Chrome Extension Messaging Protocol

The web application communicates with the companion Chrome extension via `window.postMessage`:

### Dashboard -> Extension
```typescript
window.postMessage({
  source: "cohere-aegis",
  type: "SAVE_SESSION" | "CLOCKED_IN" | "CLOCKED_OUT" | "DEACTIVATE_MONITORING",
  token: string,
  user: UserObject
}, window.location.origin);
```

### Extension Content Script -> Background Worker
```typescript
chrome.runtime.sendMessage({
  type: "SAVE_SESSION" | "CLOCKED_IN" | "CLOCKED_OUT" | "DEACTIVATE_MONITORING",
  token: string,
  user: UserObject
});
```

---

## 6. Environment Configuration

### Frontend (`.env`)
```env
VITE_SUPABASE_PROJECT_ID=your_project_ref
VITE_SUPABASE_URL=https://your_project_ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
VITE_EXTENSION_ID=
```

### Chrome Extension (`extension/config.js`)
```javascript
const SUPABASE_URL = "https://your_project_ref.supabase.co";
const SUPABASE_KEY = "your_anon_public_key";

export { SUPABASE_URL, SUPABASE_KEY };
```

---

## 7. Build and Verification

```bash
# Install dependencies
npm install

# Run static linting
npm run lint

# Execute automated tests
npm run test

# Compile production bundle
npm run build
```
