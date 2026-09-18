import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { shiftsApi, Shift } from "@/lib/shifts-api";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarClock, Plus, Pencil, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTime12h, formatDate, toTitleCase } from "@/lib/format";

function toTimeInput(value: string): string {
  return (value || "").slice(0, 5);
}

export default function ShiftSchedulingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [editing, setEditing] = useState<Shift | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignShiftId, setAssignShiftId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-shifts"],
    queryFn: shiftsApi.getAllShifts,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.getUsers,
  });

  const shifts = data?.shifts ?? [];
  const assignments = data?.assignments ?? [];
  const users: Array<{ id: string; first_name: string; last_name: string; email: string }> =
    usersData?.users ?? [];

  const createMut = useMutation({
    mutationFn: () => shiftsApi.createShift(name, startTime, endTime),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-shifts"] });
      setName("");
      toast({ title: "Shift created" });
    },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: () =>
      shiftsApi.updateShift(editing!.id, { name, start_time: startTime, end_time: endTime }),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-shifts"] });
      setEditing(null);
      setName("");
      setStartTime("09:00");
      setEndTime("18:00");
      toast({ title: "Shift updated" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const assignMut = useMutation({
    mutationFn: () => shiftsApi.assignShift(assignUserId, assignShiftId),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-shifts"] });
      toast({ title: "Shift assigned" });
    },
    onError: (e: Error) => toast({ title: "Assign failed", description: e.message, variant: "destructive" }),
  });

  const startEdit = (s: Shift) => {
    setEditing(s);
    setName(s.name);
    setStartTime(toTimeInput(s.start_time));
    setEndTime(toTimeInput(s.end_time));
  };

  const cancelEdit = () => {
    setEditing(null);
    setName("");
    setStartTime("09:00");
    setEndTime("18:00");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-heading">Shift Scheduling</h1>
        <p className="page-subheading">Create shifts and assign them to employees</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              {editing ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
              {editing ? "Edit Shift" : "Create Shift"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="shift-form"
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (editing) {
                  updateMut.mutate();
                  return;
                }
                const exists = shifts.some(
                  (s) =>
                    s.name.trim().toLowerCase() === name.trim().toLowerCase() &&
                    toTimeInput(s.start_time) === startTime &&
                    toTimeInput(s.end_time) === endTime
                );
                if (exists) {
                  toast({
                    title: "Duplicate shift",
                    description: "A shift with this name and hours already exists.",
                    variant: "destructive",
                  });
                  return;
                }
                createMut.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="shift-name">Name</Label>
                <Input
                  id="shift-name"
                  className="input-premium"
                  placeholder="Day Shift"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="shift-start">Start</Label>
                  <Input
                    id="shift-start"
                    type="time"
                    className="input-premium"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shift-end">End</Label>
                  <Input
                    id="shift-end"
                    type="time"
                    className="input-premium"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  id="save-shift-btn"
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className="gap-2"
                >
                  {editing ? "Save Changes" : "Create Shift"}
                </Button>
                {editing && (
                  <Button id="cancel-shift-edit-btn" type="button" variant="outline" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="card-premium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-info" />
              Assign Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="assign-shift-form"
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!assignUserId || !assignShiftId) return;
                assignMut.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>Employee</Label>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger id="assign-user-select">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(users) ? users : []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={assignShiftId} onValueChange={setAssignShiftId}>
                  <SelectTrigger id="assign-shift-select">
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({toTimeInput(s.start_time)}–{toTimeInput(s.end_time)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button id="assign-shift-btn" type="submit" disabled={assignMut.isPending} className="gap-2">
                Assign
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            All Shifts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : shifts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-display font-semibold">No shifts yet</p>
              <p className="text-xs text-muted-foreground">Create a shift to assign it to employees.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="section-label pl-6">Name</TableHead>
                  <TableHead className="section-label">Start</TableHead>
                  <TableHead className="section-label">End</TableHead>
                  <TableHead className="section-label pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-6 font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatTime12h(s.start_time)}</TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">{formatTime12h(s.end_time)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        id={`edit-shift-${s.id}`}
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1"
                        onClick={() => startEdit(s)}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold">Who is assigned which shift</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No employees assigned yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="section-label pl-6">Employee</TableHead>
                  <TableHead className="section-label">Shift</TableHead>
                  <TableHead className="section-label pr-6">Effective from</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="pl-6">
                      <p className="text-sm font-medium">{toTitleCase(a.employee_name)}</p>
                      <p className="text-[11px] text-muted-foreground">{a.employee_email}</p>
                    </TableCell>
                    <TableCell>{a.shift_name}</TableCell>
                    <TableCell className="pr-6 font-mono text-xs">{formatDate(a.effective_from)}</TableCell>
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
