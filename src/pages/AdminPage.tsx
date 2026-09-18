import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings, Users, UsersRound, CalendarClock, Building2, BarChart3, ScrollText, Network, Globe, ArrowRight,
} from "lucide-react";

const links = [
  { title: "Users", href: "/admin/users", desc: "Create and update accounts, roles, departments", icon: Users },
  { title: "Teams", href: "/admin/teams", desc: "Assign managers and members", icon: UsersRound },
  { title: "Shifts", href: "/admin/shifts", desc: "Define hours and assign employees", icon: CalendarClock },
  { title: "Departments", href: "/admin/departments", desc: "Organize people by department", icon: Building2 },
  { title: "Analytics", href: "/admin/analytics", desc: "Monthly hours, late/early, WFH mix", icon: BarChart3 },
  { title: "Audit logs", href: "/admin/audit-logs", desc: "Clock-in/out and admin actions", icon: ScrollText },
  { title: "Trusted IPs", href: "/admin/ip-config", desc: "Office CIDR ranges for SITE vs WFH", icon: Network },
  { title: "History", href: "/admin/browser-history", desc: "Employee browser activity", icon: Globe },
];

const AdminPage = () => {
  return (
    <div className="page-shell animate-fade-in">
      <div className="page-hero flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/5 text-primary">
            Administration
          </Badge>
          <h1 className="page-hero-title">Control Center</h1>
          <p className="page-hero-subtitle">Manage users, teams, shifts, departments, monitoring review, audit trails, and trusted network settings.</p>
        </div>
        <div className="soft-panel px-4 py-3">
          <p className="section-label">System Scope</p>
          <p className="mt-1 text-sm font-medium">People, attendance, monitoring, and compliance</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {links.map((item) => (
          <Link key={item.href} to={item.href} id={`admin-link-${item.href.replace(/\W+/g, "-")}`}>
            <Card className="card-premium card-interactive h-full overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="stat-icon">
                    <item.icon className="h-[18px] w-[18px] text-primary" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4 text-base font-display font-semibold">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" /> Quick note
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            User, team, and department changes take effect immediately. Redeploy edge functions after backend edits.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;
