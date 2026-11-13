import type { TripSegment } from '@/types';

export function tripEndDate(tripSegs: TripSegment[]): string | null {
  return tripSegs.reduce<string | null>((latest, s) => {
    const d = s.arrival_date ?? s.departure_date;
    if (!d) return latest;
    return latest === null || d > latest ? d : latest;
  }, null);
}

export function tripStartDate(tripSegs: TripSegment[]): string | null {
  return tripSegs.reduce<string | null>((earliest, s) => {
    const d = s.departure_date;
    if (!d) return earliest;
    return earliest === null || d < earliest ? d : earliest;
  }, null);
}
