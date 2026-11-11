import { withSupabase } from "npm:@supabase/server@1";
import { synchronize, SyncError } from "./sync.ts";

// Geschützter POST wie bei import-goabase. Der Schlüssel liegt nur als Function-Secret
// TICKETMASTER_API_KEY vor und erscheint nie in Antworten oder Logs.
export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "POST erforderlich" }, { status: 405, headers: { Allow: "POST" } });
    }
    const apiKey = Deno.env.get("TICKETMASTER_API_KEY") ?? "";
    if (!/^[A-Za-z0-9]{16,64}$/.test(apiKey)) {
      return Response.json({ error: "source_not_configured" }, { status: 503 });
    }
    let token: string | undefined;
    const started = Date.now();
    try {
      const lease = await ctx.supabaseAdmin.rpc("spots_ticketmaster_begin");
      if (lease.error) throw new SyncError("sync_backend_unavailable", 503);
      if (!lease.data) throw new SyncError("sync_already_running", 409);
      token = lease.data.token;
      if (typeof token !== "string" || !Array.isArray(lease.data.ids)) {
        throw new SyncError("invalid_sync_backend", 503);
      }
      const result = await synchronize(lease.data.ids, { apiKey });
      const applied = await ctx.supabaseAdmin.rpc("spots_ticketmaster_apply", {
        p_token: token, p_rows: result.rows, p_removed_ids: result.removed,
        p_unconfirmed_ids: result.unconfirmed,
      });
      if (applied.error) throw new SyncError("sync_commit_rejected", 503);
      const report = { run_id: token, ...applied.data, discovered: result.discovered,
        windows: result.windows, requests: result.requests, rechecked: result.rechecked,
        skipped: result.skipped };
      console.info(JSON.stringify({ sync: "ticketmaster", duration_ms: Date.now() - started, ...report }));
      return Response.json(report);
    } catch (error) {
      const failure = error instanceof SyncError ? error : new SyncError("sync_failed", 500);
      console.error(JSON.stringify({ sync: "ticketmaster", run: token, error: failure.message,
        duration_ms: Date.now() - started }));
      return Response.json({ error: failure.message }, { status: failure.status });
    } finally {
      if (token) {
        // Bedingte Freigabe kann die Sperre eines neuen Besitzers nicht lösen.
        try {
          const result = await ctx.supabaseAdmin.rpc("spots_ticketmaster_release", { p_token: token });
          if (result.error) console.error("ticketmaster: lease release failed; expiry will release it");
        } catch { console.error("ticketmaster: lease release failed; expiry will release it"); }
      }
    }
  }),
};
