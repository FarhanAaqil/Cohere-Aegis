import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/reports-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, Timer, Coffee, AlertTriangle, LogOut, Home, Building2, Palmtree,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function fmtBreak(sec: number) {
  const m = Math.floor(sec / 60);
  return `${m}m`;
}

function Stat({
  title, value, icon: Icon, color = "text-primary", bg = "bg-primary/8",
}: {
  title: string; value: string | number; icon: React.ElementType; color?: string; bg?: string;
}) {
  return (
    <Card className="card-premium">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="section-label">{title}</CardTitle>
        <div className={`stat-icon ${bg}`}>
          <Icon className={`h-[18px] w-[18px] ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-[28px] font-display font-extrabold tracking-tight leading-none tabular-nums">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: reportsApi.getAnalytics,
  });

  const wfh = data?.wfh_count ?? 0;
  const site = data?.site_count ?? 0;
  const locTotal = wfh + site;
  const wfhPct = locTotal ? Math.round((wfh / locTotal) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-heading">Analytics</h1>
        <p className="page-subheading">This month’s hours, punctuality, and WFH vs office</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Stat title="Total hours" value={`${data?.total_hours ?? 0}h`} icon={Clock} />
          <Stat title="Avg hours / day" value={`${data?.avg_hours_per_day ?? 0}h`} icon={Timer} color="text-info" bg="bg-info/8" />
          <Stat title="Avg break" value={fmtBreak(data?.avg_break_seconds ?? 0)} icon={Coffee} color="text-warning" bg="bg-warning/8" />
          <Stat title="Late arrivals" value={data?.late_count ?? 0} icon={AlertTriangle} color="text-warning" bg="bg-warning/8" />
          <Stat title="Early departures" value={data?.early_count ?? 0} icon={LogOut} color="text-destructive" bg="bg-destructive/8" />
          <Stat title="WFH vs Office" value={`${wfhPct}% WFH`} icon={Home} color="text-primary" bg="bg-primary/8" />
          <Stat title="Office sessions" value={site} icon={Building2} color="text-info" bg="bg-info/8" />
          <Stat title="Leave taken" value={data?.leave_count ?? 0} icon={Palmtree} color="text-warning" bg="bg-warning/8" />
        </div>
      )}

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold">Daily hours this month</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          {!data?.daily?.length ? (
            <p className="text-sm text-muted-foreground py-16 text-center">No session data this month yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => String(v).slice(8)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
