import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi } from "@/lib/admin-api";
import { roleLabel } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users } from "lucide-react";

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  team_id: string | null;
}

const TeamPage = () => {
  const { user } = useAuth();

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.getUsers,
    enabled: !!user,
  });

  const allUsers: User[] = usersData?.users ?? [];
  const teamMembers = user?.team_id
    ? allUsers.filter((u) => u.team_id === user.team_id)
    : [];

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
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-heading">Team</h1>
        <p className="page-subheading">People on your assigned team</p>
      </div>
      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Team members
            {teamMembers.length > 0 && (
              <Badge variant="secondary" className="ml-2">{teamMembers.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><Skeleton className="h-24 w-full" /></div>
          ) : !user?.team_id ? (
            <div className="py-12 text-center">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-muted/80 flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-display font-semibold">No team assigned</p>
              <p className="text-xs text-muted-foreground mt-1">Ask an admin to add you to a team.</p>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-display font-semibold">No teammates yet</p>
              <p className="text-xs text-muted-foreground mt-1">Your team has no other members.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="section-label pl-4">Name</TableHead>
                    <TableHead className="section-label">Email</TableHead>
                    <TableHead className="section-label pr-4">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="pl-4 font-medium">
                        {m.first_name} {m.last_name}
                        {m.id === user?.id && (
                          <span className="text-xs text-muted-foreground ml-2">(you)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.email}</TableCell>
                      <TableCell className="pr-4">{roleBadge(m.role)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamPage;
