import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { roleLabel } from "@/lib/roles";
import { toTitleCase } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Plus, Pencil, Copy, Check, UserX, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  team_id: string | null;
  department_id: string | null;
  job_title: string | null;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

const emptyForm = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "EMPLOYEE",
  team_id: "",
  department_id: "",
  status: "ACTIVE",
  job_title: "",
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.getUsers,
  });

  const { data: teamsData } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: adminApi.getTeams,
  });

  const { data: deptsData } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: adminApi.getDepartments,
  });

  const users: User[] = usersData?.users ?? [];
  const teams: Team[] = teamsData?.teams ?? [];
  const departments: Array<{ id: string; name: string }> = deptsData?.departments ?? [];

  const createMut = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: async (_, vars) => {
      await qc.refetchQueries({ queryKey: ["admin-users"] });
      setCreatedUser({ email: vars.email, password: vars.password });
      toast({ title: "User created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown> & { id: string }) =>
      adminApi.updateUser(id, body),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      setEditUser(null);
      toast({ title: "User updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setCreatedUser(null);
    setCopied(false);
    setOpen(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setCreatedUser(null);
    setCopied(false);
    setForm({
      email: u.email,
      password: "",
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      team_id: u.team_id ?? "",
      department_id: u.department_id ?? "",
      status: u.status,
      job_title: u.job_title ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editUser) {
      const body: Record<string, unknown> = {
        id: editUser.id,
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        role: form.role,
        status: form.status,
        team_id: form.team_id || null,
        department_id: form.department_id || null,
        job_title: form.job_title.trim() || null,
      };
      if (form.password) body.password = form.password;
      updateMut.mutate(body as Record<string, unknown> & { id: string });
    } else {
      createMut.mutate({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
        team_id: form.team_id || null,
        department_id: form.department_id || null,
        status: form.status,
        job_title: form.job_title.trim() || null,
      });
    }
  };

  const toggleStatus = (u: User) => {
    const newStatus = u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateMut.mutate({ id: u.id, status: newStatus });
  };

  const copyDetails = () => {
    if (!createdUser) return;
    navigator.clipboard.writeText(`Email: ${createdUser.email}\nPassword: ${createdUser.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusBadge = (s: string) =>
    s === "ACTIVE" ? (
      <Badge className="bg-success/15 text-success border-success/30">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );

  const roleBadge = (r: string) => {
    const cls: Record<string, string> = {
      ADMIN: "bg-destructive/15 text-destructive border-destructive/30",
      HR_MANAGER: "bg-accent/15 text-accent border-accent/30",
      MANAGER: "bg-info/15 text-info border-info/30",
      EMPLOYEE: "bg-primary/15 text-primary border-primary/30",
    };
    return <Badge className={cls[r] || ""}>{roleLabel(r)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">User Management</h1>
          <p className="page-subheading">Create accounts and assign roles, teams, and departments</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditUser(null); setCreatedUser(null); } }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> New User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editUser ? "Edit User" : "Create User"}</DialogTitle>
            </DialogHeader>

            {createdUser ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">User created successfully. Share the login details below.</p>
                <div className="rounded-md bg-muted p-4 text-sm font-mono space-y-1">
                  <div>Email: {createdUser.email}</div>
                  <div>Password: {createdUser.password}</div>
                </div>
                <Button onClick={copyDetails} variant="outline" className="w-full">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy Login Details"}
                </Button>
                <Button onClick={() => { setOpen(false); setCreatedUser(null); }} className="w-full">Done</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name</Label>
                    <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name</Label>
                    <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password{editUser ? " (leave blank to keep)" : ""}</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editUser ? "••••••••" : ""} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Select value={form.department_id || "_none"} onValueChange={(v) => setForm({ ...form, department_id: v === "_none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="No department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No department</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Team</Label>
                  <Select value={form.team_id || "_none"} onValueChange={(v) => setForm({ ...form, team_id: v === "_none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="No team" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No team</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Job Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    value={form.job_title}
                    onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                    placeholder="e.g. CEO, CTO, HR Manager, Designer"
                    maxLength={100}
                  />
                </div>
                <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="w-full">
                  {editUser ? "Save Changes" : "Create User"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{toTitleCase(u.first_name)} {toTitleCase(u.last_name)}</TableCell>
                    <TableCell className="text-muted-foreground">{toTitleCase(u.job_title) || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{roleBadge(u.role)}</TableCell>
                    <TableCell>
                      <Select
                        value={u.department_id || "_none"}
                        onValueChange={(v) =>
                          updateMut.mutate({
                            id: u.id,
                            department_id: v === "_none" ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => toggleStatus(u)}>
                        {u.status === "ACTIVE" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
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
