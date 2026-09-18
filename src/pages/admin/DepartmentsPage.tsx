import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: adminApi.getDepartments,
  });
  const departments: Array<{ id: string; name: string }> = data?.departments ?? [];

  const createMut = useMutation({
    mutationFn: () => adminApi.createDepartment(name.trim()),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-departments"] });
      setName("");
      toast({ title: "Department created" });
    },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: () => adminApi.updateDepartment(editingId!, name.trim()),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-departments"] });
      setEditingId(null);
      setName("");
      toast({ title: "Department renamed" });
    },
    onError: (e: Error) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.deleteDepartment(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["admin-departments"] });
      toast({ title: "Department deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-heading">Departments</h1>
        <p className="page-subheading">Create, rename, and assign departments to employees</p>
      </div>

      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? "Rename department" : "New department"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            id="department-form"
            className="flex flex-wrap gap-3 items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              if (editingId) updateMut.mutate();
              else createMut.mutate();
            }}
          >
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                className="input-premium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Engineering"
                required
              />
            </div>
            <Button id="save-dept-btn" type="submit" disabled={createMut.isPending || updateMut.isPending}>
              {editingId ? "Save" : "Create"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setName(""); }}>
                Cancel
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="card-premium overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> All Departments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : departments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-display font-semibold">No departments yet</p>
              <p className="text-xs text-muted-foreground">Create one to assign employees.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="section-label pl-6">Name</TableHead>
                  <TableHead className="section-label pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="pl-6 font-medium">{d.name}</TableCell>
                    <TableCell className="pr-6 text-right space-x-1">
                      <Button
                        id={`edit-dept-${d.id}`}
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => { setEditingId(d.id); setName(d.name); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        id={`delete-dept-${d.id}`}
                        size="sm"
                        variant="outline"
                        className="h-7 text-destructive"
                        onClick={() => deleteMut.mutate(d.id)}
                      >
                        <Trash2 className="h-3 w-3" />
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
