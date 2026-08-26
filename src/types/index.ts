export type Priority = 'niedrig' | 'normal' | 'hoch';
export type TaskStatus = 'offen' | 'erledigt';
export type RepeatRule = 'taeglich' | 'woechentlich' | 'monatlich' | 'jaehrlich';
export type ReminderOffset = 'none' | 'at_time' | '15m' | '1h' | '2h' | '1d' | '3d' | '7d';
export type SegmentType = 'flug' | 'hotel' | 'mietwagen' | 'sonstiges';
export type FlightStatus = 'scheduled' | 'delayed' | 'boarding' | 'departed' | 'arrived' | 'cancelled' | 'diverted';
export type TravelClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';
export type CheckInReminderOffset = '48h' | '24h' | '12h' | '6h' | 'custom' | 'none';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  priority: Priority;
  category_id: string | null;
  status: TaskStatus;
  repeat_rule: RepeatRule | null;
  reminder_offset: ReminderOffset;
  trip_id: string | null;
  is_suggested: boolean;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string | null;
  notes: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  booking_links: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripSegment {
  id: string;
  trip_id: string;
  segment_type: SegmentType;
  title: string | null;
  from_location: string | null;
  to_location: string | null;
  departure_date: string | null;
  departure_time: string | null;
  arrival_date: string | null;
  arrival_time: string | null;
  airline: string | null;
  flight_number: string | null;
  booking_number: string | null;
  terminal: string | null;
  gate: string | null;
  seat: string | null;
  baggage_info: string | null;
  order_index: number;
  created_at: string;
  from_airport_code: string | null;
  to_airport_code: string | null;
  arrival_terminal: string | null;
  ticket_number: string | null;
  travel_class: TravelClass | null;
  carry_on_baggage: string | null;
  checked_baggage: string | null;
  segment_notes: string | null;
  last_flight_status: FlightStatus | null;
  last_known_gate: string | null;
  previous_gate: string | null;
  last_known_terminal: string | null;
  delay_minutes: number | null;
  last_known_departure: string | null;
  last_known_arrival: string | null;
  last_flight_update: string | null;
  gate_changed: boolean;
  checkin_open: boolean;
  price_amount: number | null;
  price_currency: string | null;
}

export interface Contact {
  id: string;
  name: string;
  organization: string | null;
  phone: string | null;
  phone_alt: string | null;
  email: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  text: string;
  checked: boolean;
  order_index: number;
  created_at: string;
}

export interface TravelChecklistItem {
  id: string;
  trip_id: string;
  label: string;
  checked: boolean;
  is_custom: boolean;
  sort_index: number;
  created_at: string;
}

export interface WalletDocument {
  id: string;
  trip_id: string;
  label: string;
  doc_type: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface FlightNotification {
  id: string;
  segment_id: string;
  notification_type: 'gate_change' | 'delay' | 'boarding' | 'cancellation' | 'general';
  message: string;
  is_read: boolean;
  created_at: string;
}

export const REMINDER_OFFSET_LABELS: Record<ReminderOffset, string> = {
  none: 'Keine Erinnerung',
  at_time: 'Zum Zeitpunkt',
  '15m': '15 Minuten vorher',
  '1h': '1 Stunde vorher',
  '2h': '2 Stunden vorher',
  '1d': '1 Tag vorher',
  '3d': '3 Tage vorher',
  '7d': '7 Tage vorher',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  niedrig: 'Niedrig',
  normal: 'Normal',
  hoch: 'Hoch',
};

export const REPEAT_LABELS: Record<RepeatRule, string> = {
  taeglich: 'Täglich',
  woechentlich: 'Wöchentlich',
  monatlich: 'Monatlich',
  jaehrlich: 'Jährlich',
};

export const SEGMENT_TYPE_LABELS: Record<SegmentType, string> = {
  flug: 'Flug',
  hotel: 'Hotel',
  mietwagen: 'Mietwagen',
  sonstiges: 'Sonstiges',
};

export const FLIGHT_STATUS_LABELS: Record<FlightStatus, string> = {
  scheduled: 'Pünktlich',
  delayed: 'Verspätet',
  boarding: 'Boarding',
  departed: 'Gestartet',
  arrived: 'Angekommen',
  cancelled: 'Gestrichen',
  diverted: 'Umgeleitet',
};

export const TRAVEL_CLASS_LABELS: Record<TravelClass, string> = {
  Economy: 'Economy',
  'Premium Economy': 'Premium Economy',
  Business: 'Business',
  First: 'First Class',
};

export const CHECKIN_REMINDER_LABELS: Record<CheckInReminderOffset, string> = {
  '48h': '48 Stunden vorher',
  '24h': '24 Stunden vorher',
  '12h': '12 Stunden vorher',
  '6h': '6 Stunden vorher',
  custom: 'Benutzerdefiniert',
  none: 'Keine Check-in-Erinnerung',
};
