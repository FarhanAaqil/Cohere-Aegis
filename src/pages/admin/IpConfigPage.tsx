import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Network, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CIDR_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

function isValidCidr(v: string): boolean {
  const m = v.trim().match(CIDR_RE);
  if (!m) return false;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const prefix = Number(m[5]);
  if (octets.some((n) => n > 255)) return false;
  return prefix >= 0 && prefix <= 32;
}

export default function IpConfigPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [cidr, setCidr] = useState("");
  const [label, setLabel] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["ip-ranges"],
    queryFn: adminApi.getIpRanges,
  });
  const ranges: Array<{ id: string; cidr: string; label: string | null }> = data?.ranges ?? [];
  const cidrOk = isValidCidr(cidr);

  const createMut = useMutation({
    mutationFn: () => adminApi.createIpRange(cidr.trim(), label.trim() || undefined),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["ip-ranges"] });
      setCidr("");
      setLabel("");
      toast({ title: "Range added" });
    },
    onError: (e: Error) => toast({ title: "Could not add range", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteIpRange(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["ip-ranges"] });
      toast({ title: "Range removed" });
    },
    onError: (e: Error) => toast({ title: "Could not remove range", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-heading">Trusted IPs</h1>
        <p className="page-subheading">Office CIDR ranges used to classify SITE vs WFH clock-ins</p>
      </div>

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Add range
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
          <div className="space-y-1.5">
            <Label htmlFor="ip-cidr">CIDR</Label>
            <Input
              id="ip-cidr"
              className="input-premium font-mono"
              placeholder="192.168.1.0/24"
              value={cidr}
              onChange={(e) => setCidr(e.target.value)}
            />
            {cidr && !cidrOk && (
              <p className="text-xs text-destructive">Enter a valid CIDR such as 192.168.1.0/24</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ip-label">Label</Label>
            <Input
              id="ip-label"
              className="input-premium"
              placeholder="Head Office"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <Button id="ip-add" disabled={!cidrOk || createMut.isPending} onClick={() => createMut.mutate()}>
            Add
          </Button>
        </CardContent>
      </Card>

      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" /> Configured ranges
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><Skeleton className="h-16 w-full" /></div>
          ) : ranges.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-display font-semibold">No trusted ranges</p>
              <p className="text-xs text-muted-foreground mt-1">All clock-ins will be classified as WFH until you add office CIDRs.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="section-label pl-4">CIDR</TableHead>
                  <TableHead className="section-label">Label</TableHead>
                  <TableHead className="section-label pr-4 w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranges.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 font-mono text-sm">{r.cidr}</TableCell>
                    <TableCell>{r.label || "—"}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        id={`ip-delete-${r.id}`}
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMut.mutate(r.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
