import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { workSessionsApi } from "@/lib/work-sessions-api";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Globe, Search, Calendar, Clock, ExternalLink, 
  ListFilter, LayoutGrid, Timer, ShieldAlert
} from "lucide-react";

interface HistoryEntry {
  id: string;
  url: string;
  domain: string;
  title: string | null;
  duration_seconds: number;
  visited_at: string;
  session_id: string | null;
}

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper to format duration in seconds to a readable string
const formatSeconds = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return "0s";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
};

// Helper to format ISO timestamp to HH:MM AM/PM
const formatTime = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  } catch {
    return "—";
  }
};

export default function BrowserHistoryPage() {
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [searchQuery, setSearchQuery] = useState<string>("");

  const isAdmin = isAdminRole(user?.role);
  const isManager = user?.role === "MANAGER";
  const canAccess = isAdmin || isManager;

  // 1. Fetch Users depending on Role
  const { data: adminUsersData, isLoading: isLoadingAdminUsers } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: adminApi.getUsers,
    enabled: isAdmin && !!user,
  });

  const { data: managerTeamData, isLoading: isLoadingManagerTeam } = useQuery({
    queryKey: ["manager-team-list"],
    queryFn: () => workSessionsApi.getTeamOverview("today"),
    enabled: isManager && !!user,
  });

  // Consolidate list of selectable employees
  const employees = useMemo(() => {
    if (isAdmin) {
      return (adminUsersData?.users ?? [])
        .filter((u: any) => u.status === "ACTIVE")
        .map((u: any) => ({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`,
          email: u.email,
        }));
    }
    if (isManager) {
      return (managerTeamData?.members ?? []).map((u: any) => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
      }));
    }
    return [];
  }, [isAdmin, isManager, adminUsersData, managerTeamData]);

  // Set initial selected user ID once employees list loads
  useEffect(() => {
    if (employees.length > 0 && !selectedUserId) {
      setSelectedUserId(employees[0].id);
    }
  }, [employees, selectedUserId]);

  // 2. Fetch Browser History for the selected user and date
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["browser-history", selectedUserId, selectedDate],
    queryFn: () => workSessionsApi.getBrowserHistory(selectedUserId, selectedDate),
    enabled: !!selectedUserId && !!selectedDate,
    refetchInterval: 15000, // Refresh every 15s to see active extension updates
  });

  const rawHistory: HistoryEntry[] = historyData?.history ?? [];

  // Filter history by search query
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return rawHistory;
    const lower = searchQuery.toLowerCase();
    return rawHistory.filter(
      (h) => 
        h.url.toLowerCase().includes(lower) || 
        (h.title && h.title.toLowerCase().includes(lower)) ||
        h.domain.toLowerCase().includes(lower)
    );
  }, [rawHistory, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalSeconds = 0;
    const domainsMap: Record<string, number> = {};
    
    filteredHistory.forEach((h) => {
      totalSeconds += h.duration_seconds;
      domainsMap[h.domain] = (domainsMap[h.domain] || 0) + h.duration_seconds;
    });

    const uniqueDomains = Object.keys(domainsMap).length;
    
    let maxDomain = "—";
    let maxDuration = 0;
    Object.entries(domainsMap).forEach(([domain, duration]) => {
      if (duration > maxDuration) {
        maxDuration = duration;
        maxDomain = domain;
      }
    });

    // Domain breakdown sorted by duration
    const breakdown = Object.entries(domainsMap)
      .map(([domain, duration]) => ({
        domain,
        duration,
        percentage: totalSeconds > 0 ? Math.round((duration / totalSeconds) * 100) : 0,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5); // top 5 domains

    return {
      totalActiveTime: totalSeconds,
      uniqueDomains,
      mostVisited: maxDomain === "—" ? "—" : `${maxDomain} (${formatSeconds(maxDuration)})`,
      breakdown,
    };
  }, [filteredHistory]);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4 animate-bounce" />
        <h2 className="text-xl font-display font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          You do not have permission to view employee browser history. Only administrators and team managers can access this page.
        </p>
      </div>
    );
  }

  const isLoadingUsers = isLoadingAdminUsers || isLoadingManagerTeam;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="page-heading flex items-center gap-2.5">
          <Globe className="h-7 w-7 text-primary" />
          Browser History
        </h1>
        <p className="page-subheading">Track employee visited websites and active session tab durations</p>
      </div>

      {/* Control bar */}
      <Card className="card-premium">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto flex-1">
            {/* User Select */}
            <div className="space-y-1.5">
              <label className="section-label block">Select Employee</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoadingUsers}>
                <SelectTrigger className="input-premium h-10 w-full sm:w-[260px]">
                  <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Select user..."} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Select */}
            <div className="space-y-1.5">
              <label className="section-label block">Select Date</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground" />
                <Input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="input-premium pl-10 h-10 w-full sm:w-[200px]"
                />
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="space-y-1.5 w-full md:w-80">
            <label className="section-label block">Search Activity</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="Search URL, page title, or domain..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-premium pl-10 h-10 w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary Card Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Active Browsing Time</CardTitle>
            <div className="stat-icon bg-primary/8">
              <Timer className="h-[18px] w-[18px] text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
              {isLoadingHistory ? "…" : formatSeconds(stats.totalActiveTime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Accumulated time spent on active tabs</p>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Unique Domains</CardTitle>
            <div className="stat-icon bg-info/8">
              <Globe className="h-[18px] w-[18px] text-info" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
              {isLoadingHistory ? "…" : stats.uniqueDomains}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Different websites visited today</p>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Most Visited Website</CardTitle>
            <div className="stat-icon bg-success/8">
              <Clock className="h-[18px] w-[18px] text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-extrabold tracking-tight truncate">
              {isLoadingHistory ? "…" : stats.mostVisited}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Website with highest active duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Main dashboard splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Website Breakdown List */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="card-premium h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-primary" />
                Top Visited Websites
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingHistory ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-12" /></div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))
              ) : stats.breakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No browsing activity to display breakdown.</p>
              ) : (
                stats.breakdown.map((item) => (
                  <div key={item.domain} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium truncate max-w-[170px] flex items-center gap-1.5">
                        <img 
                          src={`https://www.google.com/s2/favicons?sz=64&domain=${item.domain}`} 
                          className="h-3.5 w-3.5 rounded-sm object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        {item.domain}
                      </span>
                      <span className="text-muted-foreground font-mono font-medium">{formatSeconds(item.duration)} ({item.percentage}%)</span>
                    </div>
                    {/* Premium sleek gradient progress bar */}
                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden border border-border/10">
                      <div 
                        className="h-full bg-gradient-to-r from-primary/80 to-accent rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right/Center: Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="card-premium">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                Activity Timeline
              </CardTitle>
              {!isLoadingHistory && filteredHistory.length > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50">
                  {filteredHistory.length} events
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingHistory ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                      <div className="space-y-1.5 flex-1"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3.5 w-2/3" /></div>
                    </div>
                  ))}
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/60 flex items-center justify-center border border-border/20 text-muted-foreground">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-display font-semibold">No activity found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      {searchQuery ? "No visits matched your search query." : "No browser history has been captured for this day."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative border-l border-border/30 ml-8 my-6 pr-6 space-y-6">
                  {filteredHistory.map((entry) => (
                    <div key={entry.id} className="relative pl-6 group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-border group-hover:bg-primary group-hover:scale-125 transition-all duration-150 border border-background shadow-sm" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                        <div className="space-y-1 flex-1 min-w-0">
                          {/* Visit time and title */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-mono font-bold text-muted-foreground tabular-nums bg-muted/50 px-1.5 py-0.5 rounded">
                              {formatTime(entry.visited_at)}
                            </span>
                            <span className="text-sm font-semibold text-foreground leading-snug truncate max-w-md">
                              {entry.title || entry.domain}
                            </span>
                          </div>

                          {/* Truncated URL link */}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <img 
                              src={`https://www.google.com/s2/favicons?sz=64&domain=${entry.domain}`} 
                              className="h-3.5 w-3.5 rounded-sm object-contain shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='2' y1='12' x2='22' y2='12'%3E%3C/line%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'%3E%3C/path%3E%3C/svg%3E";
                              }}
                            />
                            <a 
                              href={entry.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:underline hover:text-primary transition-colors truncate max-w-[280px] sm:max-w-md flex items-center gap-1"
                            >
                              {entry.url}
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          </div>
                        </div>

                        {/* Duration Badge */}
                        <div className="shrink-0 flex items-center sm:self-center">
                          <Badge variant="secondary" className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-primary/5 text-primary border border-primary/10">
                            <Clock className="h-3 w-3 mr-1 text-primary/60 shrink-0" />
                            {formatSeconds(entry.duration_seconds)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
