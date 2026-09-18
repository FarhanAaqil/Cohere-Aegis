import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reportsApi, ReportRow, exportToCsv } from "@/lib/reports-api";
import { adminApi } from "@/lib/admin-api";
import { workSessionsApi } from "@/lib/work-sessions-api";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Download, FileBarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtBreak(sec: number) {
  const m = Math.floor(sec / 60);
  return `${m}m`;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = isAdminRole(user?.role);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [userId, setUserId] = useState("ALL");
  const [deptId, setDeptId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const { data: deptData } = useQuery({
    queryKey: ["report-departments"],
    queryFn: reportsApi.getDepartments,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.getUsers,
    enabled: isAdmin,
  });

  const { data: teamData } = useQuery({
    queryKey: ["team-overview", "today"],
    queryFn: () => workSessionsApi.getTeamOverview("today"),
    enabled: !isAdmin,
  });

  const employees = useMemo(() => {
    if (isAdmin) return (usersData?.users ?? []) as Array<{ id: string; first_name: string; last_name: string }>;
    return (teamData?.members ?? []) as Array<{ id: string; first_name: string; last_name: string }>;
  }, [isAdmin, usersData, teamData]);

  const params = {
    from,
    to,
    user_id: userId === "ALL" ? undefined : userId,
    department_id: deptId === "ALL" ? undefined : deptId,
    status,
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["reports", params],
    queryFn: () => reportsApi.getReport(params),
  });

  const rows: ReportRow[] = data?.rows ?? [];
  const departments: Array<{ id: string; name: string }> = deptData?.departments ?? [];

  const commentMut = useMutation({
    mutationFn: (comment: string) => workSessionsApi.updateManagerComment(selected!.session_id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Comment saved" });
      setSelected((prev) => prev ? { ...prev, manager_comment: commentDraft } : prev);
    },
    onError: (e: Error) => toast({ title: "Could not save comment", description: e.message, variant: "destructive" }),
  });

  const exportRows = () => {
    exportToCsv(
      rows.map((r) => ({
        Employee: r.employee,
        Email: r.email,
        Department: r.department,
        Date: r.date,
        "Clock In": r.clock_in,
        "Clock Out": r.clock_out || "",
        "Total Hours": r.total_hours,
        "Break Minutes": Math.round(r.break_seconds / 60),
        Late: r.late ? "Yes" : "No",
        Early: r.early ? "Yes" : "No",
        IP: r.ip_address,
        "WFH/Site": r.login_type,
        Notes: r.notes,
        "Manager Comment": r.manager_comment,
      })),
      `lc-monitor-report-${from}-to-${to}.csv`,
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-heading">Reports</h1>
          <p className="page-subheading">Filter attendance sessions and export CSV</p>
        </div>
        <Button id="export-report-csv" variant="outline" className="gap-2" onClick={exportRows} disabled={!rows.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input id="report-from" type="date" className="input-premium" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input id="report-to" type="date" className="input-premium" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger id="report-employee"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All employees</SelectItem>
                {employees.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger id="report-dept"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="report-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="WFH">WFH</SelectItem>
                <SelectItem value="SITE">Office</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="EARLY">Early</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary" />
            {isFetching ? "Loading…" : `${rows.length} session${rows.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><Skeleton className="h-24 w-full" /></div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-display font-semibold">No sessions in this range</p>
              <p className="text-xs text-muted-foreground mt-1">Adjust filters or pick another date range.</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => refetch()}>Refresh</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="section-label pl-4">Employee</TableHead>
                    <TableHead className="section-label">Date</TableHead>
                    <TableHead className="section-label">Clock In</TableHead>
                    <TableHead className="section-label">Clock Out</TableHead>
                    <TableHead className="section-label">Hours</TableHead>
                    <TableHead className="section-label">Break</TableHead>
                    <TableHead className="section-label">Late</TableHead>
                    <TableHead className="section-label">Early</TableHead>
                    <TableHead className="section-label">IP</TableHead>
                    <TableHead className="section-label">WFH/Site</TableHead>
                    <TableHead className="section-label">Notes</TableHead>
                    <TableHead className="section-label pr-4">Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r.session_id}
                      className="cursor-pointer"
                      onClick={() => { setSelected(r); setCommentDraft(r.manager_comment || ""); }}
                    >
                      <TableCell className="pl-4">
                        <p className="text-sm font-medium">{r.employee}</p>
                        <p className="text-[11px] text-muted-foreground">{r.department || r.email}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.date}</TableCell>
                      <TableCell className="font-mono text-xs">{fmtTime(r.clock_in)}</TableCell>
                      <TableCell className="font-mono text-xs">{fmtTime(r.clock_out)}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">{r.total_hours}</TableCell>
                      <TableCell className="font-mono text-xs">{fmtBreak(r.break_seconds)}</TableCell>
                      <TableCell>{r.late ? <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">Late</Badge> : "—"}</TableCell>
                      <TableCell>{r.early ? <Badge className="bg-info/10 text-info border-info/20 text-[10px]">Early</Badge> : "—"}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{r.ip_address || "—"}</TableCell>
                      <TableCell>{r.login_type || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{r.notes || "—"}</TableCell>
                      <TableCell className="pr-4 text-xs text-muted-foreground max-w-[160px] truncate">{r.manager_comment || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.employee}</SheetTitle>
                <SheetDescription>
                  {selected.date} · {fmtTime(selected.clock_in)} – {fmtTime(selected.clock_out)}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="section-label">Hours</p>
                    <p className="font-mono tabular-nums">{selected.total_hours}</p>
                  </div>
                  <div>
                    <p className="section-label">Location</p>
                    <p>{selected.login_type || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="section-label">Employee note</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{selected.notes || "None"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager-comment">Manager comment</Label>
                  <Textarea
                    id="manager-comment"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    maxLength={2000}
                    placeholder="Add a comment on this session…"
                  />
                  <Button
                    id="save-manager-comment"
                    onClick={() => commentMut.mutate(commentDraft)}
                    disabled={commentMut.isPending}
                  >
                    {commentMut.isPending ? "Saving…" : "Save comment"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
