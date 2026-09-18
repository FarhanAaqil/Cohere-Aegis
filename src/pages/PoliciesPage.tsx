import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { policiesApi } from "@/lib/policies-api";
import { adminApi } from "@/lib/admin-api";
import { useAuth } from "@/contexts/AuthContext";
import { isAdminRole } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollText, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Policy {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function PoliciesPage() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["policies", isAdmin ? "admin" : "all"],
    queryFn: isAdmin ? adminApi.getPolicies : policiesApi.getPolicies,
  });
  const policies: Policy[] = data?.policies ?? [];

  const saveMut = useMutation({
    mutationFn: () =>
      editingId
        ? policiesApi.updatePolicy(editingId, title.trim(), content.trim())
        : policiesApi.createPolicy(title.trim(), content.trim()),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["policies"] });
      setTitle("");
      setContent("");
      setEditingId(null);
      toast({ title: editingId ? "Policy updated" : "Policy published" });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => policiesApi.deletePolicy(id),
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ["policies"] });
      toast({ title: "Policy deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-heading">Policies</h1>
        <p className="page-subheading">Company attendance and HR policies</p>
      </div>

      {isAdmin && (
        <Card className="card-premium">
          <CardHeader>
            <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              {editingId ? "Edit policy" : "New policy"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="policy-title">Title</Label>
              <Input id="policy-title" className="input-premium" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="policy-content">Content</Label>
              <Textarea id="policy-content" className="min-h-[120px]" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button
                id="policy-save"
                disabled={!title.trim() || !content.trim() || saveMut.isPending}
                onClick={() => saveMut.mutate()}
              >
                {saveMut.isPending ? "Saving…" : editingId ? "Update" : "Publish"}
              </Button>
              {editingId && (
                <Button id="policy-cancel" variant="ghost" onClick={() => { setEditingId(null); setTitle(""); setContent(""); }}>
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-premium">
        <CardHeader>
          <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" /> All policies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : policies.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-display font-semibold">No policies yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin ? "Publish the first policy above." : "Check back later."}
              </p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {policies.map((p) => (
                <AccordionItem key={p.id} value={p.id}>
                  <AccordionTrigger className="text-left">{p.title}</AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.content}</p>
                    {isAdmin && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          id={`policy-edit-${p.id}`}
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => { setEditingId(p.id); setTitle(p.title); setContent(p.content); }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          id={`policy-delete-${p.id}`}
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => deleteMut.mutate(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
