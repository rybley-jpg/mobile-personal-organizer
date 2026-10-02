import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DB_API_BASE = "https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1";
const DB_TOKEN_URL = "https://apis.deutschebahn.com/konfigurator-api/oauth2/token";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

async function getDbAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get("DB_API_CLIENT_ID");
  const clientSecret = Deno.env.get("DB_API_CLIENT_SECRET");

  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(DB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) return null;
    const data = await res.json();
    const token = data?.access_token;
    if (!token) return null;

    const expiresIn = data?.expires_in ?? 3600;
    cachedToken = {
      token,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    return token;
  } catch {
    return null;
  }
}

function isDbConfigured(): boolean {
  return !!(Deno.env.get("DB_API_CLIENT_ID") && Deno.env.get("DB_API_CLIENT_SECRET"));
}

async function dbFetch(path: string): Promise<Response | null> {
  const token = await getDbAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${DB_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/xml",
      },
    });
    return res;
  } catch {
    return null;
  }
}

interface StationResult {
  eva: string;
  name: string;
}

async function findStation(query: string): Promise<StationResult | null> {
  const res = await dbFetch(`/station/${encodeURIComponent(query)}`);
  if (!res || !res.ok) return null;

  const xml = await res.text();
  const evaMatch = xml.match(/<eva[^>]*>(\d+)<\/eva>/i) || xml.match(/<eva[^>]*\s+evaNumber="(\d+)"/i);
  const nameMatch = xml.match(/<name[^>]*>([^<]+)<\/name>/i);
  if (!evaMatch) return null;

  return {
    eva: evaMatch[1],
    name: nameMatch ? nameMatch[1] : query,
  };
}

interface TimetableEntry {
  id: string;
  trainNumber: string;
  trainType: string;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  scheduledPlatform: string | null;
  actualDeparture: string | null;
  actualArrival: string | null;
  actualPlatform: string | null;
  changedPlatform: string | null;
  delayDeparture: number | null;
  delayArrival: number | null;
  cancelled: boolean;
}

function parseTimetableXml(xml: string): TimetableEntry[] {
  const entries: TimetableEntry[] = [];

  const sBlockRegex = /<s[^>]*\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/s>/gi;
  let sMatch;
  while ((sMatch = sBlockRegex.exec(xml)) !== null) {
    const id = sMatch[1];
    const sContent = sMatch[2];

    const tnMatch = sContent.match(/<tl[^>]*\s+n="([^"]+)"/i) || sContent.match(/<tl[^>]*\s+trainNumber="([^"]+)"/i);
    const tTypeMatch = sContent.match(/<tl[^>]*\s+c="([^"]+)"/i) || sContent.match(/<tl[^>]*\s+trainType="([^"]+)"/i);
    const trainNumber = tnMatch ? tnMatch[1] : "";
    const trainType = tTypeMatch ? tTypeMatch[1] : "";

    const arMatch = sContent.match(/<ar[^>]*>/i);
    const dpMatch = sContent.match(/<dp[^>]*>/i);

    let scheduledDeparture: string | null = null;
    let scheduledArrival: string | null = null;
    let scheduledPlatform: string | null = null;
    let actualDeparture: string | null = null;
    let actualArrival: string | null = null;
    let actualPlatform: string | null = null;
    let changedPlatform: string | null = null;
    let delayDeparture: number | null = null;
    let delayArrival: number | null = null;
    let cancelled = false;

    if (arMatch) {
      const ar = arMatch[0];
      const arTime = ar.match(/\sct="([^"]+)"/i);
      if (arTime) scheduledArrival = arTime[1];
      const arPlt = ar.match(/\spp="([^"]+)"/i) || ar.match(/\splatform="([^"]+)"/i);
      if (arPlt) scheduledPlatform = arPlt[1];
      const arCPlt = ar.match(/\scp="([^"]+)"/i) || ar.match(/\schangedPlatform="([^"]+)"/i);
      if (arCPlt) changedPlatform = arCPlt[1];
      const arDelay = ar.match(/\sdelay="(\d+)"/i);
      if (arDelay) delayArrival = parseInt(arDelay[1], 10);
      const arCancel = ar.match(/\scancelled="true"/i) || ar.match(/\scancelled="1"/i);
      if (arCancel) cancelled = true;
    }

    if (dpMatch) {
      const dp = dpMatch[0];
      const dpTime = dp.match(/\sct="([^"]+)"/i);
      if (dpTime) scheduledDeparture = dpTime[1];
      const dpPlt = dp.match(/\spp="([^"]+)"/i) || dp.match(/\splatform="([^"]+)"/i);
      if (dpPlt && !scheduledPlatform) scheduledPlatform = dpPlt[1];
      const dpCPlt = dp.match(/\scp="([^"]+)"/i) || dp.match(/\schangedPlatform="([^"]+)"/i);
      if (dpCPlt && !changedPlatform) changedPlatform = dpCPlt[1];
      const dpDelay = dp.match(/\sdelay="(\d+)"/i);
      if (dpDelay) delayDeparture = parseInt(dpDelay[1], 10);
      const dpCancel = dp.match(/\scancelled="true"/i) || dp.match(/\scancelled="1"/i);
      if (dpCancel) cancelled = true;
    }

    entries.push({
      id,
      trainNumber,
      trainType,
      scheduledDeparture,
      scheduledArrival,
      scheduledPlatform,
      actualDeparture,
      actualArrival,
      actualPlatform,
      changedPlatform,
      delayDeparture,
      delayArrival,
      cancelled,
    });
  }

  return entries;
}

async function applyChanges(evaNo: string, entries: TimetableEntry[]): Promise<void> {
  const res = await dbFetch(`/fchg/${evaNo}`);
  if (!res || !res.ok) return;

  const xml = await res.text();
  const sBlockRegex = /<s[^>]*\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/s>/gi;
  let sMatch;
  while ((sMatch = sBlockRegex.exec(xml)) !== null) {
    const id = sMatch[1];
    const sContent = sMatch[2];
    const entry = entries.find((e) => e.id === id);
    if (!entry) continue;

    const arMatch = sContent.match(/<ar[^>]*>/i);
    const dpMatch = sContent.match(/<dp[^>]*>/i);

    if (arMatch) {
      const ar = arMatch[0];
      const arCPlt = ar.match(/\scp="([^"]+)"/i) || ar.match(/\schangedPlatform="([^"]+)"/i);
      if (arCPlt) entry.changedPlatform = arCPlt[1];
      const arCancel = ar.match(/\scancelled="true"/i) || ar.match(/\scancelled="1"/i);
      if (arCancel) entry.cancelled = true;
    }

    if (dpMatch) {
      const dp = dpMatch[0];
      const dpCPlt = dp.match(/\scp="([^"]+)"/i) || dp.match(/\schangedPlatform="([^"]+)"/i);
      if (dpCPlt) entry.changedPlatform = dpCPlt[1];
      const dpCancel = dp.match(/\scancelled="true"/i) || dp.match(/\scancelled="1"/i);
      if (dpCancel) entry.cancelled = true;
    }
  }
}

function normalizeTrainNumber(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase().replace(/^[A-Z]+/, '').trim() || raw;
}

function matchTrainEntry(entries: TimetableEntry[], trainNumber: string): TimetableEntry | null {
  const target = normalizeTrainNumber(trainNumber);
  for (const e of entries) {
    const normalized = normalizeTrainNumber(e.trainNumber);
    if (normalized === target) return e;
    if (e.trainNumber && e.trainNumber.toUpperCase() === trainNumber.toUpperCase()) return e;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!isDbConfigured()) {
      return new Response(JSON.stringify({
        error: "db_api_not_configured",
        message: "DB API ist nicht konfiguriert. Es werden DB_API_CLIENT_ID und DB_API_CLIENT_SECRET als Secrets benötigt.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const trainNumber = url.searchParams.get("train");
    const station = url.searchParams.get("station");
    const date = url.searchParams.get("date");

    if (!trainNumber || !date) {
      return new Response(JSON.stringify({
        error: "Parameter train und date erforderlich",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let stationResult: StationResult | null = null;
    if (station) {
      stationResult = await findStation(station);
    }

    if (!stationResult) {
      return new Response(JSON.stringify({
        error: "station_not_found",
        message: `Bahnhof "${station ?? '?'}" konnte nicht gefunden werden.`,
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dateObj = new Date(date + "T00:00:00");
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dbDate = `${year}${month}${day}`;

    const entries: TimetableEntry[] = [];
    for (let h = 0; h < 24; h++) {
      const hourStr = String(h).padStart(2, '0');
      const res = await dbFetch(`/plan/${stationResult.eva}/${dbDate}/${hourStr}`);
      if (res && res.ok) {
        const xml = await res.text();
        entries.push(...parseTimetableXml(xml));
      }
    }

    if (entries.length === 0) {
      return new Response(JSON.stringify({
        error: "no_timetable",
        message: "Keine Fahrplandaten für diesen Bahnhof an diesem Tag gefunden.",
        station: stationResult.name,
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await applyChanges(stationResult.eva, entries);

    const match = matchTrainEntry(entries, trainNumber);
    if (!match) {
      return new Response(JSON.stringify({
        error: "train_not_found",
        message: `Zug "${trainNumber}" am Bahnhof "${stationResult.name}" am ${date} nicht gefunden.`,
        station: stationResult.name,
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let status: string;
    if (match.cancelled) {
      status = "cancelled";
    } else if ((match.delayDeparture && match.delayDeparture > 0) || (match.delayArrival && match.delayArrival > 0)) {
      status = "delayed";
    } else {
      status = "on_time";
    }

    const delayMinutes = match.delayDeparture ?? match.delayArrival ?? null;
    const platform = match.changedPlatform ?? match.scheduledPlatform ?? null;
    const previousPlatform = match.changedPlatform && match.scheduledPlatform ? match.scheduledPlatform : null;

    return new Response(JSON.stringify({
      status,
      delayMinutes,
      platform,
      previousPlatform,
      scheduledDeparture: match.scheduledDeparture,
      actualDeparture: match.actualDeparture,
      scheduledArrival: match.scheduledArrival,
      actualArrival: match.actualArrival,
      cancelled: match.cancelled,
      lastUpdated: new Date().toISOString(),
      station: stationResult.name,
      source: "db_timetables",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return new Response(
      JSON.stringify({ error: "internal_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
