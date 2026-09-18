import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { isManagerOrAbove, roleLabel } from "@/lib/roles";
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
import { Plus, Pencil, Users, UserPlus, UserMinus, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface Team {
  id: string;
  name: string;
  manager_id: string | null;
  manager: { first_name: string; last_name: string } | null;
  member_count: number;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status?: string;
  team_id?: string | null;
}

export default function AdminTeamsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [managerId, setManagerId] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [addToTeamId, setAddToTeamId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ["admin-teams"],
    queryFn: adminApi.getTeams,
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.getUsers,
  });

  const teams: Team[] = teamsData?.teams ?? [];
  const allUsers: User[] = usersData?.users ?? [];
  const managers = allUsers.filter((u) => isManagerOrAbove(u.role));

  // Members query for expanded team
  const { data: membersData } = useQuery({
    queryKey: ["team-members", expandedTeam],
    queryFn: () => adminApi.getTeamMembers(expandedTeam!),
    enabled: !!expandedTeam,
  });
  const members: User[] = membersData?.members ?? [];

  const createMut = useMutation({
    mutationFn: adminApi.createTeam,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-teams"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      toast({ title: "Team created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; manager_id?: string | null }) =>
      adminApi.updateTeam(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-teams"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      setOpen(false);
      setEditTeam(null);
      toast({ title: "Team updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addMembersMut = useMutation({
    mutationFn: ({ teamId, userIds }: { teamId: string; userIds: string[] }) =>
      adminApi.addTeamMembers(teamId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-teams"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setAddMembersOpen(false);
      setSelectedUserIds([]);
      toast({ title: "Members added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMemberMut = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      adminApi.removeTeamMember(teamId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-teams"] });
      qc.invalidateQueries({ queryKey: ["team-members"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Member removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditTeam(null);
    setName("");
    setManagerId("");
    setOpen(true);
  };

  const openEdit = (t: Team) => {
    setEditTeam(t);
    setName(t.name);
    setManagerId(t.manager_id ?? "");
    setOpen(true);
  };

  const handleSubmit = () => {
    if (editTeam) {
      updateMut.mutate({ id: editTeam.id, name, manager_id: managerId || null });
    } else {
      createMut.mutate({ name, manager_id: managerId || null });
    }
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  const openAddMembers = (teamId: string) => {
    setAddToTeamId(teamId);
    setSelectedUserIds([]);
    setAddMembersOpen(true);
  };

  // Available users = those not already in this team
  const availableUsers = allUsers.filter(
    (u) => u.status === "ACTIVE" && u.team_id !== addToTeamId
  );

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const roleBadge = (r: string) => {
    const cls: Record<string, string> = {
      ADMIN: "bg-destructive/15 text-destructive border-destructive/30",
      HR_MANAGER: "bg-accent/15 text-accent border-accent/30",
      MANAGER: "bg-info/15 text-info border-info/30",
      EMPLOYEE: "bg-primary/15 text-primary border-primary/30",
    };
    return <Badge className={cls[r] || ""} variant="outline">{roleLabel(r)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Team Management</h1>
          <p className="page-subheading">Create teams and assign managers</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditTeam(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> New Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editTeam ? "Edit Team" : "Create Team"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Team Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Manager (one per team)</Label>
                <Select value={managerId} onValueChange={(v) => setManagerId(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="No manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No manager</SelectItem>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.first_name} {m.last_name} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} disabled={!name.trim() || createMut.isPending || updateMut.isPending} className="w-full">
                {editTeam ? "Save Changes" : "Create Team"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Members Dialog */}
      <Dialog open={addMembersOpen} onOpenChange={setAddMembersOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Members to Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available users to add.</p>
            ) : (
              availableUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={selectedUserIds.includes(u.id)}
                    onCheckedChange={() => toggleUserSelection(u.id)}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.first_name} {u.last_name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  {roleBadge(u.role)}
                </label>
              ))
            )}
          </div>
          {selectedUserIds.length > 0 && (
            <Button
              onClick={() => addToTeamId && addMembersMut.mutate({ teamId: addToTeamId, userIds: selectedUserIds })}
              disabled={addMembersMut.isPending}
              className="w-full"
            >
              Add {selectedUserIds.length} Member{selectedUserIds.length > 1 ? "s" : ""}
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Teams List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No teams yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map((t) => {
            const isExpanded = expandedTeam === t.id;
            return (
              <Card key={t.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(t.id)}>
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div>
                        <CardTitle className="text-lg">{t.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {t.manager
                            ? `Manager: ${t.manager.first_name} ${t.manager.last_name}`
                            : "No manager assigned"
                          }
                          {" · "}
                          {t.member_count} member{t.member_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openAddMembers(t.id)} title="Add members">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)} title="Edit team">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members in this team yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {members.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="font-medium">{m.first_name} {m.last_name}</TableCell>
                              <TableCell>{m.email}</TableCell>
                              <TableCell>{roleBadge(m.role)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeMemberMut.mutate({ teamId: t.id, userId: m.id })}
                                  title="Remove from team"
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
