import type { Trip, TripSegment, TravelExpense } from '@/types';
import { tripEndDate, tripStartDate } from '@/lib/tripDates';

export const NO_TRIP_KEY = 'ohne-reise';
export const NO_CATEGORY_LABEL = 'Ohne Kategorie';

export function totalsByCurrency(expenses: TravelExpense[]): { currency: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.currency, (map.get(e.currency) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function totalEur(expenses: TravelExpense[]): { total: number; missing: number } {
  let total = 0;
  let missing = 0;
  for (const e of expenses) {
    if (e.amount_eur === null) missing += 1;
    else total += e.amount_eur;
  }
  return { total, missing };
}

export function categoryTotalsEur(expenses: TravelExpense[]): { name: string; total: number }[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    if (e.amount_eur === null) continue;
    const name = e.category ?? NO_CATEGORY_LABEL;
    map.set(name, (map.get(name) ?? 0) + e.amount_eur);
  }
  return [...map.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export function expenseYears(expenses: TravelExpense[], currentYear: number): number[] {
  const years = new Set<number>([currentYear]);
  for (const e of expenses) years.add(Number(e.expense_date.slice(0, 4)));
  return [...years].sort((a, b) => b - a);
}

export interface YearTripGroup {
  key: string;
  tripId: string | null;
  name: string;
  expenses: TravelExpense[];
}

export function yearTripGroups(
  expenses: TravelExpense[],
  year: number,
  trips: Trip[],
): YearTripGroup[] {
  const inYear = expenses.filter((e) => e.expense_date.startsWith(`${year}-`));
  const groups: YearTripGroup[] = [];
  for (const trip of trips) {
    const list = inYear.filter((e) => e.trip_id === trip.id);
    if (list.length > 0) groups.push({ key: trip.id, tripId: trip.id, name: trip.name, expenses: list });
  }
  const unassigned = inYear.filter((e) => e.trip_id === null);
  if (unassigned.length > 0) {
    groups.push({ key: NO_TRIP_KEY, tripId: null, name: 'Ohne Reise', expenses: unassigned });
  }
  return groups.sort((a, b) => totalEur(b.expenses).total - totalEur(a.expenses).total);
}

export function defaultTripId(trips: Trip[], segments: TripSegment[], today: string): string | null {
  const ranges = trips.map((trip) => {
    const segs = segments.filter((s) => s.trip_id === trip.id);
    const start = tripStartDate(segs);
    const end = tripEndDate(segs) ?? start;
    return { id: trip.id, start, end };
  });
  const current = ranges.find((r) => r.start && r.end && r.start <= today && today <= r.end);
  if (current) return current.id;
  const next = ranges
    .filter((r) => r.start && r.start > today)
    .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))[0];
  if (next) return next.id;
  const latest = ranges
    .filter((r) => r.end)
    .sort((a, b) => (b.end ?? '').localeCompare(a.end ?? ''))[0];
  return latest?.id ?? trips[0]?.id ?? null;
}
