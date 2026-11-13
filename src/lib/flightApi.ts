import { FlightStatus, TripSegment } from '@/types';
import { findAirlineByName } from '@/lib/airlineData';
import { isOnline } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';

export interface FlightStatusData {
  status: FlightStatus | null;
  scheduledDeparture: string | null;
  actualDeparture: string | null;
  estimatedDeparture: string | null;
  scheduledArrival: string | null;
  actualArrival: string | null;
  estimatedArrival: string | null;
  delayMinutes: number | null;
  gate: string | null;
  terminal: string | null;
  aircraft: string | null;
  cancelled: boolean;
  diverted: boolean;
  lastUpdated: string | null;
}

export interface FlightDataProvider {
  getFlightStatus(airlineIata: string, flightNumber: string, date: string, airlineIcao?: string): Promise<FlightStatusData | null>;
}

class EdgeFunctionFlightDataProvider implements FlightDataProvider {
  async getFlightStatus(airlineIata: string, flightNumber: string, date: string, airlineIcao?: string): Promise<FlightStatusData | null> {
    if (!isOnline()) return null;
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) return null;

      const params = new URLSearchParams({
        airline: airlineIata,
        flight: flightNumber,
        date,
      });
      if (airlineIcao) params.set('airlineIcao', airlineIcao);

      const url = `${supabaseUrl}/functions/v1/flight-status?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || data.error) return null;
      return data as FlightStatusData;
    } catch {
      return null;
    }
  }
}

let _provider: FlightDataProvider | null = null;

export function getFlightDataProvider(): FlightDataProvider {
  if (_provider) return _provider;
  _provider = new EdgeFunctionFlightDataProvider();
  return _provider;
}

export const REFRESH_COOLDOWN_SECONDS = 120;
const DELAY_NOTIFY_MIN_MINUTES = 5;
const REFRESH_HIDE_AFTER_HOURS = 48;

function refreshStorageKey(segmentId: string): string {
  return `klarly.flightRefresh.${segmentId}`;
}

export function getRefreshWaitSeconds(segmentId: string): number {
  const last = Number(localStorage.getItem(refreshStorageKey(segmentId)));
  if (!last) return 0;
  const remaining = REFRESH_COOLDOWN_SECONDS - (Date.now() - last) / 1000;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

export function canShowRefreshButton(segment: TripSegment): boolean {
  if (segment.last_flight_status === 'cancelled') return false;
  if (!segment.departure_date) return true;
  const departure = new Date(segment.departure_date + 'T00:00:00').getTime();
  return (Date.now() - departure) / (1000 * 60 * 60) <= REFRESH_HIDE_AFTER_HOURS;
}

export function shouldRefreshFlightStatus(segment: {
  departure_date: string | null;
  last_flight_update: string | null;
  last_flight_status: FlightStatus | null;
}): boolean {
  if (!segment.departure_date) return false;
  if (segment.last_flight_status === 'arrived' || segment.last_flight_status === 'cancelled') return false;

  const now = Date.now();
  const departure = new Date(segment.departure_date + 'T00:00:00').getTime();
  const diffHours = (departure - now) / (1000 * 60 * 60);

  if (diffHours < -24) return false;
  if (!segment.last_flight_update) return true;

  const lastUpdate = new Date(segment.last_flight_update).getTime();
  const sinceUpdate = (now - lastUpdate) / (1000 * 60);

  if (diffHours > 168) return sinceUpdate > 360;
  if (diffHours > 48) return sinceUpdate > 180;
  if (diffHours > 6) return sinceUpdate > 60;
  if (diffHours > -2) return sinceUpdate > 15;
  return sinceUpdate > 30;
}

type NotificationType = 'gate_change' | 'delay' | 'cancellation' | 'general';

export type FlightRefreshResult =
  | { ok: true; data: FlightStatusData; changes: string[] }
  | { ok: false; reason: 'offline' | 'incomplete' | 'unknown_airline' | 'no_data' | 'too_soon' | 'save_failed'; waitSeconds?: number };

export async function fetchAndStoreFlightStatus(
  segment: TripSegment,
  updateSegment: (id: string, patch: Record<string, unknown>) => Promise<void>
): Promise<FlightRefreshResult> {
  if (!isOnline()) return { ok: false, reason: 'offline' };
  if (!segment.airline || !segment.flight_number || !segment.departure_date) return { ok: false, reason: 'incomplete' };

  const airline = findAirlineByName(segment.airline);
  if (!airline) return { ok: false, reason: 'unknown_airline' };

  const waitSeconds = getRefreshWaitSeconds(segment.id);
  if (waitSeconds > 0) return { ok: false, reason: 'too_soon', waitSeconds };

  localStorage.setItem(refreshStorageKey(segment.id), String(Date.now()));

  const flightNum = segment.flight_number.replace(airline.iata, '').trim() || segment.flight_number;
  const data = await getFlightDataProvider().getFlightStatus(airline.iata, flightNum, segment.departure_date, airline.icao);
  if (!data) return { ok: false, reason: 'no_data' };

  const notifications: { type: NotificationType; message: string }[] = [];

  const newGate = data.gate;
  const gateChanged = !!newGate && !!segment.last_known_gate && newGate !== segment.last_known_gate;
  if (gateChanged) {
    notifications.push({ type: 'gate_change', message: `Gate-Wechsel: ${segment.last_known_gate} → ${newGate}` });
  }

  const delay = data.delayMinutes;
  if (delay !== null && delay >= DELAY_NOTIFY_MIN_MINUTES && delay !== segment.delay_minutes) {
    notifications.push({ type: 'delay', message: `Verspätung: +${delay} Minuten` });
  }

  const cancelled = data.cancelled || data.status === 'cancelled';
  if (cancelled && segment.last_flight_status !== 'cancelled') {
    notifications.push({ type: 'cancellation', message: 'Flug wurde abgesagt.' });
  }

  const diverted = data.diverted || data.status === 'diverted';
  if (diverted && segment.last_flight_status !== 'diverted') {
    notifications.push({ type: 'general', message: 'Flug wurde umgeleitet.' });
  }

  const patch: Record<string, unknown> = {
    last_flight_status: data.status,
    delay_minutes: delay,
    last_known_terminal: data.terminal,
    last_known_departure: data.actualDeparture ?? data.estimatedDeparture,
    last_known_arrival: data.actualArrival ?? data.estimatedArrival,
    last_flight_update: data.lastUpdated ?? new Date().toISOString(),
    checkin_open: false,
  };
  if (newGate) patch.last_known_gate = newGate;
  if (gateChanged) {
    patch.previous_gate = segment.last_known_gate;
    patch.gate_changed = true;
  }

  if (notifications.length > 0) {
    const { error } = await supabase.from('flight_notifications').insert(
      notifications.map((n) => ({ segment_id: segment.id, notification_type: n.type, message: n.message }))
    );
    if (error) return { ok: false, reason: 'save_failed' };
  }

  try {
    await updateSegment(segment.id, patch);
  } catch {
    return { ok: false, reason: 'save_failed' };
  }

  return { ok: true, data, changes: notifications.map((n) => n.message) };
}

export function flightRefreshMessage(result: FlightRefreshResult): string {
  if (result.ok) {
    return result.changes.length > 0 ? result.changes.join(' · ') : 'Keine Änderungen, alles wie geplant.';
  }
  switch (result.reason) {
    case 'offline':
      return 'Keine Internetverbindung. Der Status wird aktualisiert, sobald du online bist.';
    case 'incomplete':
      return 'Für den Live-Status fehlen Fluglinie, Flugnummer oder Datum.';
    case 'unknown_airline':
      return 'Diese Fluglinie ist nicht in der Liste. Bitte wähle sie beim Flug neu aus.';
    case 'no_data':
      return 'Keine Live-Daten für diesen Flug gefunden.';
    case 'too_soon':
      return `Bitte noch ${result.waitSeconds} Sekunden warten.`;
    case 'save_failed':
      return 'Die Änderungen konnten nicht gespeichert werden. Bitte versuche es erneut.';
  }
}

export function flightLiveLinks(flightNumber: string | null): { flightaware: string; flightradar24: string } | null {
  const clean = (flightNumber ?? '').replace(/\s+/g, '').toUpperCase();
  if (!clean) return null;
  return {
    flightaware: `https://www.flightaware.com/live/flight/${encodeURIComponent(clean)}`,
    flightradar24: `https://www.flightradar24.com/${encodeURIComponent(clean.toLowerCase())}`,
  };
}
