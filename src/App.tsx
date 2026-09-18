import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { ADMIN_ROLES, MANAGER_ROLES, UserRole } from "@/lib/roles";

const LoginPage = lazy(() => import("@/pages/LoginPage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const TimesheetPage = lazy(() => import("@/pages/TimesheetPage"));
const AttendancePage = lazy(() => import("@/pages/AttendancePage"));
const TeamPage = lazy(() => import("@/pages/TeamPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminTeamsPage = lazy(() => import("@/pages/admin/AdminTeamsPage"));
const EmployeeDashboardPage = lazy(() => import("@/pages/EmployeeDashboardPage"));
const ChatsPage = lazy(() => import("@/pages/ChatsPage"));
const TasksPage = lazy(() => import("@/pages/TasksPage"));
const BrowserHistoryPage = lazy(() => import("@/pages/BrowserHistoryPage"));
const ScreenshotsPage = lazy(() => import("@/pages/ScreenshotsPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const AdminBrowserHistoryPage = lazy(() => import("@/pages/admin/BrowserHistoryPage"));
const LeaveRequestsPage = lazy(() => import("@/pages/LeaveRequestsPage"));
const ShiftSchedulingPage = lazy(() => import("@/pages/admin/ShiftSchedulingPage"));
const DepartmentsPage = lazy(() => import("@/pages/admin/DepartmentsPage"));
const AnalyticsPage = lazy(() => import("@/pages/admin/AnalyticsPage"));
const ReportsPage = lazy(() => import("@/pages/ReportsPage"));
const PoliciesPage = lazy(() => import("@/pages/PoliciesPage"));
const UserManualPage = lazy(() => import("@/pages/UserManualPage"));
const AuditLogsPage = lazy(() => import("@/pages/admin/AuditLogsPage"));
const IpConfigPage = lazy(() => import("@/pages/admin/IpConfigPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const PageLoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const ProtectedPage = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
              <Route path="/employee" element={<ProtectedPage><EmployeeDashboardPage /></ProtectedPage>} />
              <Route path="/timesheet" element={<ProtectedPage><TimesheetPage /></ProtectedPage>} />
              <Route path="/attendance" element={<ProtectedPage><AttendancePage /></ProtectedPage>} />
              <Route path="/leave" element={<ProtectedPage><LeaveRequestsPage /></ProtectedPage>} />
              <Route path="/reports" element={<ProtectedPage allowedRoles={MANAGER_ROLES}><ReportsPage /></ProtectedPage>} />
              <Route path="/policies" element={<ProtectedPage><PoliciesPage /></ProtectedPage>} />
              <Route path="/manual" element={<ProtectedPage><UserManualPage /></ProtectedPage>} />
              <Route path="/chats" element={<ProtectedPage><ChatsPage /></ProtectedPage>} />
              <Route path="/tasks" element={<ProtectedPage><TasksPage /></ProtectedPage>} />
              <Route path="/team" element={<ProtectedPage allowedRoles={MANAGER_ROLES}><TeamPage /></ProtectedPage>} />
              <Route path="/browser-history" element={<ProtectedPage allowedRoles={MANAGER_ROLES}><BrowserHistoryPage /></ProtectedPage>} />
              <Route path="/screenshots" element={<ProtectedPage allowedRoles={MANAGER_ROLES}><ScreenshotsPage /></ProtectedPage>} />
              <Route path="/admin" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><AdminPage /></ProtectedPage>} />
              <Route path="/admin/users" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><AdminUsersPage /></ProtectedPage>} />
              <Route path="/admin/teams" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><AdminTeamsPage /></ProtectedPage>} />
              <Route path="/admin/browser-history" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><AdminBrowserHistoryPage /></ProtectedPage>} />
              <Route path="/admin/shifts" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><ShiftSchedulingPage /></ProtectedPage>} />
              <Route path="/admin/departments" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><DepartmentsPage /></ProtectedPage>} />
              <Route path="/admin/analytics" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><AnalyticsPage /></ProtectedPage>} />
              <Route path="/admin/audit-logs" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><AuditLogsPage /></ProtectedPage>} />
              <Route path="/admin/ip-config" element={<ProtectedPage allowedRoles={ADMIN_ROLES}><IpConfigPage /></ProtectedPage>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
