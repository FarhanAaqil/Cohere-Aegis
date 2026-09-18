import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isManagerOrAbove } from "@/lib/roles";
import {
  attendanceApi,
  AttendanceRecord,
  AttendanceCorrection,
  AttendanceStatus,
} from "@/lib/attendance-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Palmtree,
  CalendarDays,
  SendHorizonal,
  ClipboardList,
  UserCheck,
  TrendingUp,
  Download,
} from "lucide-react";
import { exportToCsv } from "@/lib/reports-api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarGrid(
  year: number,
  month: number, // 1-indexed
  records: AttendanceRecord[]
): (AttendanceRecord | null)[][] {
  const recordMap: Record<string, AttendanceRecord> = {};
  records.forEach((r) => (recordMap[r.date] = r));

  // First day of month (0=Sun..6=Sat), convert to Mon-first (0=Mon..6=Sun)
  const firstDate = new Date(year, month - 1, 1);
  let startDow = firstDate.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon-first

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = getLocalDateString();

  const cells: (AttendanceRecord | null)[] = [];
  // Leading empty cells
  for (let i = 0; i < startDow; i++) cells.push(null);
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(
      recordMap[dateStr] ?? {
        date: dateStr,
        status: dateStr > today ? ("FUTURE" as AttendanceStatus) : "ABSENT",
      }
    );
  }
  // Chunk into weeks
  const weeks: (AttendanceRecord | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7).concat(Array(Math.max(0, 7 - (cells.length - i))).fill(null)));
  }
  return weeks;
}

// ─── Status config ────────────────────────────────────────────────────────────

type DisplayStatus = AttendanceStatus | "FUTURE";

const STATUS_CONFIG: Record<
  DisplayStatus,
  { label: string; bg: string; text: string; dot: string; icon: React.ReactNode }
> = {
  PRESENT: {
    label: "Present",
    bg: "bg-success/10 border border-success/20",
    text: "text-success",
    dot: "bg-success",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  ABSENT: {
    label: "Absent",
    bg: "bg-destructive/8 border border-destructive/20",
    text: "text-destructive",
    dot: "bg-destructive",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  LEAVE: {
    label: "Leave",
    bg: "bg-warning/10 border border-warning/20",
    text: "text-warning",
    dot: "bg-warning",
    icon: <Palmtree className="h-3.5 w-3.5" />,
  },
  HOLIDAY: {
    label: "Holiday",
    bg: "bg-info/10 border border-info/20",
    text: "text-info",
    dot: "bg-info",
    icon: <CalendarDays className="h-3.5 w-3.5" />,
  },
  WEEKEND: {
    label: "Weekend",
    bg: "bg-muted/40 border border-border/10",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/30",
    icon: null,
  },
  FUTURE: {
    label: "",
    bg: "bg-transparent border border-border/5",
    text: "text-muted-foreground/30",
    dot: "bg-transparent",
    icon: null,
  },
};

const CORRECTION_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "outline" | "secondary" | "destructive"; className: string }
> = {
  PENDING: {
    label: "Pending",
    variant: "outline",
    className: "border-warning/40 text-warning bg-warning/5",
  },
  APPROVED: {
    label: "Approved",
    variant: "outline",
    className: "border-success/40 text-success bg-success/5",
  },
  REJECTED: {
    label: "Rejected",
    variant: "outline",
    className: "border-destructive/40 text-destructive bg-destructive/5",
  },
};

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, w) => (
        <div key={w} className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, d) => (
            <Skeleton key={d} className="h-14 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AttendancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-indexed
  const [viewYear, setViewYear] = useState(now.getFullYear());

  // Correction form state
  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [correctionError, setCorrectionError] = useState("");

  const isManager = isManagerOrAbove(user?.role);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const { data: monthData, isLoading: isLoadingMonth } = useQuery({
    queryKey: ["attendance", viewMonth, viewYear],
    queryFn: () => attendanceApi.getAttendance(viewMonth, viewYear),
    enabled: !!user,
  });

  const { data: myCorrections, isLoading: isLoadingMyCorrections } = useQuery({
    queryKey: ["attendance-corrections-mine"],
    queryFn: attendanceApi.getMyCorrections,
    enabled: !!user,
  });

  const { data: allCorrections, isLoading: isLoadingAllCorrections } = useQuery({
    queryKey: ["attendance-corrections-all"],
    queryFn: attendanceApi.getAllCorrections,
    enabled: !!user && isManager,
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: () => attendanceApi.submitCorrection(correctionDate, correctionReason),
    onSuccess: () => {
      setCorrectionDate("");
      setCorrectionReason("");
      setCorrectionError("");
      queryClient.invalidateQueries({ queryKey: ["attendance-corrections-mine"] });
    },
    onError: (err: Error) => setCorrectionError(err.message),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "APPROVED" | "REJECTED" }) =>
      attendanceApi.reviewCorrection(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-corrections-all"] });
    },
  });

  // ─── Derived values ─────────────────────────────────────────────────────────

  const records: AttendanceRecord[] = monthData?.records ?? [];
  const summary = monthData?.summary ?? { present: 0, absent: 0, leave: 0, holiday: 0, total_working_days: 0 };

  const calendarWeeks = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth, records),
    [viewYear, viewMonth, records]
  );

  const attendanceRate = summary.total_working_days > 0
    ? Math.round((summary.present / summary.total_working_days) * 100)
    : 0;

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    const nowDate = new Date();
    if (viewYear > nowDate.getFullYear() || (viewYear === nowDate.getFullYear() && viewMonth >= nowDate.getMonth() + 1)) return;
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const isCurrentMonth =
    viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();

  // ─── Correction form handler ─────────────────────────────────────────────────

  function handleSubmitCorrection(e: React.FormEvent) {
    e.preventDefault();
    setCorrectionError("");
    if (!correctionDate) { setCorrectionError("Please select a date."); return; }
    if (!correctionReason.trim()) { setCorrectionError("Please provide a reason."); return; }
    submitMutation.mutate();
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading flex items-center gap-2.5">
            <CalendarCheck className="h-7 w-7 text-primary" />
            Attendance
          </h1>
          <p className="page-subheading">Monthly attendance overview, records, and correction requests</p>
        </div>
        <Button
          id="export-attendance-csv"
          variant="outline"
          className="gap-2"
          disabled={!records.length}
          onClick={() => {
            exportToCsv(
              records.map((r) => ({
                Date: r.date,
                Status: r.status,
                "Clock In": r.clock_in || "",
                "Clock Out": r.clock_out || "",
                Hours: r.total_hours ?? "",
              })),
              `attendance-${viewYear}-${String(viewMonth).padStart(2, "0")}.csv`,
            );
          }}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* ─── Summary Stats ─── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {/* Present */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Present</CardTitle>
            <div className="stat-icon bg-success/8">
              <CheckCircle2 className="h-[18px] w-[18px] text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
              {isLoadingMonth ? "…" : summary.present}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Days worked</p>
          </CardContent>
        </Card>

        {/* Absent */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Absent</CardTitle>
            <div className="stat-icon bg-destructive/8">
              <XCircle className="h-[18px] w-[18px] text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
              {isLoadingMonth ? "…" : summary.absent}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Days missed</p>
          </CardContent>
        </Card>

        {/* Leave */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Leave</CardTitle>
            <div className="stat-icon bg-warning/8">
              <Palmtree className="h-[18px] w-[18px] text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
              {isLoadingMonth ? "…" : summary.leave}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Days on leave</p>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Attendance Rate</CardTitle>
            <div className="stat-icon bg-primary/8">
              <TrendingUp className="h-[18px] w-[18px] text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-extrabold tracking-tight tabular-nums">
              {isLoadingMonth ? "…" : `${attendanceRate}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Of working days</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── Calendar Card ─── */}
      <Card className="card-premium">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {MONTH_NAMES[viewMonth - 1]} {viewYear}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                id="attendance-prev-month"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={prevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                id="attendance-next-month"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={nextMonth}
                disabled={isCurrentMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {(["PRESENT", "ABSENT", "LEAVE", "HOLIDAY", "WEEKEND"] as const).map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                {STATUS_CONFIG[s].label || s.charAt(0) + s.slice(1).toLowerCase()}
              </span>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoadingMonth ? (
            <CalendarSkeleton />
          ) : (
            <div className="space-y-2">
              {calendarWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-2">
                  {week.map((record, di) => {
                    if (!record) {
                      return <div key={di} className="h-14 rounded-xl" />;
                    }
                    const status = (record.status ?? "FUTURE") as DisplayStatus;
                    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.FUTURE;
                    const dayNum = parseInt(record.date.split("-")[2], 10);
                    const isToday = record.date === getLocalDateString();
                    const isFuture = status === "FUTURE";

                    return (
                      <div
                        key={di}
                        className={`
                          relative h-14 rounded-xl flex flex-col items-center justify-center gap-0.5
                          transition-all duration-150
                          ${cfg.bg}
                          ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                          ${!isFuture ? "cursor-default" : ""}
                        `}
                        title={isFuture ? "" : `${record.date} — ${cfg.label || status}`}
                      >
                        <span
                          className={`text-sm font-bold tabular-nums leading-none ${
                            isToday
                              ? "text-primary"
                              : isFuture
                              ? "text-muted-foreground/30"
                              : cfg.text
                          }`}
                        >
                          {dayNum}
                        </span>
                        {!isFuture && cfg.icon && (
                          <span className={`${cfg.text} opacity-80`}>{cfg.icon}</span>
                        )}
                        {record.total_hours && record.total_hours > 0 ? (
                          <span className="text-[9px] font-mono text-muted-foreground/70 leading-none">
                            {record.total_hours.toFixed(1)}h
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Bottom section: Correction Form + History (side by side on lg) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Correction Request Form ── */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Submit Attendance Correction
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Marked absent on a day you were present? Request a correction below.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitCorrection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="section-label block" htmlFor="correction-date">Date to Correct</label>
                <Input
                  id="correction-date"
                  type="date"
                  value={correctionDate}
                  max={getLocalDateString()}
                  onChange={(e) => setCorrectionDate(e.target.value)}
                  className="input-premium h-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="section-label block" htmlFor="correction-reason">Reason</label>
                <Textarea
                  id="correction-reason"
                  placeholder="Explain why this date should be marked as Present or Leave…"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="input-premium resize-none min-h-[90px]"
                  maxLength={500}
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {correctionReason.length}/500
                </p>
              </div>

              {correctionError && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                  {correctionError}
                </p>
              )}

              {submitMutation.isSuccess && (
                <p className="text-xs text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Correction submitted successfully.
                </p>
              )}

              <Button
                id="submit-correction-btn"
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full gap-2"
              >
                <SendHorizonal className="h-4 w-4" />
                {submitMutation.isPending ? "Submitting…" : "Submit Correction Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── My Correction History ── */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              My Correction Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingMyCorrections ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-start">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (myCorrections?.length ?? 0) === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-xl bg-muted/60 flex items-center justify-center border border-border/20 text-muted-foreground">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <p className="text-sm font-display font-semibold">No corrections submitted</p>
                <p className="text-xs text-muted-foreground">You haven't submitted any correction requests yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {myCorrections!.map((c: AttendanceCorrection) => {
                  const cfg = CORRECTION_STATUS_CONFIG[c.status] ?? CORRECTION_STATUS_CONFIG.PENDING;
                  return (
                    <div key={c.id} className="px-6 py-4 flex items-start justify-between gap-4 group hover:bg-muted/20 transition-colors">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold tabular-nums">{c.date}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{c.reason}</p>
                        <p className="text-[11px] text-muted-foreground/60">
                          Submitted {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] px-2 py-0.5 ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Manager: Pending Corrections Table (MANAGER/ADMIN only) ─── */}
      {isManager && (
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Review Correction Requests
              </CardTitle>
              {(allCorrections?.filter((c) => c.status === "PENDING").length ?? 0) > 0 && (
                <Badge className="text-[10px] px-2 py-0.5 bg-warning/15 text-warning border border-warning/30">
                  {allCorrections!.filter((c) => c.status === "PENDING").length} Pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingAllCorrections ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20 rounded-md" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (allCorrections?.length ?? 0) === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-xl bg-muted/60 flex items-center justify-center border border-border/20 text-muted-foreground">
                  <UserCheck className="h-5 w-5" />
                </div>
                <p className="text-sm font-display font-semibold">No correction requests</p>
                <p className="text-xs text-muted-foreground">There are no pending corrections to review.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left px-6 py-3 section-label font-semibold">Employee</th>
                      <th className="text-left px-4 py-3 section-label font-semibold">Date</th>
                      <th className="text-left px-4 py-3 section-label font-semibold hidden md:table-cell">Reason</th>
                      <th className="text-left px-4 py-3 section-label font-semibold">Status</th>
                      <th className="text-right px-6 py-3 section-label font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {allCorrections!.map((c: AttendanceCorrection) => {
                      const cfg = CORRECTION_STATUS_CONFIG[c.status] ?? CORRECTION_STATUS_CONFIG.PENDING;
                      const isPending = c.status === "PENDING";
                      const isReviewing = reviewMutation.isPending && reviewMutation.variables?.id === c.id;

                      return (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-medium">{c.employee_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{c.employee_email || ""}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-mono text-xs font-semibold tabular-nums">{c.date}</span>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <p className="text-xs text-muted-foreground max-w-xs line-clamp-2">{c.reason}</p>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${cfg.className}`}>
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  id={`approve-correction-${c.id}`}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-[11px] border-success/40 text-success hover:bg-success/10 gap-1"
                                  disabled={isReviewing}
                                  onClick={() => reviewMutation.mutate({ id: c.id, action: "APPROVED" })}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  {isReviewing ? "…" : "Approve"}
                                </Button>
                                <Button
                                  id={`reject-correction-${c.id}`}
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10 gap-1"
                                  disabled={isReviewing}
                                  onClick={() => reviewMutation.mutate({ id: c.id, action: "REJECTED" })}
                                >
                                  <XCircle className="h-3 w-3" />
                                  {isReviewing ? "…" : "Reject"}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {c.reviewed_at ? new Date(c.reviewed_at).toLocaleDateString() : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Today's clock detail (quick info strip) ─── */}
      {(() => {
        const todayRecord = records.find((r) => r.date === getLocalDateString());
        if (!todayRecord || todayRecord.status !== "PRESENT") return null;
        return (
          <Card className="card-premium border-success/20 bg-success/3">
            <CardContent className="py-4 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-semibold">Today — Present</span>
              </div>
              {todayRecord.clock_in && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Clock in: <span className="font-mono font-semibold text-foreground">
                    {new Date(todayRecord.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              {todayRecord.clock_out && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Clock out: <span className="font-mono font-semibold text-foreground">
                    {new Date(todayRecord.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )}
              {todayRecord.total_hours && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Hours: <span className="font-mono font-semibold text-foreground">{todayRecord.total_hours.toFixed(2)}h</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
