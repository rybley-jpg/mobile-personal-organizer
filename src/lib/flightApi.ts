import { FlightStatus } from '@/types';
import { findAirlineByName } from '@/lib/airlineData';

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
  previousGate: string | null;
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

export function isFlightApiConfigured(): boolean {
  return true;
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

export async function fetchAndStoreFlightStatus(
  segment: { id: string; airline: string | null; flight_number: string | null; departure_date: string | null },
  updateSegment: (id: string, patch: Record<string, unknown>) => Promise<void>
): Promise<FlightStatusData | null> {
  if (!segment.airline || !segment.flight_number || !segment.departure_date) return null;

  const provider = getFlightDataProvider();

  const airline = findAirlineByName(segment.airline);
  if (!airline) return null;

  const flightNum = segment.flight_number.replace(airline.iata, '').trim() || segment.flight_number;
  const data = await provider.getFlightStatus(airline.iata, flightNum, segment.departure_date, airline.icao);
  if (!data) return null;

  const patch: Record<string, unknown> = {
    last_flight_status: data.status,
    last_known_gate: data.gate,
    previous_gate: data.previousGate,
    last_known_terminal: data.terminal,
    delay_minutes: data.delayMinutes,
    last_known_departure: data.actualDeparture ?? data.estimatedDeparture,
    last_known_arrival: data.actualArrival ?? data.estimatedArrival,
    last_flight_update: data.lastUpdated ?? new Date().toISOString(),
    gate_changed: data.previousGate !== null && data.previousGate !== data.gate,
    checkin_open: false,
  };

  await updateSegment(segment.id, patch);
  return data;
}
