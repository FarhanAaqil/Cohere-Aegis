import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  getAdminClient,
  createJwt,
  hashPassword,
  verifyPassword,
  getAuthUser,
} from "../_shared/auth.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/auth\/?/, "");
  const supabase = getAdminClient();

  try {
    // 1. POST /login
    if (path === "login" && req.method === "POST") {
      const { email, password } = await req.json();
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email and password are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: user, error: findError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (findError || !user) {
        return new Response(JSON.stringify({ error: "Invalid email or password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validPassword = await verifyPassword(password, user.password_hash);
      if (!validPassword) {
        return new Response(JSON.stringify({ error: "Invalid email or password" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user.status === "INACTIVE") {
        return new Response(JSON.stringify({ error: "Account is inactive. Contact admin." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await createJwt({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      const { password_hash: _, ...safeUser } = user;
      return new Response(JSON.stringify({ token, user: safeUser }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. POST /signup
    if (path === "signup" && req.method === "POST") {
      const { email, password, first_name, last_name, role } = await req.json();
      if (!email || !password || !first_name || !last_name) {
        return new Response(JSON.stringify({ error: "All fields are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (existing) {
        return new Response(JSON.stringify({ error: "User with this email already exists" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If first user, make ADMIN
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      const finalRole = count === 0 ? "ADMIN" : role || "EMPLOYEE";
      const hashedPassword = await hashPassword(password);

      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          email: email.trim().toLowerCase(),
          password_hash: hashedPassword,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          role: finalRole,
          status: "ACTIVE",
        })
        .select("id, email, first_name, last_name, role, status, job_title, team_id, department_id, monitor_token")
        .single();

      if (createError || !newUser) {
        return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = await createJwt({
        sub: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      return new Response(JSON.stringify({ token, user: newUser }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. GET /me
    if (path === "me" && req.method === "GET") {
      const user = await getAuthUser(req, supabase);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
