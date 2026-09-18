import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { isManagerOrAbove } from "@/lib/roles";
import { leaveApi, LeaveRequest } from "@/lib/leave-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Palmtree,
  SendHorizonal,
  ClipboardList,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
  APPROVED: { label: "Approved", className: "bg-success/10 text-success border-success/20" },
  REJECTED: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LeaveRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isManager = isManagerOrAbove(user?.role);

  const [date, setDate] = useState(todayLocal());
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});

  const { data: mineData, isLoading: loadingMine } = useQuery({
    queryKey: ["leave-mine"],
    queryFn: leaveApi.getMyLeaves,
  });

  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ["leave-all"],
    queryFn: leaveApi.getTeamLeaves,
    enabled: isManager,
  });

  const submitMut = useMutation({
    mutationFn: () => leaveApi.submitLeave(date, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-mine"] });
      qc.invalidateQueries({ queryKey: ["leave-all"] });
      setReason("");
      toast({ title: "Leave submitted", description: "Your request is pending review." });
    },
    onError: (e: Error) => toast({ title: "Could not submit", description: e.message, variant: "destructive" }),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: "APPROVED" | "REJECTED"; comment?: string }) =>
      leaveApi.reviewLeave(id, action, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-mine"] });
      qc.invalidateQueries({ queryKey: ["leave-all"] });
      toast({ title: "Leave reviewed" });
    },
    onError: (e: Error) => toast({ title: "Review failed", description: e.message, variant: "destructive" }),
  });

  const myLeaves = mineData?.leaves ?? [];
  const teamLeaves = teamData?.leaves ?? [];
  const pendingCount = teamLeaves.filter((l) => l.status === "PENDING").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-heading">Leave Requests</h1>
        <p className="page-subheading">Submit time off and track approval status</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <Palmtree className="h-4 w-4 text-warning" />
              Request Leave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="leave-submit-form"
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!reason.trim()) return;
                submitMut.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="leave-date">Date</Label>
                <Input
                  id="leave-date"
                  type="date"
                  className="input-premium"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leave-reason">Reason</Label>
                <Textarea
                  id="leave-reason"
                  className="input-premium min-h-[100px]"
                  placeholder="Why do you need this day off?"
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground text-right">{reason.length}/500</p>
              </div>
              <Button id="submit-leave-btn" type="submit" disabled={submitMut.isPending} className="w-full gap-2">
                <SendHorizonal className="h-4 w-4" />
                {submitMut.isPending ? "Submitting…" : "Submit Leave Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              My Leave History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMine ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : myLeaves.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-xl bg-muted/60 flex items-center justify-center border border-border/20 text-muted-foreground">
                  <Palmtree className="h-5 w-5" />
                </div>
                <p className="text-sm font-display font-semibold">No leave requests yet</p>
                <p className="text-xs text-muted-foreground">Submit a request to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {myLeaves.map((l: LeaveRequest) => {
                  const cfg = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.PENDING;
                  return (
                    <div key={l.id} className="px-6 py-4 flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <span className="text-sm font-semibold tabular-nums font-mono">{l.date}</span>
                        <p className="text-xs text-muted-foreground line-clamp-2">{l.reason}</p>
                        {l.reviewer_comment && (
                          <p className="text-[11px] text-muted-foreground">Manager: {l.reviewer_comment}</p>
                        )}
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

      {isManager && (
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Review Leave Requests
              </CardTitle>
              {pendingCount > 0 && (
                <Badge className="text-[10px] px-2 py-0.5 bg-warning/15 text-warning border border-warning/30">
                  {pendingCount} Pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTeam ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : teamLeaves.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="h-10 w-10 mx-auto rounded-xl bg-muted/60 flex items-center justify-center border border-border/20 text-muted-foreground">
                  <UserCheck className="h-5 w-5" />
                </div>
                <p className="text-sm font-display font-semibold">No leave requests</p>
                <p className="text-xs text-muted-foreground">Nothing to review right now.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left px-6 py-3 section-label">Employee</th>
                      <th className="text-left px-4 py-3 section-label">Date</th>
                      <th className="text-left px-4 py-3 section-label hidden md:table-cell">Reason</th>
                      <th className="text-left px-4 py-3 section-label">Status</th>
                      <th className="text-right px-6 py-3 section-label">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {teamLeaves.map((l) => {
                      const cfg = STATUS_CONFIG[l.status] ?? STATUS_CONFIG.PENDING;
                      const isPending = l.status === "PENDING";
                      const reviewing = reviewMut.isPending && reviewMut.variables?.id === l.id;
                      return (
                        <tr key={l.id} className="hover:bg-muted/20">
                          <td className="px-6 py-4">
                            <div className="font-medium">{l.employee_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{l.employee_email}</div>
                          </td>
                          <td className="px-4 py-4 font-mono text-xs tabular-nums">{l.date}</td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <p className="text-xs text-muted-foreground max-w-xs line-clamp-2">{l.reason}</p>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${cfg.className}`}>
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isPending ? (
                              <div className="flex flex-col items-end gap-2">
                                <Input
                                  id={`leave-comment-${l.id}`}
                                  className="h-7 text-xs max-w-[180px]"
                                  placeholder="Optional comment"
                                  value={comments[l.id] ?? ""}
                                  onChange={(e) => setComments((prev) => ({ ...prev, [l.id]: e.target.value }))}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    id={`approve-leave-${l.id}`}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-3 text-[11px] border-success/40 text-success hover:bg-success/10 gap-1"
                                    disabled={reviewing}
                                    onClick={() =>
                                      reviewMut.mutate({ id: l.id, action: "APPROVED", comment: comments[l.id] })
                                    }
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Approve
                                  </Button>
                                  <Button
                                    id={`reject-leave-${l.id}`}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-3 text-[11px] border-destructive/40 text-destructive hover:bg-destructive/10 gap-1"
                                    disabled={reviewing}
                                    onClick={() =>
                                      reviewMut.mutate({ id: l.id, action: "REJECTED", comment: comments[l.id] })
                                    }
                                  >
                                    <XCircle className="h-3 w-3" /> Reject
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {l.reviewed_at ? new Date(l.reviewed_at).toLocaleDateString() : "—"}
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
    </div>
  );
}
