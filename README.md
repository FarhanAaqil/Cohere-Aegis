# Cohere Aegis

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/FarhanAaqil/Cohere-Aegis/blob/main/LICENSE)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)

**Cohere Aegis** is a modern, standalone workforce operations, attendance, and activity companion platform. It delivers an enterprise-grade command center for tracking work sessions, shifts, attendance corrections, leave requests, team analytics, and companion Chrome extension monitoring—all with a responsive, dark-mode-first aesthetic.

---

## Screenshots

[#screenshots](#screenshots)

<!--
  Drop your PNGs into a /docs (or /screenshots) folder in the repo root and
  point these paths at them, e.g. docs/dashboard-overview.png
-->

| Admin Command Center | Aegis Assistant |
| --- | --- |
| ![Organization overview dashboard showing total users, working now, teams, and operational health](docs/dashboard-overview.png) | ![In-app Aegis Assistant answering live attendance and timesheet questions](docs/aegis-assistant.png) |

---

## Architecture Overview

[#architecture-overview](#architecture-overview)

```
+-------------------------------------------------------------+
|                     Cohere Aegis Web App                    |
|                (React 18 + Vite + Tailwind)                 |
+------------------------------+------------------------------+
                               |
               Web Messaging / | REST API /
                Extension Port | Realtime
                               v
+------------------------------+------------------------------+
|                 Cohere Aegis Chrome Extension               |
|               (Manifest V3 Companion Worker)                |
+------------------------------+------------------------------+
                               |
                               | HTTPS / Edge Functions
                               v
+-------------------------------------------------------------+
|                       Backend Services                      |
|             Supabase Edge Functions / PostgreSQL            |
+-------------------------------------------------------------+
```

---

## Key Features

[#key-features](#key-features)

### 1. Operations & Command Center

[#1-operations--command-center](#1-operations--command-center)

- **Role-Based Views**: Tailored experiences for `EMPLOYEE`, `MANAGER`, `HR_MANAGER`, and `ADMIN`.
- **Live Activity Tracking**: Real-time visibility into who is currently clocked in, on break, or inactive.
- **Dynamic KPIs**: Instant summaries of headcount, active sessions, pending correction reviews, and hours worked.

### 2. Time & Attendance Management

[#2-time--attendance-management](#2-time--attendance-management)

- **Workday Tracking**: One-click clock in/out, break in/out, session notes, and multi-session logging.
- **Attendance Calendar**: Monthly breakdown of presence, late arrivals, early leaves, and WFH vs. on-site status.
- **Attendance Corrections**: Streamlined employee submission and manager/admin approval workflows.
- **Timesheets**: Complete work-session history with manager remarks and one-click CSV export.

### 3. Scheduling & Workforce Planning

[#3-scheduling--workforce-planning](#3-scheduling--workforce-planning)

- **Shift Scheduling**: Create defined work schedules, assign employees, and enforce attendance windows.
- **Leave Management**: Employee leave requests with manager/HR review, balance tracking, and attendance sync.
- **Team & Department Hierarchy**: Organize staff across teams and departments with dedicated oversight.

### 4. Companion Monitoring (Chrome MV3)

[#4-companion-monitoring-chrome-mv3](#4-companion-monitoring-chrome-mv3)

- **Time & Activity Companion**: Automatically logs active work focus and tab duration.
- **Periodic Visual Verification**: Configurable screenshot capture during active work sessions.
- **In-App Distribution**: Pre-packaged download available directly from the in-app User Manual (`/manual`).

### 5. Collaboration & AI Assistance

[#5-collaboration--ai-assistance](#5-collaboration--ai-assistance)

- **Team Chat**: Direct messaging, group channels, user search, and integrated WebRTC calling.
- **Aegis Assistant**: In-app operational chatbot answering natural language queries about live shifts, timesheets, and attendance.
- **Kanban Tasks**: Task board with activity logs, progress tracking, and team assignment.

---

## Technology Stack

[#technology-stack](#technology-stack)

| Layer                     | Technology                                                 |
| ------------------------- | ---------------------------------------------------------- |
| **Frontend Core**         | React 18, TypeScript, Vite                                 |
| **Styling & UI**          | Tailwind CSS, Radix UI, shadcn/ui primitives, Lucide icons |
| **Routing**               | React Router DOM v6                                        |
| **State & Data Fetching** | TanStack React Query v5                                    |
| **Visualizations**        | Recharts                                                   |
| **Realtime & Calling**    | Supabase Realtime, WebRTC                                  |
| **Extension**             | Chrome Manifest V3 (Service Worker + Content Scripts)      |
| **Testing**               | Vitest, React Testing Library                              |

---

## Getting Started

[#getting-started](#getting-started)

### Prerequisites

[#prerequisites](#prerequisites)

- **Node.js**: `v18.0.0` or higher
- **npm** or **bun**
- A **Supabase** project (or local Supabase instance)

### 1. Clone & Install

[#1-clone--install](#1-clone--install)

```
git clone https://github.com/FarhanAaqil/Cohere-Aegis.git
cd Cohere-Aegis
npm install
```

### 2. Configure Environment

[#2-configure-environment](#2-configure-environment)

Copy the example environment template:

```
cp .env.example .env
```

Fill in your configuration:

```
VITE_SUPABASE_PROJECT_ID=your_supabase_project_ref
VITE_SUPABASE_URL=https://your_supabase_project_ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_public_key
VITE_EXTENSION_ID=
```

### 3. Run Locally

[#3-run-locally](#3-run-locally)

```
npm run dev
```

The web dashboard will be available at `http://localhost:8080`.

---

## Companion Chrome Extension Setup

[#companion-chrome-extension-setup](#companion-chrome-extension-setup)

1. Navigate to the `/extension` directory.
2. Copy `config.example.js` to `config.js`:

```
cp extension/config.example.js extension/config.js
```

3. Insert your Supabase project URL and anon key into `extension/config.js`.
4. Open Chrome and navigate to `chrome://extensions`.
5. Enable **Developer mode** (top right toggle).
6. Click **Load unpacked** and select the `extension/` directory.
7. (Optional) Copy your Chrome Extension ID and add it to `VITE_EXTENSION_ID` in `.env` for direct messaging.

Alternatively, users can download the pre-packaged zip from the in-app **User Manual** (`/manual`).

---

## Available Scripts

[#available-scripts](#available-scripts)

| Command              | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `npm run dev`        | Starts local development server on port 8080      |
| `npm run build`      | Compiles optimized production bundle into `dist/` |
| `npm run preview`    | Previews production build locally                 |
| `npm run lint`       | Checks code with ESLint                           |
| `npm run test`       | Runs test suite using Vitest                      |
| `npm run test:watch` | Runs test suite in watch mode                     |

---

## Production Deployment

[#production-deployment](#production-deployment)

Refer to [DEPLOYMENT.md](https://github.com/FarhanAaqil/Cohere-Aegis/blob/main/DEPLOYMENT.md) for step-by-step instructions on deploying the web dashboard, Edge Functions, database migrations, and configuring the PHP proxy.

---

## License

[#license](#license)

This project is licensed under the MIT License - see the LICENSE file for details.
