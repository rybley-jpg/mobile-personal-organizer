import { TrainStatus } from '@/types';

export interface TrainStatusData {
  status: TrainStatus;
  delayMinutes: number | null;
  platform: string | null;
  previousPlatform: string | null;
  scheduledDeparture: string | null;
  actualDeparture: string | null;
  scheduledArrival: string | null;
  actualArrival: string | null;
  cancelled: boolean;
  lastUpdated: string | null;
  station?: string;
  source?: string;
}

export interface RailDataProvider {
  getTrainStatus(trainNumber: string, date: string, station?: string): Promise<TrainStatusData | null>;
  isConfigured(): boolean;
}

class EdgeFunctionRailDataProvider implements RailDataProvider {
  isConfigured(): boolean {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return !!(supabaseUrl && anonKey);
  }

  async getTrainStatus(trainNumber: string, date: string, station?: string): Promise<TrainStatusData | null> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) return null;

      const params = new URLSearchParams({
        train: trainNumber,
        date,
      });
      if (station) params.set('station', station);

      const url = `${supabaseUrl}/functions/v1/rail-status?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (!data || data.error) return null;

      const statusMap: Record<string, TrainStatus> = {
        on_time: 'on_time',
        delayed: 'delayed',
        cancelled: 'cancelled',
      };

      return {
        status: statusMap[data.status] ?? 'unknown',
        delayMinutes: data.delayMinutes ?? null,
        platform: data.platform ?? null,
        previousPlatform: data.previousPlatform ?? null,
        scheduledDeparture: data.scheduledDeparture ?? null,
        actualDeparture: data.actualDeparture ?? null,
        scheduledArrival: data.scheduledArrival ?? null,
        actualArrival: data.actualArrival ?? null,
        cancelled: data.cancelled ?? false,
        lastUpdated: data.lastUpdated ?? null,
        station: data.station,
        source: data.source,
      };
    } catch {
      return null;
    }
  }
}

let _provider: RailDataProvider | null = null;

export function getRailDataProvider(): RailDataProvider {
  if (_provider) return _provider;
  _provider = new EdgeFunctionRailDataProvider();
  return _provider;
}

export function isRailApiConfigured(): boolean {
  return getRailDataProvider().isConfigured();
}

export function shouldRefreshTrainStatus(segment: {
  departure_date: string | null;
  last_train_update: string | null;
  last_train_status: TrainStatus | null;
}): boolean {
  if (!segment.departure_date) return false;
  if (segment.last_train_status === 'cancelled') return false;

  const now = Date.now();
  const departure = new Date(segment.departure_date + 'T00:00:00').getTime();
  const diffHours = (departure - now) / (1000 * 60 * 60);

  if (diffHours < -24) return false;
  if (!segment.last_train_update) return true;

  const lastUpdate = new Date(segment.last_train_update).getTime();
  const sinceUpdate = (now - lastUpdate) / (1000 * 60);

  if (diffHours > 168) return sinceUpdate > 360;
  if (diffHours > 48) return sinceUpdate > 180;
  if (diffHours > 6) return sinceUpdate > 60;
  if (diffHours > -2) return sinceUpdate > 15;
  return sinceUpdate > 30;
}

export async function fetchAndStoreTrainStatus(
  segment: { id: string; train_number: string | null; departure_date: string | null; from_location: string | null },
  updateSegment: (id: string, patch: Record<string, unknown>) => Promise<void>
): Promise<TrainStatusData | null> {
  if (!segment.train_number || !segment.departure_date) return null;

  const provider = getRailDataProvider();
  if (!provider.isConfigured()) return null;

  const data = await provider.getTrainStatus(segment.train_number, segment.departure_date, segment.from_location ?? undefined);
  if (!data) return null;

  const patch: Record<string, unknown> = {
    last_train_status: data.status,
    last_known_platform: data.platform,
    previous_platform: data.previousPlatform,
    platform_changed: data.previousPlatform !== null && data.previousPlatform !== data.platform,
    delay_minutes_train: data.delayMinutes,
    last_train_update: data.lastUpdated ?? new Date().toISOString(),
  };

  await updateSegment(segment.id, patch);
  return data;
}
