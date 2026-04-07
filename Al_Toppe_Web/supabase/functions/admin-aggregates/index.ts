import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRole) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const admin = createClient(supabaseUrl, serviceRole);
    const [{ count: users }, { count: coaches }, { count: entrepreneurs }, { count: bailleurs }] =
      await Promise.all([
        admin.from("profiles").select("*", { count: "exact", head: true }),
        admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "coach"),
        admin
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "entrepreneur"),
        admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "bailleur"),
      ]);
    return new Response(
      JSON.stringify({
        total_users: users || 0,
        total_coaches: coaches || 0,
        active_entrepreneurs: entrepreneurs || 0,
        total_bailleurs: bailleurs || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

