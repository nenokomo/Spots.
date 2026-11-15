import { withSupabase } from "npm:@supabase/server@1";

// Löscht abgelaufene Shots (älter als 24 Stunden plus eine Stunde Puffer): zuerst die Dateien im
// privaten Bucket live-snaps, dann die Zeilen (SQL 30). Geschützter POST wie bei den Importen:
// nur mit dem geheimen Projektschlüssel (Zeitplan aus SQL 31). Antworten und Logs enthalten nur Zahlen.
const BUCKET = "live-snaps";
const BATCH = 500;

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "POST erforderlich" }, { status: 405, headers: { Allow: "POST" } });
    }
    const started = Date.now();
    const listed = await ctx.supabaseAdmin.rpc("spots_snaps_cleanup_list", { p_limit: BATCH });
    if (listed.error || !Array.isArray(listed.data)) {
      console.error(JSON.stringify({ cleanup: "snaps", error: "cleanup_backend_unavailable" }));
      return Response.json({ error: "cleanup_backend_unavailable" }, { status: 503 });
    }
    const rows = (listed.data as { id: unknown; storage_path: unknown }[])
      .filter((row): row is { id: string; storage_path: string } => typeof row.id === "string" && typeof row.storage_path === "string");
    if (rows.length === 0) return Response.json({ expired: 0, files_removed: 0, rows_removed: 0 });

    // Fehlende Dateien sind kein Fehler: dann gibt es nichts zu löschen, die Zeile darf trotzdem weg.
    const removed = await ctx.supabaseAdmin.storage.from(BUCKET).remove(rows.map((row) => row.storage_path));
    if (removed.error) {
      console.error(JSON.stringify({ cleanup: "snaps", error: "storage_unavailable", expired: rows.length }));
      return Response.json({ error: "storage_unavailable" }, { status: 503 });
    }
    const deleted = await ctx.supabaseAdmin.rpc("spots_snaps_cleanup_delete", { p_ids: rows.map((row) => row.id) });
    if (deleted.error) {
      console.error(JSON.stringify({ cleanup: "snaps", error: "cleanup_delete_rejected", expired: rows.length }));
      return Response.json({ error: "cleanup_delete_rejected" }, { status: 503 });
    }
    const report = { expired: rows.length, files_removed: removed.data?.length ?? 0, rows_removed: Number(deleted.data) || 0,
      more: rows.length === BATCH };
    console.info(JSON.stringify({ cleanup: "snaps", duration_ms: Date.now() - started, ...report }));
    return Response.json(report);
  }),
};
