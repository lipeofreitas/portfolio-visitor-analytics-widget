const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:8123",
  "http://localhost:8123",
  "https://lipeofreitas.github.io"
]);

const DEFAULT_SITE_ID = "portfolio";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request) });
    }

    try {
      if (url.pathname === "/health" && request.method === "GET") {
        return jsonResponse(request, { ok: true, service: "visitor-analytics" });
      }

      if (url.pathname === "/track" && request.method === "POST") {
        return trackVisit(request, env);
      }

      if (url.pathname === "/summary" && request.method === "GET") {
        return getSummary(request, env);
      }

      return jsonResponse(request, { error: "Not found" }, 404);
    } catch (error) {
      return jsonResponse(request, { error: "Internal server error" }, 500);
    }
  }
};

async function trackVisit(request, env) {
  assertBindings(env);

  const payload = await request.json().catch(() => null);
  const siteId = sanitizeSiteId(payload?.siteId || DEFAULT_SITE_ID);
  const visitorId = String(payload?.visitorId || "").trim();

  if (!siteId) {
    return jsonResponse(request, { error: "Invalid siteId" }, 400);
  }

  if (visitorId.length < 16) {
    return jsonResponse(request, { error: "Invalid visitorId" }, 400);
  }

  const country = normalizeCountry(request.cf?.country);
  const visitorHash = await hashVisitorId(siteId, visitorId, env.VISITOR_HASH_SALT);

  await env.DB.prepare(`
    INSERT INTO visitors (
      site_id,
      visitor_hash,
      first_country,
      last_country,
      first_seen_at,
      last_seen_at,
      visit_count
    )
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
    ON CONFLICT(site_id, visitor_hash)
    DO UPDATE SET
      last_country = excluded.last_country,
      last_seen_at = CURRENT_TIMESTAMP,
      visit_count = visitors.visit_count + 1
  `)
    .bind(siteId, visitorHash, country, country)
    .run();

  const summary = await loadSummary(env, siteId);

  return jsonResponse(request, {
    ok: true,
    siteId,
    ...summary
  });
}

async function getSummary(request, env) {
  assertBindings(env);

  const url = new URL(request.url);
  const siteId = sanitizeSiteId(url.searchParams.get("siteId") || DEFAULT_SITE_ID);

  if (!siteId) {
    return jsonResponse(request, { error: "Invalid siteId" }, 400);
  }

  const summary = await loadSummary(env, siteId);

  return jsonResponse(request, {
    ok: true,
    siteId,
    ...summary
  });
}

async function loadSummary(env, siteId) {
  const countResult = await env.DB.prepare(`
    SELECT COUNT(*) AS unique_visits
    FROM visitors
    WHERE site_id = ?
  `)
    .bind(siteId)
    .first();

  const topCountriesResult = await env.DB.prepare(`
    SELECT first_country AS country, COUNT(*) AS visits
    FROM visitors
    WHERE site_id = ?
    GROUP BY first_country
    ORDER BY visits DESC, first_country ASC
    LIMIT 5
  `)
    .bind(siteId)
    .all();

  const wowResult = await env.DB.prepare(`
    WITH reference AS (
      SELECT datetime('now', '-' || strftime('%w', 'now') || ' days', 'start of day') AS reference_start
    )
    SELECT
      COUNT(*) AS new_visitors,
      reference.reference_start AS reference_start
    FROM visitors
    CROSS JOIN reference
    WHERE site_id = ?
      AND first_seen_at >= reference.reference_start
  `)
    .bind(siteId)
    .first();

  const newVisitors = Number(wowResult?.new_visitors || 0);
  const referenceStart = wowResult?.reference_start || null;

  return {
    uniqueVisits: Number(countResult?.unique_visits || 0),
    wow: {
      change: newVisitors,
      newVisitors,
      reference: "last_sunday",
      referenceStart,
      trend: newVisitors > 0 ? "up" : "flat"
    },
    countries: (topCountriesResult.results || []).map((row) => ({
      country: row.country,
      visits: Number(row.visits || 0)
    }))
  };
}

async function hashVisitorId(siteId, visitorId, salt) {
  if (!salt) {
    throw new Error("Missing VISITOR_HASH_SALT secret");
  }

  const value = `${siteId}:${visitorId}:${salt}`;
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeSiteId(value) {
  const siteId = String(value || "").trim().toLowerCase();
  return /^[a-z0-9_-]{3,50}$/.test(siteId) ? siteId : null;
}

function normalizeCountry(country) {
  const value = String(country || "XX").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : "XX";
}

function assertBindings(env) {
  if (!env.DB) {
    throw new Error("Missing DB binding");
  }
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://lipeofreitas.github.io";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}
