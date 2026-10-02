import { TripSegment, FlightStatus, TrainStatus, TransportStatus } from '@/types';
import { combineDateTime } from '@/lib/dateUtils';

export function getSegmentTransportStatus(seg: TripSegment): TransportStatus {
  if (seg.segment_type === 'flug') {
    const s = seg.last_flight_status;
    if (!s) return 'unknown';
    const map: Record<FlightStatus, TransportStatus> = {
      scheduled: 'on_time',
      delayed: 'delayed',
      boarding: 'boarding',
      departed: 'departed',
      arrived: 'arrived',
      cancelled: 'cancelled',
      diverted: 'delayed',
    };
    return map[s];
  }
  if (seg.segment_type === 'bahn') {
    const s = seg.last_train_status;
    if (!s || s === 'unknown') return 'unknown';
    const map: Record<TrainStatus, TransportStatus> = {
      on_time: 'on_time',
      delayed: 'delayed',
      cancelled: 'cancelled',
      unknown: 'unknown',
    };
    return map[s];
  }
  return 'unknown';
}

export type TripOverallStatus = 'on_time' | 'with_changes' | 'cancelled' | 'partial_unknown';

export function computeTripOverallStatus(segments: TripSegment[]): TripOverallStatus {
  if (segments.length === 0) return 'on_time';

  const transportSegs = segments.filter((s) => s.segment_type === 'flug' || s.segment_type === 'bahn');
  if (transportSegs.length === 0) return 'on_time';

  let hasDelay = false;
  let hasCancelled = false;
  let hasUnknown = false;

  for (const seg of transportSegs) {
    const status = getSegmentTransportStatus(seg);
    if (status === 'cancelled') hasCancelled = true;
    else if (status === 'delayed') hasDelay = true;
    else if (status === 'unknown') hasUnknown = true;
  }

  if (hasCancelled) return 'cancelled';
  if (hasDelay) return 'with_changes';
  if (hasUnknown) return 'partial_unknown';
  return 'on_time';
}

export interface ConnectionInfo {
  fromSegment: TripSegment;
  toSegment: TripSegment;
  plannedGapMinutes: number;
  actualGapMinutes: number | null;
  warningLevel: 'none' | 'reduced' | 'critical';
  message: string;
}

function getSegmentArrivalDateTime(seg: TripSegment): Date | null {
  if (seg.segment_type === 'flug' && seg.last_known_arrival) {
    try {
      return new Date(seg.last_known_arrival);
    } catch { /* fall through */ }
  }
  return combineDateTime(seg.arrival_date, seg.arrival_time);
}

function getSegmentDepartureDateTime(seg: TripSegment): Date | null {
  if (seg.segment_type === 'flug' && seg.last_known_departure) {
    try {
      return new Date(seg.last_known_departure);
    } catch { /* fall through */ }
  }
  return combineDateTime(seg.departure_date, seg.departure_time);
}

export function computeConnections(segments: TripSegment[]): ConnectionInfo[] {
  const sorted = [...segments].sort((a, b) => {
    const aDate = combineDateTime(a.departure_date, a.departure_time);
    const bDate = combineDateTime(b.departure_date, b.departure_time);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.getTime() - bDate.getTime();
  });

  const connections: ConnectionInfo[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (!current.arrival_date || !next.departure_date) continue;

    const plannedArrival = combineDateTime(current.arrival_date, current.arrival_time);
    const plannedDeparture = combineDateTime(next.departure_date, next.departure_time);
    if (!plannedArrival || !plannedDeparture) continue;

    const plannedGapMinutes = Math.round((plannedDeparture.getTime() - plannedArrival.getTime()) / 60000);
    if (plannedGapMinutes < 0) continue;

    const actualArrival = getSegmentArrivalDateTime(current);
    const actualDeparture = getSegmentDepartureDateTime(next);
    if (!actualArrival || !actualDeparture) continue;

    const actualGapMinutes = Math.round((actualDeparture.getTime() - actualArrival.getTime()) / 60000);

    let warningLevel: ConnectionInfo['warningLevel'] = 'none';
    let message = `${formatDuration(plannedGapMinutes)} Anschlusszeit`;

    if (actualGapMinutes !== null && actualGapMinutes !== plannedGapMinutes) {
      if (actualGapMinutes < 30) {
        warningLevel = 'critical';
        message = `Anschlusszeit kritisch: nur noch ${formatDuration(actualGapMinutes)}`;
      } else if (actualGapMinutes < plannedGapMinutes * 0.5) {
        warningLevel = 'reduced';
        message = `Anschlusszeit deutlich reduziert: ${formatDuration(actualGapMinutes)} (geplant: ${formatDuration(plannedGapMinutes)})`;
      } else if (actualGapMinutes < plannedGapMinutes) {
        warningLevel = 'reduced';
        message = `Anschlusszeit verringert: ${formatDuration(actualGapMinutes)} (geplant: ${formatDuration(plannedGapMinutes)})`;
      }
    }

    connections.push({
      fromSegment: current,
      toSegment: next,
      plannedGapMinutes,
      actualGapMinutes,
      warningLevel,
      message,
    });
  }

  return connections;
}

export function formatDuration(minutes: number): string {
  if (minutes < 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Std`;
  return `${h} Std ${m} Min`;
}
