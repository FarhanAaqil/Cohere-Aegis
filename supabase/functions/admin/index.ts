import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getAdminClient, getAuthUser, hashPassword } from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = getAdminClient();
  const user = await getAuthUser(req, supabase);
  if (!user || (user.role !== "ADMIN" && user.role !== "HR_MANAGER")) {
    return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  let path = url.pathname.replace(/^\/admin\/?/, "");
  if (path.endsWith("/")) path = path.slice(0, -1);

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. stats
    if (path === "stats" && req.method === "GET") {
      const { count: usersCount } = await supabase.from("users").select("*", { count: "exact", head: true });
      const { count: teamsCount } = await supabase.from("teams").select("*", { count: "exact", head: true });
      const { count: activeCount } = await supabase.from("work_sessions").select("*", { count: "exact", head: true }).is("end_time", null);

      return json({
        total_users: usersCount || 0,
        total_teams: teamsCount || 0,
        active_now: activeCount || 0,
        system_status: "HEALTHY",
      });
    }

    // 2. users
    if (path === "users") {
      if (req.method === "GET") {
        const { data: users } = await supabase
          .from("users")
          .select(`
            id, email, first_name, last_name, role, status, job_title, team_id, department_id, monitor_token, created_at,
            team:teams(name), department:departments(name)
          `)
          .order("created_at", { ascending: false });

        return json({ users: users || [] });
      }
      if (req.method === "POST") {
        const body = await req.json();
        const hashedPassword = await hashPassword(body.password || "Password123!");
        const { data, error } = await supabase
          .from("users")
          .insert({
            email: body.email.trim().toLowerCase(),
            password_hash: hashedPassword,
            first_name: body.first_name.trim(),
            last_name: body.last_name.trim(),
            role: body.role || "EMPLOYEE",
            status: body.status || "ACTIVE",
            job_title: body.job_title || null,
            team_id: body.team_id || null,
            department_id: body.department_id || null,
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, 500);
        const { password_hash: _, ...safe } = data;
        return json({ user: safe });
      }
    }

    const userMatch = path.match(/^users\/([^/]+)$/);
    if (userMatch && req.method === "PUT") {
      const id = userMatch[1];
      const body = await req.json();
      const updates: Record<string, unknown> = { ...body };
      if (body.password) {
        updates.password_hash = await hashPassword(body.password);
        delete updates.password;
      }
      const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ user: data });
    }

    // 3. teams
    if (path === "teams") {
      if (req.method === "GET") {
        const { data } = await supabase.from("teams").select("*, manager:users!fk_teams_manager(first_name, last_name, email)");
        return json({ teams: data || [] });
      }
      if (req.method === "POST") {
        const body = await req.json();
        const { data, error } = await supabase.from("teams").insert(body).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ team: data });
      }
    }

    const teamMatch = path.match(/^teams\/([^/]+)$/);
    if (teamMatch && req.method === "PUT") {
      const id = teamMatch[1];
      const body = await req.json();
      const { data, error } = await supabase.from("teams").update(body).eq("id", id).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ team: data });
    }

    const teamMembersMatch = path.match(/^teams\/([^/]+)\/members$/);
    if (teamMembersMatch) {
      const teamId = teamMembersMatch[1];
      if (req.method === "GET") {
        const { data } = await supabase.from("users").select("id, first_name, last_name, email, role").eq("team_id", teamId);
        return json({ members: data || [] });
      }
      if (req.method === "POST") {
        const { user_ids } = await req.json();
        if (Array.isArray(user_ids)) {
          await supabase.from("users").update({ team_id: teamId }).in("id", user_ids);
        }
        return json({ success: true });
      }
      if (req.method === "DELETE") {
        const { user_id } = await req.json();
        await supabase.from("users").update({ team_id: null }).eq("id", user_id);
        return json({ success: true });
      }
    }

    // 4. departments
    if (path === "departments") {
      if (req.method === "GET") {
        const { data } = await supabase.from("departments").select("*");
        return json({ departments: data || [] });
      }
      if (req.method === "POST") {
        const { name } = await req.json();
        const { data, error } = await supabase.from("departments").insert({ name }).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ department: data });
      }
    }

    const deptMatch = path.match(/^departments\/([^/]+)$/);
    if (deptMatch) {
      const id = deptMatch[1];
      if (req.method === "PUT") {
        const { name } = await req.json();
        const { data, error } = await supabase.from("departments").update({ name }).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ department: data });
      }
      if (req.method === "DELETE") {
        await supabase.from("departments").delete().eq("id", id);
        return json({ success: true });
      }
    }

    // 5. policies
    if (path === "policies") {
      if (req.method === "GET") {
        const { data } = await supabase.from("policies").select("*");
        return json({ policies: data || [] });
      }
      if (req.method === "POST") {
        const { title, content } = await req.json();
        const { data, error } = await supabase.from("policies").insert({ title, content }).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ policy: data });
      }
    }

    const policyMatch = path.match(/^policies\/([^/]+)$/);
    if (policyMatch) {
      const id = policyMatch[1];
      if (req.method === "PUT") {
        const { title, content } = await req.json();
        const { data, error } = await supabase.from("policies").update({ title, content }).eq("id", id).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ policy: data });
      }
      if (req.method === "DELETE") {
        await supabase.from("policies").delete().eq("id", id);
        return json({ success: true });
      }
    }

    // 6. ip-ranges
    if (path === "ip-ranges") {
      if (req.method === "GET") {
        const { data } = await supabase.from("ip_configs").select("*");
        return json({ ranges: data || [] });
      }
      if (req.method === "POST") {
        const { cidr, label } = await req.json();
        const { data, error } = await supabase.from("ip_configs").insert({ cidr, label }).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ range: data });
      }
    }

    const ipMatch = path.match(/^ip-ranges\/([^/]+)$/);
    if (ipMatch && req.method === "DELETE") {
      const id = ipMatch[1];
      await supabase.from("ip_configs").delete().eq("id", id);
      return json({ success: true });
    }

    // 7. audit-logs
    if (path === "audit-logs" && req.method === "GET") {
      const { data } = await supabase
        .from("audit_logs")
        .select("*, user:users(first_name, last_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      return json({ logs: data || [] });
    }

    return json({ error: "Not Found" }, 404);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return json({ error: message }, 500);
  }
});
