import { withSupabase } from "npm:@supabase/server@1";

// Aufräumen im Speicher, stündlich über den Zeitplan aus SQL 31. Geschützter POST wie bei den Importen:
// nur mit dem geheimen Projektschlüssel. Antworten und Logs enthalten nur Zahlen.
//  1) Abgelaufene Shots (älter als 24 Stunden plus eine Stunde Puffer): zuerst die Dateien im privaten Bucket
//     live-snaps, dann die Zeilen (SQL 30).
//  2) Verwaiste Bilder im öffentlichen Bucket organizer-public (SQL 36): ersetzte Logos und Flyer, abgebrochene
//     Uploads. Fehlt SQL 36 in einem Projekt, wird dieser Teil übersprungen.
const SNAP_BUCKET = "live-snaps";
const PUBLIC_BUCKET = "organizer-public";
const BATCH = 500;

type Admin = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string } | null }>;
  storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<{ data: unknown[] | null; error: unknown }> } };
};

async function cleanSnaps(admin: Admin) {
  const listed = await admin.rpc("spots_snaps_cleanup_list", { p_limit: BATCH });
  if (listed.error || !Array.isArray(listed.data)) return { error: "cleanup_backend_unavailable" };
  const rows = (listed.data as { id: unknown; storage_path: unknown }[])
    .filter((row): row is { id: string; storage_path: string } => typeof row.id === "string" && typeof row.storage_path === "string");
  if (rows.length === 0) return { expired: 0, files_removed: 0, rows_removed: 0, more: false };
  // Fehlende Dateien sind kein Fehler: dann gibt es nichts zu löschen, die Zeile darf trotzdem weg.
  const removed = await admin.storage.from(SNAP_BUCKET).remove(rows.map((row) => row.storage_path));
  if (removed.error) return { error: "storage_unavailable", expired: rows.length };
  const deleted = await admin.rpc("spots_snaps_cleanup_delete", { p_ids: rows.map((row) => row.id) });
  if (deleted.error) return { error: "cleanup_delete_rejected", expired: rows.length };
  return { expired: rows.length, files_removed: removed.data?.length ?? 0, rows_removed: Number(deleted.data) || 0, more: rows.length === BATCH };
}

async function cleanPublicMedia(admin: Admin) {
  const listed = await admin.rpc("spots_public_media_orphans", { p_limit: BATCH });
  // SQL 36 noch nicht eingespielt: nichts zu tun.
  if (listed.error && (listed.error.code === "PGRST202" || listed.error.code === "42883")) return { skipped: true };
  if (listed.error || !Array.isArray(listed.data)) return { error: "media_backend_unavailable" };
  // Nur Pfade im Ordner eines Veranstalters (<uuid>/<datei>), nie etwas anderes.
  const names = (listed.data as { name: unknown }[]).map((row) => row.name)
    .filter((name): name is string => typeof name === "string" && /^[0-9a-f-]{36}\/[^/]{1,200}$/.test(name));
  if (names.length === 0) return { orphans: 0, files_removed: 0, more: false };
  const removed = await admin.storage.from(PUBLIC_BUCKET).remove(names);
  if (removed.error) return { error: "storage_unavailable", orphans: names.length };
  return { orphans: names.length, files_removed: removed.data?.length ?? 0, more: names.length === BATCH };
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "POST erforderlich" }, { status: 405, headers: { Allow: "POST" } });
    }
    const started = Date.now();
    const admin = ctx.supabaseAdmin as unknown as Admin;
    const snaps = await cleanSnaps(admin);
    const media = await cleanPublicMedia(admin);
    const failed = "error" in snaps || "error" in media;
    const report = { snaps, media };
    console[failed ? "error" : "info"](JSON.stringify({ cleanup: "storage", duration_ms: Date.now() - started, ...report }));
    return Response.json(report, { status: failed ? 503 : 200 });
  }),
};
