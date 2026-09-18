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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
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
            <Route path="/reports" element={<ProtectedPage><ReportsPage /></ProtectedPage>} />
            <Route path="/policies" element={<ProtectedPage><PoliciesPage /></ProtectedPage>} />
            <Route path="/manual" element={<ProtectedPage><UserManualPage /></ProtectedPage>} />
            <Route path="/chats" element={<ProtectedPage><ChatsPage /></ProtectedPage>} />
            <Route path="/tasks" element={<ProtectedPage><TasksPage /></ProtectedPage>} />
            <Route path="/team" element={<ProtectedPage><TeamPage /></ProtectedPage>} />
            <Route path="/browser-history" element={<ProtectedPage><BrowserHistoryPage /></ProtectedPage>} />
            <Route path="/screenshots" element={<ProtectedPage><ScreenshotsPage /></ProtectedPage>} />
            <Route path="/admin" element={<ProtectedPage><AdminPage /></ProtectedPage>} />
            <Route path="/admin/users" element={<ProtectedPage><AdminUsersPage /></ProtectedPage>} />
            <Route path="/admin/teams" element={<ProtectedPage><AdminTeamsPage /></ProtectedPage>} />
            <Route path="/admin/browser-history" element={<ProtectedPage><AdminBrowserHistoryPage /></ProtectedPage>} />
            <Route path="/admin/shifts" element={<ProtectedPage><ShiftSchedulingPage /></ProtectedPage>} />
            <Route path="/admin/departments" element={<ProtectedPage><DepartmentsPage /></ProtectedPage>} />
            <Route path="/admin/analytics" element={<ProtectedPage><AnalyticsPage /></ProtectedPage>} />
            <Route path="/admin/audit-logs" element={<ProtectedPage><AuditLogsPage /></ProtectedPage>} />
            <Route path="/admin/ip-config" element={<ProtectedPage><IpConfigPage /></ProtectedPage>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
