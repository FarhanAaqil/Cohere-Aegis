import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workSessionsApi } from "@/lib/work-sessions-api";
import { shiftsApi } from "@/lib/shifts-api";
import { notifyExtensionClockedIn, notifyExtensionClockedOut } from "@/lib/extension-activate";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Clock, LogIn, LogOut, Timer, Activity, Coffee, Play, History, Home, Building2, CalendarClock, StickyNote, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [elapsed, setElapsed] = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["work-session-status"],
    queryFn: workSessionsApi.getStatus,
    refetchInterval: 30000,
  });

  const { data: shiftData } = useQuery({
    queryKey: ["my-shift"],
    queryFn: shiftsApi.getMyShift,
  });
  const assignedShift = shiftData?.shift ?? null;

  const session = data?.session ?? null;
  const sessions = data?.sessions ?? [];
  const isWorking = data?.is_working ?? false;
  const onBreak = data?.on_break ?? false;
  const activeBreak = data?.active_break ?? null;
  const breaks = data?.breaks ?? [];
  const totalBreakSeconds = data?.total_break_seconds ?? 0;
  const totalCompletedSeconds = data?.total_completed_seconds ?? 0;
  const sessionCount = data?.session_count ?? 0;
  const loginType = (session?.login_type as "WFH" | "SITE" | null | undefined) ?? null;
  const sessionIp = (session?.ip_address as string | null | undefined) ?? null;
  const sessionNotes = (session?.notes as string | null | undefined) ?? "";
  const completedBreakSeconds = useMemo(
    () =>
      breaks
        .filter((b: { break_end: string | null }) => b.break_end)
        .reduce((sum: number, b: { duration_seconds?: number }) => sum + (b.duration_seconds || 0), 0),
    [breaks],
  );
  const displayedBreakSeconds = onBreak ? completedBreakSeconds + breakElapsed : totalBreakSeconds;

  useEffect(() => {
    if (isLoading) return;
    if (isWorking) notifyExtensionClockedIn();
    else notifyExtensionClockedOut();
  }, [isLoading, isWorking]);

  useEffect(() => {
    setNoteDraft(sessionNotes);
  }, [session?.id, sessionNotes]);

  // Calculate total active time: completed sessions + live active session
  useEffect(() => {
    if (!isWorking || !session?.start_time) {
      setElapsed(totalCompletedSeconds);
      return;
    }
    const startTime = new Date(session.start_time).getTime();
    const tick = () => {
      const now = Date.now();
      const currentSessionSec = Math.floor((now - startTime) / 1000);
      // Subtract breaks for the current active session
      const sessionBreaks = breaks.filter((b: { session_id: string }) => b.session_id === session.id);
      const completedBreakSec = sessionBreaks
        .filter((b: { break_end: string | null }) => b.break_end)
        .reduce((sum: number, b: { duration_seconds: number }) => sum + b.duration_seconds, 0);
      const currentBreakSec = onBreak && activeBreak
        ? Math.floor((now - new Date(activeBreak.break_start).getTime()) / 1000)
        : 0;
      const activeSessionTime = Math.max(0, currentSessionSec - completedBreakSec - currentBreakSec);
      setElapsed(totalCompletedSeconds + activeSessionTime);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isWorking, session?.start_time, session?.id, totalCompletedSeconds, onBreak, activeBreak, breaks]);

  useEffect(() => {
    if (!onBreak || !activeBreak?.break_start) { setBreakElapsed(0); return; }
    const breakStart = new Date(activeBreak.break_start).getTime();
    const tick = () => setBreakElapsed(Math.floor((Date.now() - breakStart) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [onBreak, activeBreak?.break_start]);

  const clockInMut = useMutation({
    mutationFn: workSessionsApi.clockIn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work-session-status"] }); toast({ title: "Clocked in", description: "Your work session has started." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const clockOutMut = useMutation({
    mutationFn: workSessionsApi.clockOut,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work-session-status"] }); toast({ title: "Clocked out", description: "Your work session has ended." }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const breakInMut = useMutation({
    mutationFn: workSessionsApi.breakIn,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work-session-status"] }); toast({ title: "Break started", description: "Enjoy your break!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const breakOutMut = useMutation({
    mutationFn: workSessionsApi.breakOut,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work-session-status"] }); toast({ title: "Break ended", description: "Welcome back to work!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const notesMut = useMutation({
    mutationFn: (notes: string) => workSessionsApi.updateNotes(session!.id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-session-status"] });
      toast({ title: "Note saved" });
    },
    onError: (e: Error) => toast({ title: "Could not save note", description: e.message, variant: "destructive" }),
  });

  const greeting = new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening";

  return (
    <div className="page-shell animate-fade-in">
      <div className="page-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
        <Badge variant="outline" className="mb-3 border-primary/20 bg-primary/5 text-primary">
          My Workday
        </Badge>
        <h1 className="page-hero-title">
          Good {greeting}, {user?.first_name}!
        </h1>
        <p className="page-hero-subtitle">Clock in, manage breaks, capture session notes, and keep monitoring synced with the Chrome extension.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isWorking && (
            <Button size="lg" onClick={() => clockInMut.mutate()} disabled={clockInMut.isPending} className="h-11 gap-2 rounded-lg">
              <LogIn className="h-4 w-4" /> Clock In <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {isWorking && !onBreak && (
            <>
              <Button size="lg" variant="outline" onClick={() => breakInMut.mutate()} disabled={breakInMut.isPending}
                className="h-11 gap-2 rounded-lg border-warning/25 text-warning hover:bg-warning/5 hover:text-warning">
                <Coffee className="h-4 w-4" /> Start Break
              </Button>
              <Button size="lg" variant="destructive" onClick={() => clockOutMut.mutate()} disabled={clockOutMut.isPending} className="h-11 gap-2 rounded-lg">
                <LogOut className="h-4 w-4" /> Clock Out
              </Button>
            </>
          )}
          {isWorking && onBreak && (
            <Button size="lg" onClick={() => breakOutMut.mutate()} disabled={breakOutMut.isPending}
              className="h-11 gap-2 rounded-lg bg-accent hover:bg-accent/90">
              <Play className="h-4 w-4" /> End Break
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Status */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Status</CardTitle>
            <div className="stat-icon bg-primary/8">
              <Activity className="h-[18px] w-[18px] text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-lg text-muted-foreground">Loading…</div>
            ) : onBreak ? (
              <Badge className="bg-warning/10 text-warning border-warning/20 text-sm px-3 py-1">
                <Coffee className="h-3.5 w-3.5 mr-1.5" /> On Break
              </Badge>
            ) : isWorking ? (
              <Badge className="bg-success/10 text-success border-success/20 text-sm px-3 py-1">Working</Badge>
            ) : (
              <Badge variant="outline" className="text-sm px-3 py-1 border-border/50">Not clocked in</Badge>
            )}
            {sessionCount > 0 && !isWorking && (
              <p className="text-xs text-muted-foreground mt-2">
                {sessionCount} session{sessionCount !== 1 ? "s" : ""} today
              </p>
            )}
            {loginType && (
              <div className="mt-2.5">
                <Badge
                  id="login-type-badge"
                  className={
                    loginType === "SITE"
                      ? "bg-info/10 text-info border-info/20 text-[11px] px-2.5 py-0.5"
                      : "bg-primary/10 text-primary border-primary/20 text-[11px] px-2.5 py-0.5"
                  }
                >
                  {loginType === "SITE" ? (
                    <><Building2 className="h-3 w-3 mr-1" /> Working from Office</>
                  ) : (
                    <><Home className="h-3 w-3 mr-1" /> Working from Home</>
                  )}
                </Badge>
                {sessionIp && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 font-mono tabular-nums" id="session-ip">
                    IP {sessionIp}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Active Time (across all sessions) */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Total Active Time</CardTitle>
            <div className="stat-icon bg-success/8">
              <Timer className="h-[18px] w-[18px] text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-[28px] font-display font-extrabold font-mono tracking-wider tabular-nums leading-none">
              {formatDuration(elapsed)}
            </div>
            {isWorking && !onBreak && (
              <p className="text-xs text-success mt-2 flex items-center gap-1.5">
                <span className="dot-live" /> Live
              </p>
            )}
            {onBreak && <p className="text-xs text-warning mt-2">Paused during break</p>}
          </CardContent>
        </Card>

        {/* Break Time */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Break Time</CardTitle>
            <div className="stat-icon bg-warning/8">
              <Coffee className="h-[18px] w-[18px] text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-[28px] font-display font-extrabold font-mono tracking-wider tabular-nums leading-none">
              {formatDuration(displayedBreakSeconds)}
            </div>
            {onBreak && (
              <p className="text-xs text-warning mt-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                On break — {formatDuration(breakElapsed)}
              </p>
            )}
            {!onBreak && breaks.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">{breaks.length} break{breaks.length !== 1 ? "s" : ""} today</p>
            )}
          </CardContent>
        </Card>

        {/* Sessions */}
        <Card className="card-premium">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Sessions</CardTitle>
            <div className="stat-icon bg-info/8">
              <History className="h-[18px] w-[18px] text-info" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-[28px] font-display font-extrabold font-mono tracking-wider tabular-nums leading-none">
              {sessionCount}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isWorking ? "Currently in session" : "Total today"}
            </p>
          </CardContent>
        </Card>
      </div>

      {assignedShift && (
        <Card className="card-premium" id="assigned-shift-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Assigned Shift</CardTitle>
            <div className="stat-icon bg-info/8">
              <CalendarClock className="h-[18px] w-[18px] text-info" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-display font-semibold">{assignedShift.name}</p>
            <p className="text-sm text-muted-foreground font-mono tabular-nums mt-1">
              {String(assignedShift.start_time).slice(0, 5)} – {String(assignedShift.end_time).slice(0, 5)}
            </p>
          </CardContent>
        </Card>
      )}

      {isWorking && session && (
        <Card className="card-premium" id="session-note-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="section-label">Session note</CardTitle>
            <div className="stat-icon bg-primary/8">
              <StickyNote className="h-[18px] w-[18px] text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionNotes ? (
              <p className="text-xs text-muted-foreground">Saved on this session. Edit below to update.</p>
            ) : null}
            <Textarea
              id="session-note-input"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note for this session…"
              maxLength={2000}
              className="min-h-[88px]"
            />
            <Button
              id="session-note-save"
              size="sm"
              disabled={notesMut.isPending || noteDraft.trim() === sessionNotes.trim()}
              onClick={() => notesMut.mutate(noteDraft)}
            >
              {notesMut.isPending ? "Saving…" : "Save note"}
            </Button>
          </CardContent>
        </Card>
      )}
      {/* Session History */}
      {sessions.length > 0 && (
        <Card className="card-premium overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-info" /> Today's Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {sessions.map((s: { id: string; start_time: string; end_time: string | null; total_active_seconds: number }, i: number) => (
                <div key={s.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-info/8 flex items-center justify-center text-[10px] font-bold text-info">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium tabular-nums font-mono">
                      {new Date(s.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "ongoing"}
                    </p>
                  </div>
                  <Badge variant={s.end_time ? "secondary" : "outline"} className="text-[11px] font-mono tabular-nums">
                    {s.end_time ? formatDuration(s.total_active_seconds) : "Active"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Break History */}
      {breaks.length > 0 && (
        <Card className="card-premium overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <Coffee className="h-4 w-4 text-warning" /> Today's Breaks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {breaks.map((b: { id: string; break_start: string; break_end: string | null; duration_seconds: number }, i: number) => (
                <div key={b.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-warning/8 flex items-center justify-center text-[10px] font-bold text-warning">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium tabular-nums font-mono">
                      {new Date(b.break_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {b.break_end ? new Date(b.break_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "ongoing"}
                    </p>
                  </div>
                  <Badge variant={b.break_end ? "secondary" : "outline"} className="text-[11px] font-mono tabular-nums">
                    {b.break_end ? formatDuration(b.duration_seconds) : "Active"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
