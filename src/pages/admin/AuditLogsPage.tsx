import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollText } from "lucide-react";

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface AuditLog {
  id: string;
  timestamp: string;
  type: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  metadata?: Record<string, unknown> | null;
}

export default function AuditLogsPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [userId, setUserId] = useState("ALL");
  const [offset, setOffset] = useState(0);

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: adminApi.getUsers,
  });
  const users: Array<{ id: string; first_name: string; last_name: string }> = usersData?.users ?? [];

  const params = useMemo(
    () => ({
      from,
      to,
      user_id: userId === "ALL" ? undefined : userId,
      offset,
      limit: 50,
    }),
    [from, to, userId, offset],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => adminApi.getAuditLogs(params),
  });

  const logs: AuditLog[] = data?.logs ?? [];
  const hasMore = !!data?.has_more;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-heading">Audit logs</h1>
        <p className="page-subheading">Clock-in/out and other recorded actions</p>
      </div>

      <Card className="card-premium">
        <CardContent className="pt-6 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input id="audit-from" type="date" className="input-premium" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input id="audit-to" type="date" className="input-premium" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }} />
          </div>
          <div className="space-y-1.5">
            <Label>User</Label>
            <Select value={userId} onValueChange={(v) => { setUserId(v); setOffset(0); }}>
              <SelectTrigger id="audit-user"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All users</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            {isFetching ? "Loading…" : `${logs.length} event${logs.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><Skeleton className="h-24 w-full" /></div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-display font-semibold">No audit events in this range</p>
              <p className="text-xs text-muted-foreground mt-1">Clock-in and clock-out are logged going forward.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="section-label pl-4">Action</TableHead>
                    <TableHead className="section-label">User</TableHead>
                    <TableHead className="section-label">Metadata</TableHead>
                    <TableHead className="section-label pr-4">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="pl-4">
                        <Badge variant="outline" className="font-mono text-[10px]">{e.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{e.user_name || "Unknown"}</p>
                        <p className="text-[11px] text-muted-foreground">{e.user_email}</p>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[280px] truncate">
                        {e.metadata ? JSON.stringify(e.metadata) : "—"}
                      </TableCell>
                      <TableCell className="pr-4 font-mono text-xs">
                        {new Date(e.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
            <Button id="audit-prev" variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Offset {offset}</span>
            <Button id="audit-next" variant="outline" size="sm" disabled={!hasMore} onClick={() => setOffset(offset + 50)}>
              Load more
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
