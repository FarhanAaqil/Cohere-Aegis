import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksApi, Task, TaskActivity } from "@/lib/tasks-api";
import { adminApi } from "@/lib/admin-api";
import { useAuth } from "@/contexts/AuthContext";
import { isManagerOrAbove } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, GripVertical, Calendar, User, Trash2, Edit3,
  Circle, ArrowRight, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  ClipboardList, History,
} from "lucide-react";
import { format } from "date-fns";

const ACTION_LABEL: Record<string, string> = {
  CREATED: "created the task",
  STATUS_CHANGED: "changed status",
  PRIORITY_CHANGED: "changed priority",
  ASSIGNEE_CHANGED: "reassigned",
  TITLE_CHANGED: "renamed",
  DESCRIPTION_CHANGED: "edited description",
  DUE_DATE_CHANGED: "changed due date",
  DELETED: "deleted the task",
};

function HistoryDialog({ taskId, open, onOpenChange }: { taskId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["task-activity", taskId],
    queryFn: () => tasksApi.activity(taskId),
    enabled: open,
  });
  const activity: TaskActivity[] = data?.activity ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><History className="h-4 w-4" /> Task history</DialogTitle></DialogHeader>
        <ScrollArea className="max-h-[400px] pr-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
          ) : (
            <ol className="relative border-l border-border/50 ml-3 space-y-4">
              {activity.map((a) => {
                const d = a.details as { from?: unknown; to?: unknown } | null;
                return (
                  <li key={a.id} className="ml-4">
                    <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="text-sm text-foreground">
                      <span className="font-medium">{a.actor ? `${a.actor.first_name} ${a.actor.last_name}` : "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{ACTION_LABEL[a.action] ?? a.action.toLowerCase()}</span>
                      {d && d.from !== undefined && d.to !== undefined && (
                        <span className="text-muted-foreground"> — <span className="line-through">{String(d.from ?? "—")}</span> → <span className="text-foreground">{String(d.to ?? "—")}</span></span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{format(new Date(a.created_at), "MMM d, yyyy · h:mm a")}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_COLUMNS = [
  { key: "TODO" as const, label: "To Do", icon: Circle, color: "text-muted-foreground", bg: "bg-muted/50" },
  { key: "IN_PROGRESS" as const, label: "In Progress", icon: ArrowRight, color: "text-info", bg: "bg-info/5" },
  { key: "DONE" as const, label: "Done", icon: CheckCircle2, color: "text-success", bg: "bg-success/5" },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  LOW: { label: "Low", color: "text-muted-foreground", border: "border-muted-foreground/20" },
  MEDIUM: { label: "Medium", color: "text-info", border: "border-info/20" },
  HIGH: { label: "High", color: "text-warning", border: "border-warning/20" },
  URGENT: { label: "Urgent", color: "text-destructive", border: "border-destructive/20" },
};

function TaskCard({
  task, onUpdate, onDelete, canEdit,
}: {
  task: Task; onUpdate: (data: Partial<Task> & { id: string }) => void; onDelete: (id: string) => void; canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "DONE";

  return (
    <div
      className="card-premium p-3.5 group cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground leading-snug truncate">{task.title}</h4>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priority.color} ${priority.border}`}>
              {priority.label}
            </Badge>
            {task.assignee && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User className="h-2.5 w-2.5" />
                {task.assignee.first_name} {task.assignee.last_name[0]}.
              </span>
            )}
            {task.due_date && (
              <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                <Calendar className="h-2.5 w-2.5" />
                {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {isOverdue && <AlertTriangle className="h-2.5 w-2.5" />}
              </span>
            )}
          </div>

          {expanded && (
            <div className="mt-3 space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              {task.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
              )}
              {canEdit && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Select
                    value={task.status}
                    onValueChange={(v) => onUpdate({ id: task.id, status: v as Task["status"] })}
                  >
                    <SelectTrigger className="h-7 text-[11px] w-auto min-w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">To Do</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={task.priority}
                    onValueChange={(v) => onUpdate({ id: task.id, priority: v as Task["priority"] })}
                  >
                    <SelectTrigger className="h-7 text-[11px] w-auto min-w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground">
                  Created by {task.creator ? `${task.creator.first_name} ${task.creator.last_name}` : "Unknown"} · {new Date(task.created_at).toLocaleDateString()}
                </p>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => setHistoryOpen(true)}>
                  <History className="h-3 w-3" /> History
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <HistoryDialog taskId={task.id} open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newDueDate, setNewDueDate] = useState("");
  const [newStatus, setNewStatus] = useState("TODO");

  const canManage = isManagerOrAbove(user?.role);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.list(),
    refetchInterval: 30000,
  });

  const tasks: Task[] = data?.tasks ?? [];

  const { data: usersData } = useQuery({
    queryKey: ["all-users-for-tasks"],
    queryFn: () => adminApi.getUsers(),
    enabled: canManage,
  });
  const allUsers = usersData?.users ?? [];

  const createMut = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setCreateOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewAssignee("");
      setNewPriority("MEDIUM");
      setNewDueDate("");
      setNewStatus("TODO");
      toast({ title: "Task created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: tasksApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    const assigneeId = canManage ? newAssignee : user?.id;
    if (!newTitle.trim() || !assigneeId) return;
    createMut.mutate({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      assignee_id: assigneeId,
      priority: newPriority,
      due_date: newDueDate || undefined,
      status: newStatus,
    });
  };

  const handleUpdate = useCallback((data: Partial<Task> & { id: string }) => {
    updateMut.mutate(data);
  }, [updateMut]);

  const handleDelete = useCallback((id: string) => {
    deleteMut.mutate(id);
  }, [deleteMut]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Tasks</h1>
          <p className="page-subheading">
            {canManage ? "Manage and assign tasks across your team" : "Your assigned tasks and to-dos"}
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl h-10">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="section-label mb-1.5 block">Title</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" className="input-premium" />
              </div>
              <div>
                <Label className="section-label mb-1.5 block">Description (optional)</Label>
                <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Details..." className="min-h-[80px] bg-muted/30 border-border/50 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {canManage ? (
                  <div>
                    <Label className="section-label mb-1.5 block">Assign to</Label>
                    <Select value={newAssignee} onValueChange={setNewAssignee}>
                      <SelectTrigger className="input-premium"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {allUsers.map((u: { id: string; first_name: string; last_name: string; email: string }) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label className="section-label mb-1.5 block">Assigned to</Label>
                    <Input value={`${user?.first_name} ${user?.last_name}`} disabled className="input-premium" />
                  </div>
                )}
                <div>
                  <Label className="section-label mb-1.5 block">Priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger className="input-premium"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="section-label mb-1.5 block">Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="input-premium"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">To Do</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="section-label mb-1.5 block">Due date</Label>
                  <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="input-premium" />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={!newTitle.trim() || createMut.isPending || (!canManage ? false : !newAssignee)} className="w-full h-11 rounded-xl">
                {createMut.isPending ? "Creating…" : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-20">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <Card className="card-premium">
          <CardContent className="py-16 text-center space-y-4">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-muted/80 flex items-center justify-center">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-display font-semibold">No tasks yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {canManage ? "Create tasks and assign them to your team members." : "You don't have any tasks assigned yet."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATUS_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="space-y-3">
                <div className={`rounded-xl px-4 py-3 ${col.bg} border border-border/30`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <col.icon className={`h-4 w-4 ${col.color}`} />
                      <span className="text-sm font-display font-semibold text-foreground">{col.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                      {colTasks.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      canEdit={canManage || task.assignee_id === user?.id}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/40 p-6 text-center">
                      <p className="text-xs text-muted-foreground">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
