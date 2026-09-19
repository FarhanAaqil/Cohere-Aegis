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
  let path = url.pathname.replace(/^\/chat\/?/, "");
  if (path.endsWith("/")) path = path.slice(0, -1);

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. GET groups / POST groups
    if (path === "groups") {
      if (req.method === "GET") {
        const { data: memberRows } = await supabase
          .from("chat_group_members")
          .select("group_id")
          .eq("user_id", user.id);

        const groupIds = (memberRows || []).map((m) => m.group_id);
        if (groupIds.length === 0) return json({ groups: [] });

        const { data: groups } = await supabase
          .from("chat_groups")
          .select("*")
          .in("id", groupIds)
          .order("created_at", { ascending: false });

        return json({ groups: groups || [] });
      }
      if (req.method === "POST") {
        const { name, description, group_type, member_ids } = await req.json();
        const { data: group, error } = await supabase
          .from("chat_groups")
          .insert({
            name,
            description: description || null,
            group_type: group_type || "GENERAL",
            created_by: user.id,
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, 500);

        // Add creator as ADMIN member
        await supabase.from("chat_group_members").insert({
          group_id: group.id,
          user_id: user.id,
          role: "ADMIN",
        });

        if (Array.isArray(member_ids)) {
          const others = member_ids
            .filter((id) => id !== user.id)
            .map((id) => ({
              group_id: group.id,
              user_id: id,
              role: "MEMBER",
            }));
          if (others.length > 0) {
            await supabase.from("chat_group_members").insert(others);
          }
        }

        return json({ group });
      }
    }

    // 2. direct message group
    if (path === "direct" && req.method === "POST") {
      const { target_user_id } = await req.json();
      const { data: targetUser } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", target_user_id)
        .single();

      const name = targetUser
        ? `${targetUser.first_name} ${targetUser.last_name}`
        : "Direct Chat";

      const { data: group } = await supabase
        .from("chat_groups")
        .insert({
          name,
          group_type: "DIRECT",
          created_by: user.id,
        })
        .select()
        .single();

      await supabase.from("chat_group_members").insert([
        { group_id: group.id, user_id: user.id, role: "MEMBER" },
        { group_id: group.id, user_id: target_user_id, role: "MEMBER" },
      ]);

      return json({ group, created: true });
    }

    // 3. groups/:id/members
    const membersMatch = path.match(/^groups\/([^/]+)\/members$/);
    if (membersMatch) {
      const groupId = membersMatch[1];
      if (req.method === "GET") {
        const { data: members } = await supabase
          .from("chat_group_members")
          .select("id, user_id, role, joined_at, user:users(id, email, first_name, last_name)")
          .eq("group_id", groupId);
        return json({ members: members || [] });
      }
      if (req.method === "POST") {
        const { user_ids } = await req.json();
        const inserts = (user_ids || []).map((id: string) => ({
          group_id: groupId,
          user_id: id,
          role: "MEMBER",
        }));
        await supabase.from("chat_group_members").insert(inserts);
        return json({ success: true });
      }
      if (req.method === "DELETE") {
        const { user_id } = await req.json();
        await supabase
          .from("chat_group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", user_id);
        return json({ success: true });
      }
    }

    // 4. groups/:id/messages
    const messagesMatch = path.match(/^groups\/([^/]+)\/messages$/);
    if (messagesMatch) {
      const groupId = messagesMatch[1];
      if (req.method === "GET") {
        const limit = parseInt(url.searchParams.get("limit") || "50", 10);
        const { data: messages } = await supabase
          .from("chat_messages")
          .select("id, group_id, sender_id, message_text, created_at, edited_at, is_deleted, sender:users(id, email, first_name, last_name)")
          .eq("group_id", groupId)
          .order("created_at", { ascending: true })
          .limit(limit);

        return json({ messages: messages || [] });
      }
      if (req.method === "POST") {
        const { message_text } = await req.json();
        const { data: msg, error } = await supabase
          .from("chat_messages")
          .insert({
            group_id: groupId,
            sender_id: user.id,
            message_text,
          })
          .select("id, group_id, sender_id, message_text, created_at, edited_at, is_deleted, sender:users(id, email, first_name, last_name)")
          .single();

        if (error) return json({ error: error.message }, 500);
        return json({ message: msg });
      }
    }

    // 5. search
    if (path === "search" && req.method === "GET") {
      const q = url.searchParams.get("q") || "";
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("id, group_id, sender_id, message_text, created_at, sender:users(id, email, first_name, last_name), group:chat_groups(id, name, group_type)")
        .ilike("message_text", `%${q}%`)
        .limit(30);

      return json({ messages: messages || [] });
    }

    return json({ error: "Not Found" }, 404);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return json({ error: message }, 500);
  }
});
