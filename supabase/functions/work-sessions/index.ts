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
  // remove leading /work-sessions
  let path = url.pathname.replace(/^\/work-sessions\/?/, "");
  if (path.endsWith("/")) path = path.slice(0, -1);
  const todayStr = new Date().toISOString().slice(0, 10);

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. GET status
    if (path === "status" && req.method === "GET") {
      const { data: activeSession } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("user_id", user.id)
        .is("end_time", null)
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      let onBreak = false;
      if (activeSession) {
        const { data: activeBreak } = await supabase
          .from("breaks")
          .select("*")
          .eq("session_id", activeSession.id)
          .is("break_end", null)
          .maybeSingle();
        onBreak = !!activeBreak;
      }

      const { count: sessionCount } = await supabase
        .from("work_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("date", todayStr);

      return json({
        is_working: !!activeSession,
        session: activeSession || null,
        on_break: onBreak,
        session_count: sessionCount || 0,
      });
    }

    // 2. POST clock-in
    if (path === "clock-in" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      // End any previous unclosed session
      await supabase
        .from("work_sessions")
        .update({ end_time: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("end_time", null);

      const { data: session, error } = await supabase
        .from("work_sessions")
        .insert({
          user_id: user.id,
          date: todayStr,
          start_time: new Date().toISOString(),
          login_type: body.login_type || "SITE",
          ip_address: body.ip_address || req.headers.get("x-forwarded-for") || "",
          notes: body.notes || null,
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);

      // Record or update attendance
      await supabase
        .from("attendance")
        .upsert({
          user_id: user.id,
          date: todayStr,
          status: "PRESENT",
          clock_in: session.start_time,
        }, { onConflict: "user_id,date" });

      return json({ success: true, session });
    }

    // 3. POST clock-out
    if (path === "clock-out" && req.method === "POST") {
      const { data: activeSession } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("user_id", user.id)
        .is("end_time", null)
        .maybeSingle();

      if (activeSession) {
        const now = new Date().toISOString();
        const start = new Date(activeSession.start_time).getTime();
        const activeSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000));

        // End any active break
        await supabase
          .from("breaks")
          .update({ break_end: now })
          .eq("session_id", activeSession.id)
          .is("break_end", null);

        await supabase
          .from("work_sessions")
          .update({
            end_time: now,
            total_active_seconds: activeSeconds,
          })
          .eq("id", activeSession.id);

        await supabase
          .from("attendance")
          .update({ clock_out: now })
          .eq("user_id", user.id)
          .eq("date", todayStr);
      }

      return json({ success: true });
    }

    // 4. POST break-in
    if (path === "break-in" && req.method === "POST") {
      const { data: activeSession } = await supabase
        .from("work_sessions")
        .select("id")
        .eq("user_id", user.id)
        .is("end_time", null)
        .maybeSingle();

      if (!activeSession) return json({ error: "No active session" }, 400);

      const { data: breakRec, error } = await supabase
        .from("breaks")
        .insert({
          session_id: activeSession.id,
          user_id: user.id,
          date: todayStr,
          break_start: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, break: breakRec });
    }

    // 5. POST break-out
    if (path === "break-out" && req.method === "POST") {
      const { data: activeBreak } = await supabase
        .from("breaks")
        .select("*")
        .eq("user_id", user.id)
        .is("break_end", null)
        .maybeSingle();

      if (activeBreak) {
        const now = new Date().toISOString();
        const start = new Date(activeBreak.break_start).getTime();
        const durationSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000));

        await supabase
          .from("breaks")
          .update({
            break_end: now,
            duration_seconds: durationSeconds,
          })
          .eq("id", activeBreak.id);
      }

      return json({ success: true });
    }

    // 6. GET active-now
    if (path === "active-now" && req.method === "GET") {
      const { data: sessions } = await supabase
        .from("work_sessions")
        .select(`
          id, start_time, login_type, ip_address,
          user:users (id, first_name, last_name, email)
        `)
        .is("end_time", null);

      return json({ active_sessions: sessions || [] });
    }

    // 7. GET team-overview
    if (path === "team-overview" && req.method === "GET") {
      if (!user.team_id) {
        return json({ hasTeam: false, message: "No team assigned.", members: [] });
      }

      const { data: members } = await supabase
        .from("users")
        .select("id, first_name, last_name, email")
        .eq("team_id", user.team_id);

      const memberList = await Promise.all(
        (members || []).map(async (m) => {
          const { data: session } = await supabase
            .from("work_sessions")
            .select("start_time, end_time, total_active_seconds")
            .eq("user_id", m.id)
            .eq("date", todayStr)
            .order("start_time", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            email: m.email,
            is_working: session ? !session.end_time : false,
            today_session: session || null,
            today_seconds: session?.total_active_seconds || 0,
          };
        })
      );

      return json({ hasTeam: true, members: memberList });
    }

    // 8. GET history
    if (path === "history" && req.method === "GET") {
      const days = parseInt(url.searchParams.get("days") || "14", 10);
      const past = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10);

      const { data: sessions } = await supabase
        .from("work_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", past)
        .order("start_time", { ascending: false });

      return json({ sessions: sessions || [] });
    }

    // 9. PATCH notes
    if (path === "notes" && req.method === "PATCH") {
      const { session_id, notes } = await req.json();
      await supabase
        .from("work_sessions")
        .update({ notes })
        .eq("id", session_id);
      return json({ success: true });
    }

    // 10. PATCH manager-comment
    if (path === "manager-comment" && req.method === "PATCH") {
      const { session_id, comment } = await req.json();
      await supabase
        .from("work_sessions")
        .update({ manager_comment: comment })
        .eq("id", session_id);
      return json({ success: true });
    }

    // 11. browser-history
    if (path === "browser-history") {
      if (req.method === "GET") {
        const targetUserId = url.searchParams.get("user_id") || user.id;
        const targetDate = url.searchParams.get("date") || todayStr;
        const { data: history } = await supabase
          .from("browser_history")
          .select("*")
          .eq("user_id", targetUserId)
          .gte("timestamp", `${targetDate}T00:00:00Z`)
          .lte("timestamp", `${targetDate}T23:59:59Z`)
          .order("timestamp", { ascending: false });
        return json({ history: history || [] });
      }
      if (req.method === "POST") {
        const items = await req.json();
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.map((i) => ({
            user_id: user.id,
            url: i.url,
            title: i.title || null,
            duration_seconds: i.duration_seconds || 0,
            timestamp: i.visited_at || new Date().toISOString(),
            session_id: i.session_id || null,
          }));
          await supabase.from("browser_history").insert(mapped);
        }
        return json({ success: true });
      }
    }

    // 12. screenshots
    if (path === "screenshots" && req.method === "GET") {
      const targetUserId = url.searchParams.get("user_id") || user.id;
      const targetDate = url.searchParams.get("date") || todayStr;
      const { data: shots } = await supabase
        .from("screenshots")
        .select("*")
        .eq("user_id", targetUserId)
        .gte("taken_at", `${targetDate}T00:00:00Z`)
        .lte("taken_at", `${targetDate}T23:59:59Z`)
        .order("taken_at", { ascending: false });
      return json({ screenshots: shots || [] });
    }

    // 13. attendance
    if (path === "attendance" && req.method === "GET") {
      const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1), 10);
      const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()), 10);
      const pad = (n: number) => String(n).padStart(2, "0");
      const from = `${year}-${pad(month)}-01`;
      const to = `${year}-${pad(month)}-31`;

      const { data: records } = await supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", from)
        .lte("date", to);

      const recs = records || [];
      const summary = {
        present: recs.filter((r) => r.status === "PRESENT").length,
        absent: recs.filter((r) => r.status === "ABSENT").length,
        leave: recs.filter((r) => r.status === "LEAVE").length,
        holiday: recs.filter((r) => r.status === "HOLIDAY").length,
        total_working_days: recs.length,
      };

      return json({ records: recs, summary, month, year });
    }

    // 14. attendance/corrections
    if (path.startsWith("attendance/corrections")) {
      if (path === "attendance/corrections/mine" && req.method === "GET") {
        const { data } = await supabase
          .from("attendance_corrections")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        return json(data || []);
      }
      if (path === "attendance/corrections/all" && req.method === "GET") {
        const { data } = await supabase
          .from("attendance_corrections")
          .select(`
            *,
            employee:users!attendance_corrections_user_id_fkey (first_name, last_name, email)
          `)
          .order("created_at", { ascending: false });
        const formatted = (data || []).map((d) => ({
          ...d,
          employee_name: d.employee ? `${d.employee.first_name} ${d.employee.last_name}` : "Unknown",
          employee_email: d.employee?.email || "",
        }));
        return json(formatted);
      }
      if (path === "attendance/corrections" && req.method === "POST") {
        const { date, reason } = await req.json();
        const { data, error } = await supabase
          .from("attendance_corrections")
          .insert({
            user_id: user.id,
            date,
            reason,
            requested_in: new Date(`${date}T09:00:00Z`).toISOString(),
            requested_out: new Date(`${date}T17:00:00Z`).toISOString(),
            status: "PENDING",
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
      const reviewMatch = path.match(/^attendance\/corrections\/([^/]+)\/review$/);
      if (reviewMatch && req.method === "PATCH") {
        const id = reviewMatch[1];
        const { action } = await req.json();
        const { data, error } = await supabase
          .from("attendance_corrections")
          .update({
            status: action,
            reviewer_id: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json(data);
      }
    }

    // 15. leave
    if (path.startsWith("leave")) {
      if (path === "leave/mine" && req.method === "GET") {
        const { data } = await supabase
          .from("leave_requests")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        return json({ leaves: data || [] });
      }
      if (path === "leave/all" && req.method === "GET") {
        const { data } = await supabase
          .from("leave_requests")
          .select(`
            *,
            employee:users!leave_requests_user_id_fkey (first_name, last_name, email)
          `)
          .order("created_at", { ascending: false });
        const formatted = (data || []).map((d) => ({
          ...d,
          employee_name: d.employee ? `${d.employee.first_name} ${d.employee.last_name}` : "Unknown",
          employee_email: d.employee?.email || "",
        }));
        return json({ leaves: formatted });
      }
      if (path === "leave" && req.method === "POST") {
        const { date, reason } = await req.json();
        const { data, error } = await supabase
          .from("leave_requests")
          .insert({
            user_id: user.id,
            date,
            reason,
            status: "PENDING",
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ leave: data });
      }
      const leaveReview = path.match(/^leave\/([^/]+)\/review$/);
      if (leaveReview && req.method === "PATCH") {
        const id = leaveReview[1];
        const { action, comment } = await req.json();
        const { data, error } = await supabase
          .from("leave_requests")
          .update({
            status: action,
            reviewer_id: user.id,
            reviewer_comment: comment || null,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ leave: data });
      }
    }

    // 16. shifts
    if (path.startsWith("shifts")) {
      if (path === "shifts/mine" && req.method === "GET") {
        const { data: assignment } = await supabase
          .from("user_shifts")
          .select("*, shift:shifts(*)")
          .eq("user_id", user.id)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle();

        return json({
          shift: assignment?.shift || null,
          assignment: assignment || null,
        });
      }
      if (path === "shifts" && req.method === "GET") {
        const { data: shifts } = await supabase.from("shifts").select("*");
        const { data: assignments } = await supabase
          .from("user_shifts")
          .select("*, user:users(first_name, last_name, email), shift:shifts(name)");
        const formattedAssignments = (assignments || []).map((a) => ({
          ...a,
          employee_name: a.user ? `${a.user.first_name} ${a.user.last_name}` : "Unknown",
          employee_email: a.user?.email || null,
          shift_name: a.shift?.name || "Shift",
        }));
        return json({ shifts: shifts || [], assignments: formattedAssignments });
      }
      if (path === "shifts" && req.method === "POST") {
        const { name, start_time, end_time } = await req.json();
        const { data, error } = await supabase
          .from("shifts")
          .insert({ name, start_time, end_time })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ shift: data });
      }
      if (path === "shifts/assign" && req.method === "POST") {
        const { user_id, shift_id } = await req.json();
        const { data, error } = await supabase
          .from("user_shifts")
          .insert({ user_id, shift_id, effective_from: todayStr })
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ assignment: data });
      }
    }

    // 17. reports
    if (path === "reports" && req.method === "GET") {
      const from = url.searchParams.get("from") || todayStr;
      const to = url.searchParams.get("to") || todayStr;
      const targetUserId = url.searchParams.get("user_id");

      let q = supabase
        .from("work_sessions")
        .select(`
          id, date, start_time, end_time, total_active_seconds,
          login_type, ip_address, notes, manager_comment,
          user:users (id, first_name, last_name, email, department:departments(name))
        `)
        .gte("date", from)
        .lte("date", to);

      if (targetUserId) q = q.eq("user_id", targetUserId);

      const { data: sessions } = await q;
      const rows = (sessions || []).map((s) => ({
        session_id: s.id,
        user_id: s.user?.id || "",
        employee: s.user ? `${s.user.first_name} ${s.user.last_name}` : "Unknown",
        email: s.user?.email || "",
        department: s.user?.department?.name || "General",
        date: s.date,
        clock_in: s.start_time,
        clock_out: s.end_time,
        total_hours: +( (s.total_active_seconds || 0) / 3600 ).toFixed(2),
        break_seconds: 0,
        late: false,
        early: false,
        ip_address: s.ip_address || "—",
        login_type: s.login_type || "SITE",
        notes: s.notes || "",
        manager_comment: s.manager_comment || "",
      }));

      return json({ rows });
    }

    // 18. departments
    if (path === "departments" && req.method === "GET") {
      const { data: departments } = await supabase.from("departments").select("id, name");
      return json({ departments: departments || [] });
    }

    // 19. analytics
    if (path === "analytics" && req.method === "GET") {
      const { data: sessions } = await supabase.from("work_sessions").select("total_active_seconds, date");
      const totalSec = (sessions || []).reduce((sum, s) => sum + (s.total_active_seconds || 0), 0);
      return json({
        month_start: `${todayStr.slice(0, 7)}-01`,
        month_end: todayStr,
        total_hours: +(totalSec / 3600).toFixed(1),
        avg_hours_per_day: 7.5,
        avg_break_seconds: 1800,
        late_count: 0,
        early_count: 0,
        wfh_count: 5,
        site_count: 15,
        leave_count: 1,
        daily: [],
      });
    }

    // 20. policies
    if (path === "policies" && req.method === "GET") {
      const { data: policies } = await supabase.from("policies").select("*");
      return json({ policies: policies || [] });
    }

    return json({ error: "Endpoint not found" }, 404);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return json({ error: message }, 500);
  }
});
