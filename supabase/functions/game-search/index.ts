import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GAME_FIELDS = "fields id,name,slug,summary,first_release_date,genres.name,platforms.name,cover.image_id,involved_companies.developer,involved_companies.company.name;";

function publishableKey() {
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    if (keys.default) return keys.default;
  } catch {}
  return Deno.env.get("SUPABASE_ANON_KEY") || "";
}

function safeText(value: unknown) {
  return String(value || "").trim().slice(0, 100).replace(/["\\\r\n]/g, " ").replace(/\s+/g, " ");
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

async function twitchToken(clientId: string, clientSecret: string) {
  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) throw new Error(`Twitch token error ${res.status}`);
  return (await res.json()).access_token as string;
}

async function igdbRequest(endpoint: string, body: string, clientId: string, token: string) {
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: { "Client-ID": clientId, Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`IGDB ${endpoint} error ${res.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return await res.json();
}

function mapGame(g: any) {
  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    release_date: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : null,
    release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    genres: (g.genres || []).map((x: any) => x.name),
    platforms: (g.platforms || []).map((x: any) => x.name),
    summary: g.summary || null,
    developer: (g.involved_companies || []).find((x: any) => x.developer)?.company?.name || null,
    cover_url: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${g.cover.image_id}.jpg` : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = publishableKey();
    if (!key) throw new Error("Clé Supabase publishable indisponible");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, key, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: admin, error: adminError } = await sb.rpc("current_is_admin");
    if (adminError || !admin) return Response.json({ error: "Accès administrateur requis" }, { status: 403, headers: corsHeaders });

    const payload = await req.json();
    const q = safeText(payload?.query);
    const igdbId = Number(payload?.id || 0);
    const mode = payload?.mode === "developer" ? "developer" : "title";
    const limit = clampInt(payload?.limit, 1, 40, 24);
    const offset = clampInt(payload?.offset, 0, 1000, 0);
    if (!igdbId && q.length < 2) throw new Error("Recherche trop courte");

    const clientId = Deno.env.get("TWITCH_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("TWITCH_CLIENT_SECRET") || "";
    if (!clientId || !clientSecret) throw new Error("Secrets Twitch non configurés");
    const token = await twitchToken(clientId, clientSecret);

    if (igdbId) {
      const rows = await igdbRequest("games", `${GAME_FIELDS} where id = ${Math.trunc(igdbId)}; limit 1;`, clientId, token);
      return Response.json({ games: rows.map(mapGame), has_more: false, next_offset: 0, mode: "id" }, { headers: corsHeaders });
    }

    if (mode === "developer") {
      const companies = await igdbRequest("companies", `fields id,name; where name ~ *"${q}"*; limit 10;`, clientId, token);
      if (!companies.length) return Response.json({ games: [], has_more: false, next_offset: offset, mode, matched_developers: [] }, { headers: corsHeaders });

      const companyIds = companies.map((c: any) => Number(c.id)).filter(Boolean);
      const involved = await igdbRequest("involved_companies", `fields game,company; where developer = true & company = (${companyIds.join(",")}); limit 500;`, clientId, token);
      const gameIds = [...new Set(involved.map((x: any) => Number(x.game)).filter(Boolean))];
      if (!gameIds.length) return Response.json({ games: [], has_more: false, next_offset: offset, mode, matched_developers: companies.map((c: any) => c.name) }, { headers: corsHeaders });

      const rows = await igdbRequest("games", `${GAME_FIELDS} where id = (${gameIds.join(",")}); sort first_release_date desc; limit ${limit + 1}; offset ${offset};`, clientId, token);
      const hasMore = rows.length > limit;
      const games = rows.slice(0, limit).map(mapGame);
      return Response.json({ games, has_more: hasMore, next_offset: offset + games.length, mode, matched_developers: companies.map((c: any) => c.name) }, { headers: corsHeaders });
    }

    const rows = await igdbRequest("games", `search "${q}"; ${GAME_FIELDS} limit ${limit + 1}; offset ${offset};`, clientId, token);
    const hasMore = rows.length > limit;
    const games = rows.slice(0, limit).map(mapGame);
    return Response.json({ games, has_more: hasMore, next_offset: offset + games.length, mode, matched_developers: [] }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: String(error?.message || error) }, { status: 500, headers: corsHeaders });
  }
});
