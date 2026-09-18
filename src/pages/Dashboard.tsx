import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { workSessionsApi } from "@/lib/work-sessions-api";
import { isAdminRole } from "@/lib/roles";
import { toTitleCase } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Clock, Users, CalendarCheck, AlertTriangle, Activity, Timer, UsersRound, Coffee, TrendingUp, Home, Building2, ArrowRight, ShieldCheck, ClipboardList, Camera, Globe, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

function StatCard({
  title, value, subtitle, icon: Icon,
  iconColor = "text-primary", iconBg = "bg-primary/8",
  clickable, onClick,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; iconColor?: string; iconBg?: string;
  clickable?: boolean; onClick?: () => void;
}) {
  return (
    <Card
      className={`metric-card ${clickable ? "card-interactive" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between p-0">
        <CardTitle className="section-label">{title}</CardTitle>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="metric-value">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function InsightPanel({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
}) {
  return (
    <div className="soft-panel flex items-start gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="section-label">{title}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function ActionTile({
  title,
  detail,
  icon: Icon,
  onClick,
}: {
  title: string;
  detail: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/30"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function EmployeeDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  const { data } = useQuery({
    queryKey: ["work-session-status"],
    queryFn: workSessionsApi.getStatus,
    refetchInterval: 30000,
  });
  const { data: historyData } = useQuery({
    queryKey: ["work-history-week"],
    queryFn: () => workSessionsApi.getHistory(7),
  });

  const session = data?.session ?? null;
  const isWorking = data?.is_working ?? false;
  const onBreak = data?.on_break ?? false;
  const activeBreak = data?.active_break ?? null;
  const breaks = data?.breaks ?? [];
  const totalCompletedSeconds = data?.total_completed_seconds ?? 0;
  const loginType = (session?.login_type as "WFH" | "SITE" | null | undefined) ?? null;

  useEffect(() => {
    if (!isWorking || !session?.start_time) {
      setElapsed(totalCompletedSeconds);
      return;
    }
    const startTime = new Date(session.start_time).getTime();
    const tick = () => {
      const now = Date.now();
      const currentSessionSec = Math.floor((now - startTime) / 1000);
      const sessionBreaks = breaks.filter((b: { session_id: string }) => b.session_id === session.id);
      const completedBreakSec = sessionBreaks
        .filter((b: { break_end: string | null }) => b.break_end)
        .reduce((sum: number, b: { duration_seconds: number }) => sum + b.duration_seconds, 0);
      const currentBreakSec = onBreak && activeBreak
        ? Math.floor((now - new Date(activeBreak.break_start).getTime()) / 1000)
        : 0;
      setElapsed(totalCompletedSeconds + Math.max(0, currentSessionSec - completedBreakSec - currentBreakSec));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isWorking, session?.start_time, session?.id, totalCompletedSeconds, onBreak, activeBreak, breaks]);

  const weekSeconds = (historyData?.sessions ?? []).reduce(
    (sum: number, s: { total_active_seconds?: number }) => sum + (s.total_active_seconds || 0),
    0,
  );
  const weekDisplay = isWorking ? weekSeconds + Math.max(0, elapsed - totalCompletedSeconds) : weekSeconds;
  const dayTargetSeconds = 8 * 60 * 60;
  const weekTargetSeconds = 40 * 60 * 60;
  const dayProgress = Math.min(100, Math.round((elapsed / dayTargetSeconds) * 100));
  const weekProgress = Math.min(100, Math.round((weekDisplay / weekTargetSeconds) * 100));
  const sessionStart = session?.start_time
    ? new Date(session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Not started";

  const clockInMut = useMutation({
    mutationFn: workSessionsApi.clockIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-session-status"] });
      qc.invalidateQueries({ queryKey: ["work-history-week"] });
    },
    onError: (e: Error) => toast({ title: "Clock in failed", description: e.message, variant: "destructive" }),
  });
  const clockOutMut = useMutation({
    mutationFn: workSessionsApi.clockOut,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-session-status"] });
      qc.invalidateQueries({ queryKey: ["work-history-week"] });
    },
    onError: (e: Error) => toast({ title: "Clock out failed", description: e.message, variant: "destructive" }),
  });

  const greeting = new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening";
  const statusLabel = isWorking ? (onBreak ? "On Break" : "Clocked In") : "Not Clocked In";

  return (
    <div className="page-shell animate-fade-in">
      <div className="page-hero flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/5 text-primary">
            {statusLabel}
          </Badge>
          <h1 className="page-hero-title">Good {greeting}{user?.first_name ? `, ${toTitleCase(user.first_name)}` : ""}</h1>
          <p className="page-hero-subtitle">Track the day, keep breaks accurate, and review your weekly progress from one focused workspace.</p>
        </div>
        <div className="flex gap-2 self-end">
          {!isWorking ? (
            <Button id="dash-clock-in" onClick={() => clockInMut.mutate()} disabled={clockInMut.isPending} className="h-11 gap-2 rounded-lg">
              Clock In <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button id="dash-clock-out" variant="destructive" onClick={() => clockOutMut.mutate()} disabled={clockOutMut.isPending || onBreak} className="h-11 gap-2 rounded-lg">
              Clock Out
            </Button>
          )}
          <Button id="dash-open-workday" variant="outline" onClick={() => navigate("/employee")} className="h-11 rounded-lg">
            Full workday
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Today's Status"
          value={statusLabel}
          subtitle={loginType ? (loginType === "WFH" ? "Working from home" : "On site") : "Clock in to start tracking"}
          icon={Clock}
        />
        <StatCard
          title="Hours Today"
          value={formatDuration(elapsed)}
          subtitle="Active time"
          icon={Timer}
          iconColor="text-accent"
          iconBg="bg-accent/8"
        />
        <StatCard
          title="This Week"
          value={formatDuration(weekDisplay)}
          subtitle="of 40h target"
          icon={TrendingUp}
          iconColor="text-info"
          iconBg="bg-info/8"
        />
      </div>
      {isWorking && loginType && (
        <Badge className={loginType === "WFH" ? "bg-info/10 text-info border-info/20" : "bg-accent/10 text-accent border-accent/20"}>
          {loginType === "WFH" ? <><Home className="h-3 w-3 mr-1" /> WFH</> : <><Building2 className="h-3 w-3 mr-1" /> SITE</>}
        </Badge>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Work Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Today</span>
                <span className="font-mono text-xs text-muted-foreground">{dayProgress}% of 8h</span>
              </div>
              <Progress value={dayProgress} className="h-2" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">This week</span>
                <span className="font-mono text-xs text-muted-foreground">{weekProgress}% of 40h</span>
              </div>
              <Progress value={weekProgress} className="h-2" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <InsightPanel title="Session Start" value={sessionStart} detail="Current or latest work session" icon={Clock} />
              <InsightPanel title="Break State" value={onBreak ? "On break" : "Available"} detail={onBreak ? "Active time is paused" : "Active time is tracking"} icon={Coffee} />
              <InsightPanel title="Location" value={loginType || "Pending"} detail="Resolved at clock-in" icon={loginType === "SITE" ? Building2 : Home} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-display font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActionTile title="Open Workday" detail="Breaks, notes, and detailed session view" icon={Timer} onClick={() => navigate("/employee")} />
            <ActionTile title="Timesheet" detail="Review recent sessions and work notes" icon={ClipboardList} onClick={() => navigate("/timesheet")} />
            <ActionTile title="Policies" detail="Read company policy documents" icon={ShieldCheck} onClick={() => navigate("/policies")} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

interface TeamMember {
  id: string; first_name: string; last_name: string; email: string;
  role: string; is_working: boolean; today_seconds: number;
  period_seconds: number; session_count: number;
  today_session: {
    start_time: string;
    end_time: string | null;
    ip_address?: string | null;
    login_type?: "WFH" | "SITE" | null;
  } | null;
}

function ManagerDashboard() {
  const [period, setPeriod] = useState<"today" | "week">("today");
  const { data, isLoading } = useQuery({
    queryKey: ["team-overview", period],
    queryFn: () => workSessionsApi.getTeamOverview(period),
    refetchInterval: 30000,
  });

  const hasTeam = data?.hasTeam !== false;
  const members: TeamMember[] = data?.members ?? [];
  const workingNow = members.filter((m) => m.is_working);
  const totalMembers = members.length;
  const avgSeconds = totalMembers > 0
    ? Math.floor(members.reduce((sum, m) => sum + (period === "today" ? m.today_seconds : m.period_seconds), 0) / totalMembers)
    : 0;
  const notStarted = members.filter((m) => !m.today_session).length;
  const completed = members.filter((m) => !m.is_working && m.today_session).length;
  const totalTrackedSeconds = members.reduce((sum, m) => sum + (period === "today" ? m.today_seconds : m.period_seconds), 0);

  if (!isLoading && !hasTeam) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="page-heading">Team Overview</h1>
        <Card className="card-premium">
          <CardContent className="py-16 text-center space-y-4">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-muted/80 flex items-center justify-center">
              <Users className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-display font-semibold">No Team Assigned</p>
              <p className="text-sm text-muted-foreground mt-1">{data?.message || "You haven't been assigned to a team yet."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell animate-fade-in">
      <div className="page-hero flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="outline" className="mb-3 border-info/20 bg-info/5 text-info">
            Manager Workspace
          </Badge>
          <h1 className="page-hero-title">Team Overview</h1>
          <p className="page-hero-subtitle">Review who is working, where they clocked in, and how team hours are tracking for the selected period.</p>
        </div>
        <div className="flex gap-0.5 bg-muted/60 p-1 rounded-lg border border-border/40">
          {(["today", "week"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="h-7 text-xs px-3.5 rounded-lg"
            >
              {p === "today" ? "Today" : "This Week"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Team Members" value={isLoading ? "…" : totalMembers} icon={Users} />
        <StatCard
          title="Working Now" value={isLoading ? "…" : workingNow.length}
          subtitle={totalMembers > 0 ? `${Math.round((workingNow.length / totalMembers) * 100)}% of team` : ""}
          icon={Activity} iconColor="text-success" iconBg="bg-success/8"
        />
        <StatCard
          title={`Avg Hours ${period === "today" ? "Today" : "This Week"}`}
          value={isLoading ? "…" : formatDuration(avgSeconds)}
          icon={Clock} iconColor="text-info" iconBg="bg-info/8"
        />
        <StatCard
          title="Sessions" value={isLoading ? "…" : members.reduce((sum, m) => sum + m.session_count, 0)}
          subtitle={period === "today" ? "today" : "this week"}
          icon={CalendarCheck}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Team Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InsightPanel title="Working" value={String(workingNow.length)} detail="Employees currently clocked in" icon={Activity} />
            <InsightPanel title="Completed" value={String(completed)} detail="Employees with a completed or inactive session today" icon={CalendarCheck} />
            <InsightPanel title="Not Started" value={String(notStarted)} detail="Employees without a session today" icon={AlertTriangle} />
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Capacity Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <InsightPanel title="Tracked Time" value={formatDuration(totalTrackedSeconds)} detail={period === "today" ? "Total team time today" : "Total team time this week"} icon={Timer} />
              <InsightPanel title="Average" value={formatDuration(avgSeconds)} detail="Average per team member" icon={Clock} />
              <InsightPanel title="Coverage" value={`${totalMembers ? Math.round((workingNow.length / totalMembers) * 100) : 0}%`} detail="Current active coverage" icon={Users} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Active team coverage</span>
                <span className="font-mono text-xs text-muted-foreground">{workingNow.length}/{totalMembers}</span>
              </div>
              <Progress value={totalMembers ? Math.round((workingNow.length / totalMembers) * 100) : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading…</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6">No team members assigned yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="section-label pl-6">Name</TableHead>
                  <TableHead className="section-label">Status</TableHead>
                  <TableHead className="section-label">Location</TableHead>
                  <TableHead className="section-label">IP</TableHead>
                  <TableHead className="section-label">Today's Hours</TableHead>
                  {period === "week" && <TableHead className="section-label">Week Total</TableHead>}
                  <TableHead className="section-label pr-6">Clock In</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/6 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                          {m.first_name[0]}{m.last_name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{toTitleCase(m.first_name)} {toTitleCase(m.last_name)}</p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.is_working ? (
                        <Badge className="bg-success/10 text-success border-success/20 font-medium text-[11px]">Working</Badge>
                      ) : m.today_session ? (
                        <Badge variant="secondary" className="font-medium text-[11px]">Done</Badge>
                      ) : (
                        <Badge variant="outline" className="font-medium text-[11px] border-border/50">Not started</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.today_session?.login_type === "SITE" ? (
                        <Badge className="bg-info/10 text-info border-info/20 text-[10px] px-2 py-0">
                          <Building2 className="h-2.5 w-2.5 mr-0.5" /> Office
                        </Badge>
                      ) : m.today_session?.login_type === "WFH" ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0">
                          <Home className="h-2.5 w-2.5 mr-0.5" /> WFH
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {m.today_session?.ip_address || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatDuration(m.today_seconds)}</TableCell>
                    {period === "week" && (
                      <TableCell className="font-mono text-sm tabular-nums">{formatDuration(m.period_seconds)}</TableCell>
                    )}
                    <TableCell className="text-xs text-muted-foreground tabular-nums pr-6">
                      {m.today_session
                        ? new Date(m.today_session.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.getStats });
  const { data: activeData } = useQuery({
    queryKey: ["active-now"], queryFn: workSessionsApi.getActiveNow, refetchInterval: 30000,
  });

  const stats = data ?? { totalUsers: 0, activeUsers: 0, totalTeams: 0, pendingCorrections: 0 };
  const activeSessions = activeData?.active_sessions ?? [];
  const activeRatio = stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0;

  return (
    <div className="page-shell animate-fade-in">
      <div className="page-hero flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/5 text-primary">
            Admin Command Center
          </Badge>
          <h1 className="page-hero-title">Organization Overview</h1>
          <p className="page-hero-subtitle">Monitor active work, teams, users, corrections, and operational signals across Lemon Host Monitor.</p>
        </div>
        <Button variant="outline" className="h-11 gap-2 rounded-lg" onClick={() => navigate("/admin")}>
          Admin tools <ShieldCheck className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={isLoading ? "…" : stats.totalUsers} subtitle={`${stats.activeUsers} active`} icon={Users} clickable onClick={() => navigate("/admin/users")} />
        <StatCard title="Working Now" value={activeSessions.length} icon={Activity} iconColor="text-success" iconBg="bg-success/8" />
        <StatCard title="Teams" value={isLoading ? "…" : stats.totalTeams} icon={UsersRound} iconColor="text-info" iconBg="bg-info/8" clickable onClick={() => navigate("/admin/teams")} />
        <StatCard title="Pending Reviews" value={isLoading ? "…" : stats.pendingCorrections} icon={AlertTriangle} iconColor="text-warning" iconBg="bg-warning/8" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Operational Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Active user coverage</span>
                <span className="font-mono text-xs text-muted-foreground">{activeRatio}%</span>
              </div>
              <Progress value={activeRatio} className="h-2" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <InsightPanel title="Users" value={`${stats.activeUsers}/${stats.totalUsers}`} detail="Active user accounts" icon={Users} />
              <InsightPanel title="Live Sessions" value={String(activeSessions.length)} detail="Currently clocked in" icon={Activity} />
              <InsightPanel title="Reviews" value={String(stats.pendingCorrections)} detail="Pending correction queue" icon={AlertTriangle} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-display font-semibold">Admin Shortcuts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ActionTile title="Users" detail="Accounts, roles, departments" icon={Users} onClick={() => navigate("/admin/users")} />
            <ActionTile title="Analytics" detail="Hours, WFH, late and early signals" icon={TrendingUp} onClick={() => navigate("/admin/analytics")} />
            <ActionTile title="Screenshots" detail="Periodic visual activity review" icon={Camera} onClick={() => navigate("/screenshots")} />
            <ActionTile title="Browser History" detail="Visited sites and active duration" icon={Globe} onClick={() => navigate("/admin/browser-history")} />
          </CardContent>
        </Card>
      </div>

      {activeSessions.length > 0 && (
        <Card className="card-premium overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2.5">
              <span className="dot-live" />
              Who's Working Now
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {activeSessions.map((s: {
                id: string;
                start_time: string;
                on_break?: boolean;
                ip_address?: string | null;
                login_type?: "WFH" | "SITE" | null;
                user: { first_name: string; last_name: string; email: string } | null;
              }) => (
                <div key={s.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${s.on_break ? "bg-warning/8 text-warning" : "bg-success/8 text-success"}`}>
                      {s.user ? `${s.user.first_name[0]}${s.user.last_name[0]}` : "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2 flex-wrap">
                        {s.user ? `${toTitleCase(s.user.first_name)} ${toTitleCase(s.user.last_name)}` : "Unknown"}
                        {s.on_break && (
                          <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] px-1.5 py-0">
                            <Coffee className="h-2.5 w-2.5 mr-0.5" /> Break
                          </Badge>
                        )}
                        {s.login_type === "SITE" ? (
                          <Badge className="bg-info/10 text-info border-info/20 text-[10px] px-1.5 py-0">
                            <Building2 className="h-2.5 w-2.5 mr-0.5" /> Office
                          </Badge>
                        ) : s.login_type === "WFH" ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                            <Home className="h-2.5 w-2.5 mr-0.5" /> WFH
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.user?.email}
                        {s.ip_address ? ` · ${s.ip_address}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    Since {new Date(s.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const Dashboard = () => {
  const { user } = useAuth();
  if (!user) return null;
  if (isAdminRole(user.role)) return <AdminDashboard />;
  if (user.role === "MANAGER") return <ManagerDashboard />;
  return <EmployeeDashboard />;
};

export default Dashboard;
