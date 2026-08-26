import { useState, useEffect, useCallback } from 'react';
import { Plane, ExternalLink, Calendar, Clock, MapPin, Ticket, Armchair, Luggage, Building, AlertTriangle, CheckCircle2, Bell, BellRing, Trash2, MessageSquare } from 'lucide-react';
import { TripSegment, CheckInReminderOffset, CHECKIN_REMINDER_LABELS } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { FlightStatusBadge, GateChangeAlert, DelayInfo, LiveUpdateInfo } from '@/components/FlightStatusBadge';
import { findAirlineByName, Airline } from '@/lib/airlineData';
import { findAirportByIata } from '@/lib/airportData';
import { fetchAndStoreFlightStatus, isFlightApiConfigured, shouldRefreshFlightStatus } from '@/lib/flightApi';
import { formatDateShort, formatTime } from '@/lib/dateUtils';
import { useOrganizer } from '@/context/OrganizerContext';
import { useFlightNotifications } from '@/hooks/useFlightNotifications';

interface FlightDetailProps {
  segment: TripSegment;
  open: boolean;
  onClose: () => void;
  tripName?: string;
}

export function FlightDetail({ segment, open, onClose, tripName }: FlightDetailProps) {
  const { tripsApi, tasksApi, categoriesApi } = useOrganizer();
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [checkinSheetOpen, setCheckinSheetOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, deleteNotification } = useFlightNotifications(segment?.id ?? null);

  const airline: Airline | null = segment.airline ? findAirlineByName(segment.airline) : null;
  const fromAirport = segment.from_airport_code ? findAirportByIata(segment.from_airport_code) : null;
  const toAirport = segment.to_airport_code ? findAirportByIata(segment.to_airport_code) : null;

  const refreshStatus = useCallback(async () => {
    if (!segment.airline || !segment.flight_number || !segment.departure_date) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const result = await fetchAndStoreFlightStatus(segment, tripsApi.updateSegment);
      if (!result && isFlightApiConfigured()) {
        setLiveError('Keine aktuellen Flugdaten verfügbar.');
      } else if (!result && !isFlightApiConfigured()) {
        setLiveError('Live-Flugstatus momentan nicht verfügbar.');
      }
    } catch {
      setLiveError('Live-Daten konnten nicht abgerufen werden.');
    } finally {
      setLiveLoading(false);
    }
  }, [segment, tripsApi]);

  useEffect(() => {
    if (open && shouldRefreshFlightStatus(segment)) {
      refreshStatus();
    }
  }, [open, segment, refreshStatus]);

  const handleAddCheckinReminder = async (offset: CheckInReminderOffset) => {
    if (offset === 'none') return;
    if (!segment.departure_date) return;

    const departureDate = new Date(segment.departure_date + 'T' + (segment.departure_time ?? '00:00'));
    const offsetMap: Record<CheckInReminderOffset, number> = {
      '48h': 48, '24h': 24, '12h': 12, '6h': 6, custom: 24, none: 0,
    };
    const hours = offsetMap[offset] ?? 24;
    const reminderDate = new Date(departureDate.getTime() - hours * 60 * 60 * 1000);

    const cat = categoriesApi.categories.find((c) => c.name === 'Reise');
    const flightLabel = segment.flight_number ?? segment.title ?? 'Flug';

    try {
      await tasksApi.addTask({
        title: `Check-in für ${flightLabel} ${offset === '48h' ? '48h' : offset === '24h' ? '24h' : offset === '12h' ? '12h' : '6h'} vorher`,
        description: `Automatische Check-in-Erinnerung für ${tripName ?? 'Reise'} – ${flightLabel}`,
        due_date: reminderDate.toISOString().split('T')[0],
        due_time: reminderDate.toTimeString().slice(0, 5),
        priority: 'hoch',
        category_id: cat?.id ?? null,
        repeat_rule: null,
        reminder_offset: 'at_time',
        trip_id: segment.trip_id,
        status: 'offen',
        is_suggested: true,
      });
      setCheckinSheetOpen(false);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Sheet open={open && !checkinSheetOpen} onClose={onClose} title="Flugdetails">
        <div className="space-y-5">
          {/* Airline header */}
          <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-primary-600 p-5 text-white shadow-lg shadow-sky-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-sky-100">Fluggesellschaft</p>
                <h2 className="text-lg font-bold">{segment.airline ?? 'Unbekannte Airline'}</h2>
                {airline && <p className="text-xs text-sky-100 mt-0.5">IATA: {airline.iata}</p>}
              </div>
              {segment.flight_number && (
                <div className="text-right">
                  <p className="text-xs text-sky-100">Flugnummer</p>
                  <p className="text-xl font-bold font-mono">{segment.flight_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Route */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {fromAirport?.iata ?? segment.from_airport_code ?? '—'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {fromAirport?.city ?? segment.from_location ?? 'Abflugort'}
                </p>
                {fromAirport && <p className="text-[10px] text-slate-400 truncate">{fromAirport.name}</p>}
              </div>
              <div className="flex flex-col items-center">
                <Plane size={22} className="text-primary-600 dark:text-primary-400 rotate-90" />
                <div className="w-16 h-px bg-slate-200 dark:bg-slate-700 my-1" />
              </div>
              <div className="flex-1 text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {toAirport?.iata ?? segment.to_airport_code ?? '—'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {toAirport?.city ?? segment.to_location ?? 'Zielort'}
                </p>
                {toAirport && <p className="text-[10px] text-slate-400 truncate">{toAirport.name}</p>}
              </div>
            </div>
            {segment.departure_date && (
              <p className="text-center text-sm text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                {formatDateShort(segment.departure_date)}
                {segment.departure_time && ` · ${formatTime(segment.departure_time)} Uhr`}
              </p>
            )}
          </div>

          {/* Live Status */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Flugstatus</h3>
              <FlightStatusBadge
                status={segment.last_flight_status}
                delayMinutes={segment.delay_minutes}
                gateChanged={segment.gate_changed}
                compact
              />
            </div>

            {segment.gate_changed && (
              <GateChangeAlert previousGate={segment.previous_gate} newGate={segment.last_known_gate} />
            )}

            {segment.last_flight_status === 'delayed' && (
              <DelayInfo
                delayMinutes={segment.delay_minutes}
                scheduledTime={segment.departure_time ?? null}
                estimatedTime={segment.last_known_departure ? formatTimeFromTimestamp(segment.last_known_departure) : null}
              />
            )}

            {segment.last_flight_status === 'cancelled' && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle size={16} /> Dieser Flug wurde gestrichen.
              </div>
            )}

            {liveError && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Clock size={14} /> {liveError}
              </div>
            )}

            <LiveUpdateInfo lastUpdate={segment.last_flight_update} onRefresh={refreshStatus} loading={liveLoading} />
          </div>

          {/* Flight Notifications */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing size={16} className="text-slate-500 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Benachrichtigungen</h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              {notifications.length > 0 && unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-primary-600 dark:text-primary-400"
                >
                  Alle gelesen
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center">
                <MessageSquare size={22} className="text-slate-300 dark:text-slate-600 mb-1.5" />
                <p className="text-xs text-slate-400 dark:text-slate-500">Noch keine Benachrichtigungen. Wenn sich etwas an deinem Flug ändert (Gate-Wechsel, Verspätung, etc.), erscheint es hier.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => {
                  const icon = n.notification_type === 'gate_change' ? <MapPin size={15} className="text-orange-500" />
                    : n.notification_type === 'delay' ? <Clock size={15} className="text-amber-500" />
                    : n.notification_type === 'cancellation' ? <AlertTriangle size={15} className="text-red-500" />
                    : n.notification_type === 'boarding' ? <Plane size={15} className="text-sky-500" />
                    : <Bell size={15} className="text-slate-400" />;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-2.5 rounded-xl p-3 ${
                        n.is_read
                          ? 'bg-slate-50 dark:bg-slate-800/40'
                          : 'bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30'
                      }`}
                    >
                      <span className="shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 dark:text-slate-200">{n.message}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          {new Date(n.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
                        </p>
                      </div>
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="shrink-0 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Flugplan</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} /> Abflug</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {segment.departure_date ? formatDateShort(segment.departure_date) : '—'}
                </p>
                {segment.departure_time && <p className="text-sm text-slate-600 dark:text-slate-300">{formatTime(segment.departure_time)} Uhr</p>}
              </div>
              <div>
                <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} /> Ankunft</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {segment.arrival_date ? formatDateShort(segment.arrival_date) : '—'}
                </p>
                {segment.arrival_time && <p className="text-sm text-slate-600 dark:text-slate-300">{formatTime(segment.arrival_time)} Uhr</p>}
              </div>
            </div>
          </div>

          {/* Gate & Terminal */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Gate & Terminal</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailRow icon={<MapPin size={14} />} label="Gate" value={segment.last_known_gate ?? segment.gate} />
              <DetailRow icon={<Building size={14} />} label="Terminal (Abflug)" value={segment.terminal} />
              <DetailRow icon={<Building size={14} />} label="Terminal (Ankunft)" value={segment.arrival_terminal} />
              <DetailRow icon={<Armchair size={14} />} label="Sitzplatz" value={segment.seat} />
            </div>
          </div>

          {/* Booking info */}
          {(segment.booking_number || segment.ticket_number || segment.travel_class || segment.checked_baggage || segment.carry_on_baggage) && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Buchung & Gepäck</h3>
              <div className="grid grid-cols-2 gap-4">
                {segment.booking_number && <DetailRow icon={<Ticket size={14} />} label="Buchungsnummer" value={segment.booking_number} mono />}
                {segment.ticket_number && <DetailRow icon={<Ticket size={14} />} label="Ticketnummer" value={segment.ticket_number} mono />}
                {segment.travel_class && <DetailRow icon={<Armchair size={14} />} label="Reiseklasse" value={segment.travel_class} />}
                {segment.carry_on_baggage && <DetailRow icon={<Luggage size={14} />} label="Handgepäck" value={segment.carry_on_baggage} />}
                {segment.checked_baggage && <DetailRow icon={<Luggage size={14} />} label="Aufgabegepäck" value={segment.checked_baggage} />}
                {segment.baggage_info && <DetailRow icon={<Luggage size={14} />} label="Gepäck-Info" value={segment.baggage_info} />}
              </div>
            </div>
          )}

          {/* Check-in */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Check-in</h3>
              {segment.checkin_open ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-xs px-3 py-1 font-medium">
                  <CheckCircle2 size={12} /> Geöffnet
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs px-3 py-1">
                  <Clock size={12} /> Status unbekannt
                </span>
              )}
            </div>
            <button
              onClick={() => setCheckinSheetOpen(true)}
              className="w-full h-10 rounded-xl border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
            >
              <Bell size={15} /> Check-in-Erinnerung erstellen
            </button>
            {airline?.checkinUrl && (
              <a
                href={airline.checkinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors mt-2"
              >
                <ExternalLink size={15} /> Online-Check-in öffnen
              </a>
            )}
          </div>

          {/* Airline links */}
          {airline?.website && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Airline</h3>
              <a
                href={airline.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                <span>Airline-Website: {airline.name}</span>
                <ExternalLink size={15} />
              </a>
            </div>
          )}

          {/* Live flight tracking */}
          {segment.flight_number && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Live-Verfolgung</h3>
              <a
                href={`https://www.flightaware.com/live/flight/${encodeURIComponent(segment.flight_number)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
              >
                <Plane size={15} /> Flug live verfolgen
              </a>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                Öffnet einen öffentlichen Flugtracker im Browser. Eine Internetverbindung ist erforderlich.
              </p>
            </div>
          )}

          {/* Notes */}
          {segment.segment_notes && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-600 dark:text-slate-300">
              {segment.segment_notes}
            </div>
          )}
        </div>
      </Sheet>

      {checkinSheetOpen && (
        <Sheet open={checkinSheetOpen} onClose={() => setCheckinSheetOpen(false)} title="Check-in-Erinnerung">
          <div className="space-y-2.5">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
              Wann soll dich die App an den Check-in erinnern?
            </p>
            <p className="text-xs text-slate-400 mb-2">
              Abflug: {segment.departure_date ? formatDateShort(segment.departure_date) : '—'}
              {segment.departure_time && ` · ${formatTime(segment.departure_time)} Uhr`}
            </p>
            {(['48h', '24h', '12h', '6h'] as CheckInReminderOffset[]).map((off) => (
              <button
                key={off}
                onClick={() => handleAddCheckinReminder(off)}
                className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center justify-between px-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span>{CHECKIN_REMINDER_LABELS[off]}</span>
                <Bell size={16} className="text-slate-400" />
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">{icon} {label}</p>
      <p className={`text-sm font-medium text-slate-800 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function formatTimeFromTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
