type ExportRow = Record<string, string | number | boolean | null | undefined>;

function sanitize(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/"/g, '""');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportRowsAsCsv(filename: string, rows: ExportRow[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map((h) => `"${sanitize(h)}"`).join(","),
    ...rows.map((r) => headers.map((h) => `"${sanitize(r[h])}"`).join(",")),
  ].join("\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    filename.endsWith(".csv") ? filename : `${filename}.csv`,
  );
}

export function exportRowsAsExcel(filename: string, rows: ExportRow[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const tsv = [
    headers.join("\t"),
    ...rows.map((r) => headers.map((h) => sanitize(r[h])).join("\t")),
  ].join("\n");
  triggerDownload(
    new Blob([tsv], { type: "application/vnd.ms-excel;charset=utf-8" }),
    filename.endsWith(".xls") ? filename : `${filename}.xls`,
  );
}

export function exportTextAsSimplePdf(filename: string, title: string, lines: string[]): void {
  const safeLines = lines.filter(Boolean).slice(0, 120);
  const escaped = [title, "", ...safeLines]
    .map((l) => String(l).replace(/[()\\]/g, "\\$&"))
    .join("\\n");
  const content = `BT /F1 11 Tf 40 780 Td (${escaped}) Tj ET`;
  const pdf = `%PDF-1.3
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length ${content.length}>> stream
${content}
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000062 00000 n 
0000000119 00000 n 
0000000270 00000 n 
0000000368 00000 n 
trailer <</Root 1 0 R /Size 6>>
startxref
448
%%EOF`;

  triggerDownload(
    new Blob([pdf], { type: "application/pdf" }),
    filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
  );
}
