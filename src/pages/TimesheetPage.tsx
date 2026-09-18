import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workSessionsApi } from "@/lib/work-sessions-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, PlayCircle, StopCircle, FileText, Save, History, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportToCsv } from "@/lib/reports-api";

type SessionRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string | null;
  total_active_seconds: number;
  notes: string | null;
};

const formatDur = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
};

const TimesheetPage = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["work-session-status"],
    queryFn: workSessionsApi.getStatus,
  });

  const { data: history } = useQuery({
    queryKey: ["work-session-history"],
    queryFn: () => workSessionsApi.getHistory(14),
  });

  const session = data?.session ?? null;
  const isWorking = data?.is_working ?? false;
  const sessionDone = session && session.end_time;

  // Notes for the CURRENT/most recent session
  const [notesDraft, setNotesDraft] = useState("");
  useEffect(() => {
    setNotesDraft(session?.notes ?? "");
  }, [session?.id, session?.notes]);

  const clockInMut = useMutation({
    mutationFn: workSessionsApi.clockIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-session-status"] });
      qc.invalidateQueries({ queryKey: ["work-session-history"] });
      toast({ title: "✅ Clocked In", description: "Your work session has started." });
    },
    onError: (e: Error) => toast({ title: "Clock In Failed", description: e.message, variant: "destructive" }),
  });

  const clockOutMut = useMutation({
    mutationFn: workSessionsApi.clockOut,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["work-session-status"] });
      qc.invalidateQueries({ queryKey: ["work-session-history"] });
      const secs = res?.session?.total_active_seconds ?? 0;
      toast({ title: "✅ Clocked Out", description: `Session ended. You worked ${formatDur(secs)} today.` });
    },
    onError: (e: Error) => toast({ title: "Clock Out Failed", description: e.message, variant: "destructive" }),
  });

  const notesMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => workSessionsApi.updateNotes(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["work-session-status"] });
      qc.invalidateQueries({ queryKey: ["work-session-history"] });
      toast({ title: "Notes saved", description: "Your work notes were updated." });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">My Timesheet</h1>
          <p className="page-subheading">Track sessions and log what you worked on</p>
        </div>
        <div className="flex gap-2">
          <Button
            id="export-timesheet-csv"
            variant="outline"
            className="gap-2 rounded-xl h-10"
            disabled={!history?.sessions?.length}
            onClick={() => {
              const sessions = (history?.sessions ?? []) as SessionRow[];
              exportToCsv(
                sessions.map((s) => ({
                  Date: s.date,
                  "Clock In": s.start_time,
                  "Clock Out": s.end_time || "",
                  Hours: (s.total_active_seconds / 3600).toFixed(2),
                  Notes: s.notes || "",
                })),
                "timesheet.csv",
              );
            }}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            className="gap-2 rounded-xl h-10"
            onClick={() => clockInMut.mutate()}
            disabled={isWorking || !!sessionDone || clockInMut.isPending || isLoading}
          >
            <PlayCircle className="h-4 w-4" />
            {clockInMut.isPending ? "Clocking in…" : "Clock In"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 rounded-xl h-10"
            onClick={() => clockOutMut.mutate()}
            disabled={!isWorking || clockOutMut.isPending}
          >
            <StopCircle className="h-4 w-4" />
            {clockOutMut.isPending ? "Clocking out…" : "Clock Out"}
          </Button>
        </div>
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Today's Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !session ? (
            <p className="text-sm text-muted-foreground">No sessions recorded today. Clock in to start tracking your time.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Started</span>
                <span className="font-medium font-mono tabular-nums">{new Date(session.start_time).toLocaleTimeString()}</span>
              </div>
              {session.end_time && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ended</span>
                  <span className="font-medium font-mono tabular-nums">{new Date(session.end_time).toLocaleTimeString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-medium flex items-center gap-1.5 ${isWorking ? "text-success" : "text-muted-foreground"}`}>
                  {isWorking && <span className="dot-live" />}
                  {isWorking ? "Working" : "Completed"}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {session && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              What did you work on?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value.slice(0, 2000))}
              placeholder="e.g. Finished the onboarding email flow, reviewed PRs, paired with Sam on the dashboard bug…"
              rows={4}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{notesDraft.length}/2000</span>
              <Button
                size="sm"
                className="gap-2 rounded-xl"
                onClick={() => notesMut.mutate({ id: session.id, notes: notesDraft })}
                disabled={notesMut.isPending || notesDraft === (session.notes ?? "")}
              >
                <Save className="h-3.5 w-3.5" />
                {notesMut.isPending ? "Saving…" : "Save notes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!history?.sessions?.length ? (
            <p className="text-sm text-muted-foreground">No past sessions yet.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {(history.sessions as SessionRow[])
                .filter((s) => s.id !== session?.id)
                .map((s) => (
                  <li key={s.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {new Date(s.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                      <span className="text-muted-foreground font-mono tabular-nums text-xs">
                        {new Date(s.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "…"}
                        {" · "}
                        {formatDur(s.total_active_seconds)}
                      </span>
                    </div>
                    {s.notes ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.notes}</p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/70">No notes</p>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimesheetPage;
