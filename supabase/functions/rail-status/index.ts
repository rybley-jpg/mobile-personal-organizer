import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// DB Timetables API v1 — auth: Basic (client_id:client_secret)
const DB_API_BASE = "https://apis.deutschebahn.com/db-api-marketplace/apis/timetables/v1";

let lastDiagnostic: { step: string; detail: string } | null = null;

function isDbConfigured(): boolean {
  return !!(Deno.env.get("DB_API_CLIENT_ID") && Deno.env.get("DB_API_CLIENT_SECRET"));
}

async function dbFetch(path: string): Promise<{ ok: boolean; status: number; text: string } | null> {
  const clientId = Deno.env.get("DB_API_CLIENT_ID");
  const clientSecret = Deno.env.get("DB_API_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const authHeaders = [
    { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, Accept: "application/xml" },
    { Authorization: `Bearer ${clientSecret}`, Accept: "application/xml" },
    { Authorization: `Bearer ${clientId}`, Accept: "application/xml" },
  ];

  for (let i = 0; i < authHeaders.length; i++) {
    try {
      const res = await fetch(`${DB_API_BASE}${path}`, { headers: authHeaders[i] });
      const text = await res.text();
      if (res.ok) {
        return { ok: true, status: res.status, text };
      }
      if (res.status === 401 && i < authHeaders.length - 1) {
        continue;
      }
      lastDiagnostic = { step: `fetch ${path} (auth method ${i + 1})`, detail: `HTTP ${res.status}: ${text.slice(0, 300)}` };
      return { ok: false, status: res.status, text };
    } catch (err) {
      lastDiagnostic = { step: `fetch ${path}`, detail: `Exception: ${err instanceof Error ? err.message : String(err)}` };
      return null;
    }
  }

  return null;
}

interface StationResult {
  eva: string;
  name: string;
}

async function findStation(query: string): Promise<StationResult | null> {
  const result = await dbFetch(`/station/${encodeURIComponent(query)}`);
  if (!result) return null;
  if (!result.ok) {
    lastDiagnostic = { step: `station`, detail: `HTTP ${result.status}: ${result.text.slice(0, 300)}` };
    return null;
  }

  const xml = result.text;

  // Format 1: <station eva="8000105" name="Frankfurt(Main)Hbf" .../>
  const attrMatch = xml.match(/<station[^>]*\seva="(\d+)"[^>]*>/i);
  if (attrMatch) {
    const nameAttr = xml.match(/<station[^>]*\sname="([^"]+)"/i);
    return { eva: attrMatch[1], name: nameAttr ? nameAttr[1] : query };
  }

  // Format 2: <eva>8000105</eva> as child element
  const childEvaMatch = xml.match(/<eva[^>]*>(\d+)<\/eva>/i);
  if (childEvaMatch) {
    const childNameMatch = xml.match(/<name[^>]*>([^<]+)<\/name>/i);
    return { eva: childEvaMatch[1], name: childNameMatch ? childNameMatch[1] : query };
  }

  // Format 3: try to find any evaNumber attribute
  const evaNumAttr = xml.match(/evaNumber="(\d+)"/i);
  if (evaNumAttr) {
    const nameAttr = xml.match(/name="([^"]+)"/i) || xml.match(/<name[^>]*>([^<]+)<\/name>/i);
    return { eva: evaNumAttr[1], name: nameAttr ? nameAttr[1] : query };
  }

  lastDiagnostic = { step: `station parse`, detail: `XML konnte nicht geparst werden. Erste 300 Zeichen: ${xml.slice(0, 300)}` };
  return null;
}

interface TimetableEntry {
  id: string;
  trainNumber: string;
  trainType: string;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  scheduledPlatform: string | null;
  changedDeparture: string | null;
  changedArrival: string | null;
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

    const tnMatch = sContent.match(/<tl[^>]*\s+n="([^"]+)"/i);
    const tTypeMatch = sContent.match(/<tl[^>]*\s+c="([^"]+)"/i);
    const trainNumber = tnMatch ? tnMatch[1] : "";
    const trainType = tTypeMatch ? tTypeMatch[1] : "";

    const arMatch = sContent.match(/<ar[^>]*\/?>/i);
    const dpMatch = sContent.match(/<dp[^>]*\/?>/i);

    let scheduledDeparture: string | null = null;
    let scheduledArrival: string | null = null;
    let scheduledPlatform: string | null = null;
    let changedDeparture: string | null = null;
    let changedArrival: string | null = null;
    let changedPlatform: string | null = null;
    let delayDeparture: number | null = null;
    let delayArrival: number | null = null;
    let cancelled = false;

    if (arMatch) {
      const ar = arMatch[0];
      const arPt = ar.match(/\spt="([^"]+)"/i);
      if (arPt) scheduledArrival = arPt[1];
      const arCt = ar.match(/\sct="([^"]+)"/i);
      if (arCt) changedArrival = arCt[1];
      const arPp = ar.match(/\spp="([^"]+)"/i);
      if (arPp) scheduledPlatform = arPp[1];
      const arCp = ar.match(/\scp="([^"]+)"/i);
      if (arCp) changedPlatform = arCp[1];
      const arDelay = ar.match(/\sdelay="(-?\d+)"/i);
      if (arDelay) delayArrival = parseInt(arDelay[1], 10);
      const arCancel = ar.match(/\scancelled="true"/i) || ar.match(/\scancelled="1"/i);
      if (arCancel) cancelled = true;
    }

    if (dpMatch) {
      const dp = dpMatch[0];
      const dpPt = dp.match(/\spt="([^"]+)"/i);
      if (dpPt) scheduledDeparture = dpPt[1];
      const dpCt = dp.match(/\sct="([^"]+)"/i);
      if (dpCt) changedDeparture = dpCt[1];
      const dpPp = dp.match(/\spp="([^"]+)"/i);
      if (dpPp && !scheduledPlatform) scheduledPlatform = dpPp[1];
      const dpCp = dp.match(/\scp="([^"]+)"/i);
      if (dpCp && !changedPlatform) changedPlatform = dpCp[1];
      const dpDelay = dp.match(/\sdelay="(-?\d+)"/i);
      if (dpDelay) delayDeparture = parseInt(dpDelay[1], 10);
      const dpCancel = dp.match(/\scancelled="true"/i) || dp.match(/\scancelled="1"/i);
      if (dpCancel) cancelled = true;
    }

    entries.push({
      id, trainNumber, trainType,
      scheduledDeparture, scheduledArrival, scheduledPlatform,
      changedDeparture, changedArrival, changedPlatform,
      delayDeparture, delayArrival, cancelled,
    });
  }

  return entries;
}

async function applyChanges(evaNo: string, entries: TimetableEntry[]): Promise<void> {
  const result = await dbFetch(`/fchg/${evaNo}`);
  if (!result || !result.ok) return;

  const xml = result.text;
  const sBlockRegex = /<s[^>]*\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/s>/gi;
  let sMatch;
  while ((sMatch = sBlockRegex.exec(xml)) !== null) {
    const id = sMatch[1];
    const sContent = sMatch[2];
    const entry = entries.find((e) => e.id === id);
    if (!entry) continue;

    const arMatch = sContent.match(/<ar[^>]*\/?>/i);
    const dpMatch = sContent.match(/<dp[^>]*\/?>/i);

    if (arMatch) {
      const ar = arMatch[0];
      const arCp = ar.match(/\scp="([^"]+)"/i);
      if (arCp) entry.changedPlatform = arCp[1];
      const arCt = ar.match(/\sct="([^"]+)"/i);
      if (arCt) entry.changedArrival = arCt[1];
      const arCancel = ar.match(/\scancelled="true"/i) || ar.match(/\scancelled="1"/i);
      if (arCancel) entry.cancelled = true;
    }

    if (dpMatch) {
      const dp = dpMatch[0];
      const dpCp = dp.match(/\scp="([^"]+)"/i);
      if (dpCp) entry.changedPlatform = dpCp[1];
      const dpCt = dp.match(/\sct="([^"]+)"/i);
      if (dpCt) entry.changedDeparture = dpCt[1];
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
    const debug = url.searchParams.get("debug") === "1";

    if (!trainNumber || !date) {
      if (debug) {
        const cid = Deno.env.get("DB_API_CLIENT_ID");
        const cs = Deno.env.get("DB_API_CLIENT_SECRET");
        return new Response(JSON.stringify({
          debug: true,
          clientIdLength: cid?.length ?? 0,
          clientSecretLength: cs?.length ?? 0,
          clientIdFirst3: cid ? cid.slice(0, 3) : null,
          clientSecretFirst3: cs ? cs.slice(0, 3) : null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
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
        diagnostic: debug ? lastDiagnostic : undefined,
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
      const result = await dbFetch(`/plan/${stationResult.eva}/${dbDate}/${hourStr}`);
      if (result && result.ok) {
        entries.push(...parseTimetableXml(result.text));
      }
    }

    if (entries.length === 0) {
      return new Response(JSON.stringify({
        error: "no_timetable",
        message: "Keine Fahrplandaten für diesen Bahnhof an diesem Tag gefunden.",
        station: stationResult.name,
        diagnostic: debug ? lastDiagnostic : undefined,
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await applyChanges(stationResult.eva, entries);

    const match = matchTrainEntry(entries, trainNumber);
    if (!match) {
      const availableTrains = entries.slice(0, 10).map((e) => `${e.trainType} ${e.trainNumber}`).filter(Boolean);
      return new Response(JSON.stringify({
        error: "train_not_found",
        message: `Zug "${trainNumber}" am Bahnhof "${stationResult.name}" am ${date} nicht gefunden.`,
        station: stationResult.name,
        availableTrains: debug ? availableTrains : undefined,
        totalEntries: entries.length,
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
      actualDeparture: match.changedDeparture,
      scheduledArrival: match.scheduledArrival,
      actualArrival: match.changedArrival,
      cancelled: match.cancelled,
      lastUpdated: new Date().toISOString(),
      station: stationResult.name,
      source: "db_timetables",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return new Response(
      JSON.stringify({ error: "internal_error", message, diagnostic: lastDiagnostic }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
