import { corsHeaders } from "../_shared/cors.ts";

function detectIntent(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("financ") || t.includes("budget") || t.includes("cout")) return "finance";
  if (t.includes("client") || t.includes("vente") || t.includes("market")) return "commercial";
  if (t.includes("coach") || t.includes("session") || t.includes("accompagnement")) return "coaching";
  return "general";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim();
    const intent = detectIntent(text);
    const voiceResponse = text
      ? `Intention detectee: ${intent}. Prochaine etape: preciser objectif, echeance et indicateur de succes.`
      : "";
    return new Response(
      JSON.stringify({
        success: true,
        intent,
        voice_response: voiceResponse,
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

