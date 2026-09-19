import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getAdminClient, getAuthUser } from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = getAdminClient();
  const user = await getAuthUser(req, supabase);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  let path = url.pathname.replace(/^\/tasks\/?/, "");
  if (path.endsWith("/")) path = path.slice(0, -1);

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. tasks
    if (path === "tasks" || path === "") {
      if (req.method === "GET") {
        let q = supabase
          .from("tasks")
          .select(`
            *,
            assignee:users!tasks_assignee_id_fkey (id, first_name, last_name, email),
            creator:users!tasks_created_by_fkey (id, first_name, last_name)
          `)
          .order("position", { ascending: true })
          .order("created_at", { ascending: false });

        const status = url.searchParams.get("status");
        if (status) q = q.eq("status", status);

        const assignee = url.searchParams.get("assignee");
        if (assignee) q = q.eq("assignee_id", assignee);

        const { data: tasks, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json(tasks || []);
      }

      if (req.method === "POST") {
        const body = await req.json();
        const { data: task, error } = await supabase
          .from("tasks")
          .insert({
            title: body.title,
            description: body.description || null,
            assignee_id: body.assignee_id || user.id,
            created_by: user.id,
            team_id: user.team_id || null,
            priority: body.priority || "MEDIUM",
            status: body.status || "TODO",
            due_date: body.due_date || null,
          })
          .select(`
            *,
            assignee:users!tasks_assignee_id_fkey (id, first_name, last_name, email),
            creator:users!tasks_created_by_fkey (id, first_name, last_name)
          `)
          .single();

        if (error) return json({ error: error.message }, 500);

        await supabase.from("task_activity").insert({
          task_id: task.id,
          actor_id: user.id,
          action: "created",
          details: { title: task.title },
        });

        return json(task);
      }

      if (req.method === "PATCH") {
        const body = await req.json();
        const { id, ...updates } = body;
        const { data: task, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", id)
          .select(`
            *,
            assignee:users!tasks_assignee_id_fkey (id, first_name, last_name, email),
            creator:users!tasks_created_by_fkey (id, first_name, last_name)
          `)
          .single();

        if (error) return json({ error: error.message }, 500);

        await supabase.from("task_activity").insert({
          task_id: id,
          actor_id: user.id,
          action: "updated",
          details: updates,
        });

        return json(task);
      }

      if (req.method === "DELETE") {
        const { id } = await req.json();
        await supabase.from("tasks").delete().eq("id", id);
        return json({ success: true });
      }
    }

    // 2. activity
    if (path === "activity" && req.method === "GET") {
      const taskId = url.searchParams.get("task_id");
      const { data } = await supabase
        .from("task_activity")
        .select("*, actor:users(id, first_name, last_name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      return json(data || []);
    }

    return json({ error: "Not Found" }, 404);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return json({ error: message }, 500);
  }
});
