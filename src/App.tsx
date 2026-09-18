import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import TimesheetPage from "@/pages/TimesheetPage";
import AttendancePage from "@/pages/AttendancePage";
import TeamPage from "@/pages/TeamPage";
import AdminPage from "@/pages/AdminPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminTeamsPage from "@/pages/admin/AdminTeamsPage";
import EmployeeDashboardPage from "@/pages/EmployeeDashboardPage";
import ChatsPage from "@/pages/ChatsPage";
import TasksPage from "@/pages/TasksPage";
import BrowserHistoryPage from "@/pages/BrowserHistoryPage";
import ScreenshotsPage from "@/pages/ScreenshotsPage";
import NotFound from "@/pages/NotFound";
import AdminBrowserHistoryPage from "@/pages/admin/BrowserHistoryPage";
import LeaveRequestsPage from "@/pages/LeaveRequestsPage";
import ShiftSchedulingPage from "@/pages/admin/ShiftSchedulingPage";
import DepartmentsPage from "@/pages/admin/DepartmentsPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";
import ReportsPage from "@/pages/ReportsPage";
import PoliciesPage from "@/pages/PoliciesPage";
import UserManualPage from "@/pages/UserManualPage";
import AuditLogsPage from "@/pages/admin/AuditLogsPage";
import IpConfigPage from "@/pages/admin/IpConfigPage";

import { ADMIN_ROLES, MANAGER_ROLES, UserRole } from "@/lib/roles";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
