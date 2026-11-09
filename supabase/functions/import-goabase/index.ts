import { withSupabase } from "npm:@supabase/server@1";
import { synchronize, SyncError } from "./sync.ts";

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "POST erforderlich" }, {
        status: 405, headers: { Allow: "POST" },
      });
    }
    let token: string | undefined;
    const started = Date.now();
    try {
      // No direct-upsert fallback: reviewed database preparation is required.
      const lease = await ctx.supabaseAdmin.rpc("spots_goabase_begin");
      if (lease.error) throw new SyncError("sync_backend_unavailable", 503);
      if (!lease.data) throw new SyncError("sync_already_running", 409);
      token = lease.data.token;
      if (typeof token !== "string" || !Array.isArray(lease.data.ids)) {
        throw new SyncError("invalid_sync_backend", 503);
      }
      const result = await synchronize(lease.data.ids);
      const applied = await ctx.supabaseAdmin.rpc("spots_goabase_apply_v3", {
        p_token: token, p_rows: result.rows, p_removed_ids: result.removed ?? [],
        p_unconfirmed: result.unconfirmed ?? [],
      });
      if (applied.error) throw new SyncError("sync_commit_rejected", 503);
      const report = { run_id: token, ...applied.data,
        discovered: result.discovered,
        checked: result.rows.length + (result.removed?.length ?? 0) + (result.unconfirmed?.length ?? 0),
        unconfirmed: result.unconfirmed ?? [] };
      console.info(JSON.stringify({ sync: "goabase", duration_ms: Date.now() - started, ...report }));
      return Response.json(report);
    } catch (error) {
      const failure = error instanceof SyncError ? error : new SyncError("sync_failed", 500);
      console.error(JSON.stringify({ sync: "goabase", run: token,
        error: failure.message, duration_ms: Date.now() - started,
        ...(failure.diagnostic ? { source: failure.diagnostic } : {}) }));
      return Response.json({ error: failure.message }, { status: failure.status });
    } finally {
      if (token) {
        // Conditional release cannot release a replacement owner's lease.
        try {
          const result = await ctx.supabaseAdmin.rpc("spots_goabase_release", { p_token: token });
          if (result.error) console.error("goabase: lease release failed; expiry will release it");
        } catch { console.error("goabase: lease release failed; expiry will release it"); }
      }
    }
  }),
};
