import { withSupabase } from "npm:@supabase/server@1";

type Party = {
  id?: string | number;
  nameParty?: string;
  dateStart?: string;
  dateEnd?: string;
  nameTown?: string;
  geoLat?: string | number | null;
  geoLon?: string | number | null;
  urlImageSmall?: string | null;
  nameStatus?: string;
};

function coordinate(value: unknown, min: number, max: number) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) &&
    number >= min && number <= max
    ? number
    : null;
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (_req, ctx) => {
    const url = new URL(
      "https://www.goabase.net/api/party/json/"
    );
    url.searchParams.set("country", "DE");
    url.searchParams.set("eventtype", "club");
    url.searchParams.set("limit", "50");

    const response = await fetch(url);

    if (!response.ok) {
      return Response.json(
        { error: "Goabase API nicht erreichbar" },
        { status: 502 }
      );
    }

    const json = await response.json();

    if (!Array.isArray(json?.partylist)) {
      return Response.json(
        { error: "Unbekanntes Goabase-Datenformat" },
        { status: 502 }
      );
    }

    const now = Date.now();
    const rows = [];

    for (const p of json.partylist as Party[]) {
      const id = String(p.id ?? "");
      const title = p.nameParty?.trim();
      const start = Date.parse(p.dateStart ?? "");

      if (!/^\d+$/.test(id) || !title ||
          !Number.isFinite(start)) continue;

      const end = Date.parse(p.dateEnd ?? "");
      const validEnd = Number.isFinite(end) &&
        end >= start ? end : null;

      const scheduled =
        p.nameStatus?.toLowerCase() === "scheduled";

      const active =
        validEnd !== null ? validEnd >= now : start >= now;

      rows.push({
        source: "goabase",
        source_event_id: id,
        source_url: `https://www.goabase.net/${id}`,
        title,
        city: p.nameTown ?? null,
        category: "club",
        starts_at: new Date(start).toISOString(),
        ends_at: validEnd !== null
          ? new Date(validEnd).toISOString()
          : null,
        latitude: coordinate(p.geoLat, -90, 90),
        longitude: coordinate(p.geoLon, -180, 180),
        image_url: p.urlImageSmall ?? null,
        is_published: Boolean(scheduled && active),
      });
    }

    if (rows.length === 0) {
      return Response.json({
        imported: 0,
        message: "Keine gültigen Events gefunden",
      });
    }

    const { error } = await ctx.supabaseAdmin
      .from("events")
      .upsert(rows, {
        onConflict: "source,source_event_id",
      });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      imported: rows.length,
      message: "Events erfolgreich synchronisiert",
    });
  }),
};
