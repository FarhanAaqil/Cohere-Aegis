import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  CalendarCheck,
  Users,
  Settings,
  LogOut,
  LogIn,
  UsersRound,
  MessageSquare,
  ChevronRight,
  ClipboardList,
  Globe,
  Camera,
  Palmtree,
  CalendarClock,
  Building2,
  BarChart3,
  FileBarChart,
  ScrollText,
  Network,
  Moon,
  Sun,
  BookOpen,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import companyLogo from "@/assets/lemoncode-logo.png";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole, roleLabel } from "@/lib/roles";
import { toTitleCase } from "@/lib/format";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "My Workday", url: "/employee", icon: LogIn, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "My Timesheet", url: "/timesheet", icon: Clock, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Leave Requests", url: "/leave", icon: Palmtree, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Reports", url: "/reports", icon: FileBarChart, roles: ["MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Policies", url: "/policies", icon: ScrollText, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "User Manual", url: "/manual", icon: BookOpen, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Chats", url: "/chats", icon: MessageSquare, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Tasks", url: "/tasks", icon: ClipboardList, roles: ["EMPLOYEE", "MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Team", url: "/team", icon: Users, roles: ["MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Browser History", url: "/browser-history", icon: Globe, roles: ["MANAGER", "ADMIN", "HR_MANAGER"] },
  { title: "Screenshots", url: "/screenshots", icon: Camera, roles: ["MANAGER", "ADMIN", "HR_MANAGER"] },
];

const adminItems = [
  { title: "Overview", url: "/admin", icon: Settings },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Teams", url: "/admin/teams", icon: UsersRound },
  { title: "History", url: "/admin/browser-history", icon: Globe },
  { title: "Shifts", url: "/admin/shifts", icon: CalendarClock },
  { title: "Departments", url: "/admin/departments", icon: Building2 },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: ScrollText },
  { title: "Trusted IPs", url: "/admin/ip-config", icon: Network },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const filteredItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const roleBadge: Record<string, string> = {
    ADMIN: "bg-accent/15 text-accent border-accent/20",
    HR_MANAGER: "bg-accent/15 text-accent border-accent/20",
    MANAGER: "bg-info/15 text-info border-info/20",
    EMPLOYEE: "bg-sidebar-accent/80 text-sidebar-accent-foreground border-sidebar-border",
  };

  return (
    <Sidebar collapsible="icon">
      {/* Brand */}
      <div className="flex items-center justify-center px-3 py-5 border-b border-sidebar-border/60 bg-sidebar-accent/20">
        {collapsed ? (
          <img src={companyLogo} alt="LC" className="h-10 w-auto object-contain" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-white border border-sidebar-border/40 flex items-center justify-center p-1 shadow-sm">
              <img src={companyLogo} alt="LC" className="h-full w-auto object-contain" />
            </div>
            <div>
              <span className="text-[14px] font-display font-extrabold text-sidebar-accent-foreground tracking-tight leading-none">
                Lemon Host Monitor
              </span>
              <span className="block text-[10px] text-sidebar-muted font-medium tracking-[0.12em] uppercase mt-0.5">
                Workforce OS
              </span>
            </div>
          </div>
        )}
      </div>

      <SidebarContent className="px-2.5 pt-5">
        {/* Main Nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="section-label px-3 mb-2.5 text-sidebar-muted">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {filteredItems.map((item) => {
                const active = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={`rounded-lg h-9 transition-all duration-150 ${active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                        }`}
                    >
                      <NavLink to={item.url} end>
                        <item.icon className="h-[15px] w-[15px] shrink-0" />
                        <span className="truncate text-[13px]">{item.title}</span>
                        {active && !collapsed && (
                          <ChevronRight className="ml-auto h-3 w-3 opacity-30" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        {isAdminRole(user?.role) && (
          <>
            {!collapsed && (
              <div className="mx-3 my-4 h-px bg-sidebar-border/40" />
            )}
            <SidebarGroup>
              <SidebarGroupLabel className="section-label px-3 mb-2.5 text-sidebar-muted">
                Administration
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-0.5">
                  {adminItems.map((item) => {
                    const active = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={`rounded-lg h-9 transition-all duration-150 ${active
                              ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                            }`}
                        >
                          <NavLink to={item.url} end>
                            <item.icon className="h-[15px] w-[15px] shrink-0" />
                            <span className="truncate text-[13px]">{item.title}</span>
                            {active && !collapsed && (
                              <ChevronRight className="ml-auto h-3 w-3 opacity-30" />
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/40 px-3 py-3.5">
        {user && !collapsed && (
          <div className="mb-2.5 px-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-[11px] font-bold text-sidebar-primary-foreground shrink-0">
                {user.first_name[0]}{user.last_name[0]}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-sidebar-accent-foreground truncate leading-tight">
                  {toTitleCase(user.first_name)} {toTitleCase(user.last_name)}
                </div>
                <Badge className={`text-[9px] px-1.5 py-0 font-semibold mt-0.5 border ${roleBadge[user.role] || ""}`}>
                  {roleLabel(user.role)}
                </Badge>
              </div>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              id="theme-toggle"
              onClick={toggleTheme}
              tooltip={theme === "dark" ? "Light mode" : "Dark mode"}
              className="rounded-lg h-9 text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-white/90 transition-colors"
            >
              {theme === "dark" ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
              <span className="text-[13px]">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              tooltip="Sign out"
              className="rounded-lg h-9 text-sidebar-foreground hover:bg-destructive/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-[15px] w-[15px]" />
              <span className="text-[13px]">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
