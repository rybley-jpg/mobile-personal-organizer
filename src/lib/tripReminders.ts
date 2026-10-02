import { toISODate } from '@/lib/dateUtils';
import { TripSegment } from '@/types';

export interface SuggestedReminder {
  title: string;
  due_date: string;
  due_time: string | null;
  priority: 'niedrig' | 'normal' | 'hoch';
}

function departureDateTime(segment: TripSegment): Date | null {
  if (!segment.departure_date) return null;
  const [y, m, d] = segment.departure_date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (segment.departure_time) {
    const [h, min] = segment.departure_time.split(':').map(Number);
    date.setHours(h, min, 0, 0);
  } else {
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

function minusHours(date: Date, hours: number): Date {
  return new Date(date.getTime() - hours * 3600000);
}

export function generateSuggestedFlightReminders(segment: TripSegment): SuggestedReminder[] {
  const departure = departureDateTime(segment);
  if (!departure) return [];

  const route = [segment.from_location, segment.to_location].filter(Boolean).join(' → ');
  const label = route ? ` (${route})` : '';

  const reminders: { title: string; at: Date; priority: 'niedrig' | 'normal' | 'hoch' }[] = [
    { title: `Online-Check-in durchführen${label}`, at: minusHours(departure, 24), priority: 'hoch' },
    { title: `Sitzplatz prüfen${label}`, at: minusHours(departure, 24 * 7), priority: 'normal' },
    { title: `Reisepass kontrollieren${label}`, at: minusHours(departure, 24 * 14), priority: 'hoch' },
    { title: `Gepäck vorbereiten${label}`, at: minusHours(departure, 24), priority: 'normal' },
    { title: `Fahrt zum Flughafen planen${label}`, at: minusHours(departure, 24 * 2), priority: 'normal' },
    { title: `Rechtzeitig zum Flughafen fahren${label}`, at: minusHours(departure, 3), priority: 'hoch' },
  ];

  return reminders.map((r) => ({
    title: r.title,
    due_date: toISODate(r.at),
    due_time: `${String(r.at.getHours()).padStart(2, '0')}:${String(r.at.getMinutes()).padStart(2, '0')}`,
    priority: r.priority,
  }));
}

export function generateSuggestedTrainReminders(segment: TripSegment): SuggestedReminder[] {
  const departure = departureDateTime(segment);
  if (!departure) return [];

  const route = [segment.from_location, segment.to_location].filter(Boolean).join(' → ');
  const label = route ? ` (${route})` : '';
  const trainLabel = segment.train_number ? ` ${segment.train_number}` : '';

  const reminders: { title: string; at: Date; priority: 'niedrig' | 'normal' | 'hoch' }[] = [
    { title: `Ticket für${trainLabel} bereithalten${label}`, at: minusHours(departure, 24), priority: 'normal' },
    { title: `Gepäck vorbereiten${label}`, at: minusHours(departure, 24), priority: 'normal' },
    { title: `Rechtzeitig zum Bahnhof${label}`, at: minusHours(departure, 1), priority: 'hoch' },
    { title: `Gleis und Wagen prüfen${trainLabel}${label}`, at: minusHours(departure, 1), priority: 'normal' },
  ];

  return reminders.map((r) => ({
    title: r.title,
    due_date: toISODate(r.at),
    due_time: `${String(r.at.getHours()).padStart(2, '0')}:${String(r.at.getMinutes()).padStart(2, '0')}`,
    priority: r.priority,
  }));
}
