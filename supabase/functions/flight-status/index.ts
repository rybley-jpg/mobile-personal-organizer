import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

let cachedStates: { time: number; data: number[][] } | null = null;
const CACHE_TTL_MS = 60_000;

async function getOpenSkyStates(): Promise<number[][] | null> {
  if (cachedStates && Date.now() - cachedStates.time < CACHE_TTL_MS) {
    return cachedStates.data;
  }

  try {
    const res = await fetch("https://opensky-network.org/api/states/all");
    if (!res.ok) return cachedStates?.data ?? null;
    const json = await res.json();
    const states: number[][] = json?.states ?? [];
    cachedStates = { time: Date.now(), data: states };
    return states;
  } catch {
    return cachedStates?.data ?? null;
  }
}

function findStateByCallsign(states: number[][], callsign: string): number[] | null {
  const target = callsign.toUpperCase().trim();
  for (const s of states) {
    const cs = String(s[1] ?? "").toUpperCase().trim();
    if (cs === target) return s;
  }
  return null;
}

const IATA_TO_ICAO: Record<string, string> = {
  LH: "DLH", ET: "ETH", EK: "UAE", QR: "QTR", TK: "THY", EW: "EWG",
  DE: "CFG", FR: "RYR", U2: "EZY", BA: "BAW", AF: "AFR", KL: "KLM",
  IB: "IBE", AZ: "ITY", OS: "AUA", SK: "SAS", LX: "SWR", AY: "FIN",
  UA: "UAL", DL: "DAL", AA: "AAL", AC: "ACA", QF: "QFA", SQ: "SIA",
  NH: "ANA", JL: "JAL", CX: "CPA", KE: "KAL", TG: "THA", MH: "MAS",
  EY: "ETD", WN: "SWA", B6: "JBU", VS: "VIR", VY: "VOE", WK: "WBK",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const airlineIata = url.searchParams.get("airline");
    const airlineIcao = url.searchParams.get("airlineIcao");
    const flight = url.searchParams.get("flight");
    const date = url.searchParams.get("date");

    if (!airlineIata || !flight || !date) {
      return new Response(
        JSON.stringify({ error: "Parameter airline, flight und date erforderlich" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aviationKey = Deno.env.get("AVIATIONSTACK_API_KEY");

    if (aviationKey) {
      const apiUrl = `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(aviationKey)}&airline_iata=${encodeURIComponent(airlineIata)}&flight_iata=${encodeURIComponent(airlineIata + flight)}&flight_date=${encodeURIComponent(date)}`;
      try {
        const apiRes = await fetch(apiUrl);
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          const fd = apiData?.data?.[0];
          if (fd) {
            const statusMap: Record<string, string> = {
              scheduled: "scheduled", delayed: "delayed", boarding: "boarding",
              departed: "departed", "en-route": "departed", arrived: "arrived",
              cancelled: "cancelled", diverted: "diverted",
            };
            const delay = fd.departure?.delay ?? fd.arrival?.delay ?? null;
            const gate = fd.departure?.gate ?? fd.arrival?.gate ?? null;
            const terminal = fd.departure?.terminal ?? fd.arrival?.terminal ?? null;
            return new Response(JSON.stringify({
              status: statusMap[fd.flight_status] ?? "scheduled",
              scheduledDeparture: fd.departure?.scheduledTime ?? fd.departure?.scheduled ?? null,
              actualDeparture: fd.departure?.actualTime ?? fd.departure?.actual ?? null,
              estimatedDeparture: fd.departure?.estimatedTime ?? fd.departure?.estimated ?? null,
              scheduledArrival: fd.arrival?.scheduledTime ?? fd.arrival?.scheduled ?? null,
              actualArrival: fd.arrival?.actualTime ?? fd.arrival?.actual ?? null,
              estimatedArrival: fd.arrival?.estimatedTime ?? fd.arrival?.estimated ?? null,
              delayMinutes: delay ? Math.round(delay) : null,
              gate: gate ? String(gate) : null,
              previousGate: null,
              terminal: terminal ? String(terminal) : null,
              aircraft: fd.aircraft?.registration ?? null,
              cancelled: fd.flight_status === "cancelled",
              diverted: fd.flight_status === "diverted",
              lastUpdated: new Date().toISOString(),
              source: "aviationstack",
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
        }
      } catch {
        // fall through to OpenSky
      }
    }

    const icao = airlineIcao ?? IATA_TO_ICAO[airlineIata.toUpperCase()] ?? null;
    if (icao) {
      const callsign = `${icao}${flight}`;
      const states = await getOpenSkyStates();
      if (states) {
        const state = findStateByCallsign(states, callsign);
        if (state) {
          const onGround = state[8] === true;
          const velocity = state[9] ?? null;
          const altitude = state[7] ?? state[13] ?? null;
          const verticalRate = state[11] ?? null;

          let status: string;
          if (onGround && velocity !== null && velocity < 5 && (verticalRate === null || Math.abs(verticalRate) < 0.5)) {
            status = "departed";
          } else if (onGround) {
            status = "scheduled";
          } else {
            status = "departed";
          }

          return new Response(JSON.stringify({
            status,
            scheduledDeparture: null,
            actualDeparture: null,
            estimatedDeparture: null,
            scheduledArrival: null,
            actualArrival: null,
            estimatedArrival: null,
            delayMinutes: null,
            gate: null,
            previousGate: null,
            terminal: null,
            aircraft: String(state[0] ?? ""),
            cancelled: false,
            diverted: false,
            lastUpdated: new Date().toISOString(),
            source: "opensky",
            onGround,
            altitude: altitude ? Math.round(altitude) : null,
            velocity: velocity ? Math.round(velocity) : null,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      return new Response(JSON.stringify({
        error: "no_flight_data",
        message: "Flug aktuell nicht in den Live-Daten gefunden. Möglicherweise ist der Flug noch nicht gestartet oder bereits gelandet.",
        status: null,
        source: "opensky",
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      error: "flight_api_not_configured",
      message: "Keine Flug-API verfügbar. Aviationstack-API-Key fehlt und keine ICAO-Code übergeben.",
    }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler";
    return new Response(
      JSON.stringify({ error: "internal_error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
