import { corsHeaders } from "../_shared/cors.ts";

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function tinyPdf(lines: string[]): Uint8Array {
  const body = lines.map((line, i) => `BT /F1 12 Tf 50 ${780 - i * 18} Td (${esc(line)}) Tj ET`).join("\n");
  const stream = `q\n${body}\nQ`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const xref: number[] = [0];
  objects.forEach((o) => {
    xref.push(pdf.length);
    pdf += `${o}\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${xref.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < xref.length; i += 1) {
    pdf += `${String(xref[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const entrepreneurId = String(body.entrepreneurId || body.entrepreneur_id || "");
    const startDate = String(body.startDate || body.start_date || "");
    const endDate = String(body.endDate || body.end_date || "");
    const bytes = tinyPdf([
      "AL TOPPE - Rapport financier",
      `Entrepreneur: ${entrepreneurId || "-"}`,
      `Periode: ${startDate || "-"} -> ${endDate || "-"}`,
      `Genere le: ${new Date().toISOString()}`,
    ]);
    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapport-financier-${entrepreneurId || "x"}.pdf"`,
      },
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

