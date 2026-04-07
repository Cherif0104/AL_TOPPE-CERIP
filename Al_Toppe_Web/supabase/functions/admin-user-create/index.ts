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

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const role = String(body.role || "entrepreneur").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const language = String(body.language || "fr").trim().toLowerCase();
    const fullName = String(body.full_name || body.name || "").trim();
    const isActive = body.is_active !== false;

    if (!password || (!email && !phone)) {
      return new Response(
        JSON.stringify({ error: "email/phone et password requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(supabaseUrl, serviceRole);
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: email || undefined,
      phone: phone || undefined,
      password,
      user_metadata: { role, language, full_name: fullName, phone },
      app_metadata: { role },
      email_confirm: true,
      phone_confirm: true,
    });
    if (authError || !created.user) throw authError || new Error("User creation failed");

    const profile = {
      id: created.user.id,
      email: email || null,
      phone: phone || null,
      full_name: fullName || null,
      role,
      language,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };
    const { data: profileData, error: profileError } = await admin
      .from("profiles")
      .upsert(profile)
      .select("*")
      .single();
    if (profileError) throw profileError;

    return new Response(JSON.stringify(profileData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

