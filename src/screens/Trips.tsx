import { useMemo, useState } from 'react';
import { Plus, Plane, Hotel, Car, Package, MapPin, Phone, ExternalLink, Trash2, ChevronRight, Clock, Calendar, Pencil, Wallet } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { Trip, TripSegment, SegmentType } from '@/types';
import { SEGMENT_TYPE_LABELS } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { FlightDetail } from '@/components/FlightDetail';
import { FlightStatusBadge } from '@/components/FlightStatusBadge';
import { SegmentEditor } from '@/components/SegmentEditor';
import { TravelChecklist } from '@/components/TravelChecklist';
import { WalletPanel } from '@/components/WalletPanel';
import { formatRelativeDate, formatTime, formatDateShort, todayISO } from '@/lib/dateUtils';
import { generateSuggestedFlightReminders } from '@/lib/tripReminders';

const SEGMENT_ICON: Record<SegmentType, typeof Plane> = {
  flug: Plane,
  hotel: Hotel,
  mietwagen: Car,
  sonstiges: Package,
};

export function Trips() {
  const { tripsApi } = useOrganizer();
  const { trips, segments } = tripsApi;
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sortedTrips = useMemo(() => {
    const today = todayISO();
    return [...trips].sort((a, b) => {
      const aSegs = segments.filter((s) => s.trip_id === a.id);
      const bSegs = segments.filter((s) => s.trip_id === b.id);
      const aDate = aSegs.sort((x, y) => x.order_index - y.order_index)[0]?.departure_date ?? '9999';
      const bDate = bSegs.sort((x, y) => x.order_index - y.order_index)[0]?.departure_date ?? '9999';
      const aUpcoming = aDate >= today ? 0 : 1;
      const bUpcoming = bDate >= today ? 0 : 1;
      if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
      return aDate.localeCompare(bDate);
    });
  }, [trips, segments]);

  return (
    <div className="px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reisen</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="h-10 px-4 rounded-full bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <Plus size={18} /> Reise
        </button>
      </header>

      {sortedTrips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <Plane size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Reisen angelegt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTrips.map((trip) => {
            const tripSegs = segments.filter((s) => s.trip_id === trip.id).sort((a, b) => a.order_index - b.order_index);
            const firstSeg = tripSegs[0];
            const isUpcoming = firstSeg?.departure_date && firstSeg.departure_date >= todayISO();
            return (
              <button
                key={trip.id}
                onClick={() => setSelectedTrip(trip)}
                className="w-full text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">{trip.name}</h3>
                      {isUpcoming && <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300">Geplant</span>}
                    </div>
                    {trip.destination && <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={13} /> {trip.destination}</p>}
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 shrink-0" />
                </div>
                {firstSeg && (
                  <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {firstSeg.departure_date && formatRelativeDate(firstSeg.departure_date)}</span>
                    {firstSeg.from_location && firstSeg.to_location && (
                      <span className="flex items-center gap-1">{firstSeg.from_location} → {firstSeg.to_location}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectedTrip && (
        <TripDetail trip={selectedTrip} onClose={() => setSelectedTrip(null)} />
      )}
      <AddTripSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function TripDetail({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { tripsApi } = useOrganizer();
  const tripSegs = tripsApi.segments.filter((s: TripSegment) => s.trip_id === trip.id).sort((a, b) => a.order_index - b.order_index);
  const [suggestSheet, setSuggestSheet] = useState(false);
  const [flightDetailSeg, setFlightDetailSeg] = useState<TripSegment | null>(null);
  const [segEditorOpen, setSegEditorOpen] = useState(false);
  const [editingSeg, setEditingSeg] = useState<TripSegment | null>(null);

  return (
    <>
    <Sheet open={!!trip && !flightDetailSeg && !segEditorOpen} onClose={onClose} title={trip.name}>
      <div className="space-y-5">
        {trip.destination && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <MapPin size={15} /> {trip.destination}
          </div>
        )}

        {trip.notes && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-600 dark:text-slate-300">
            {trip.notes}
          </div>
        )}

        {/* Timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reiseverlauf</h3>
            <button
              onClick={() => { setEditingSeg(null); setSegEditorOpen(true); }}
              className="h-8 px-3 rounded-full bg-primary-600 text-white text-xs font-medium flex items-center gap-1 active:scale-95 transition-transform"
            >
              <Plus size={14} /> Etappe
            </button>
          </div>
          {tripSegs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-2">Noch keine Etappen.</p>
              <button
                onClick={() => { setEditingSeg(null); setSegEditorOpen(true); }}
                className="text-sm font-medium text-primary-600 dark:text-primary-400"
              >
                Erste Etappe hinzufügen
              </button>
            </div>
          ) : (
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-4">
              {tripSegs.map((seg, idx) => {
                const Icon = SEGMENT_ICON[seg.segment_type];
                return (
                  <div key={seg.id} className="relative">
                    <span className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                      <Icon size={11} />
                    </span>
                    <div
                      className={`relative rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-3.5 ${seg.segment_type === 'flug' ? 'hover:border-primary-300 dark:hover:border-primary-700 active:scale-[0.98] transition-all' : ''}`}
                    >
                      <button
                        onClick={() => seg.segment_type === 'flug' ? setFlightDetailSeg(seg) : undefined}
                        className={`w-full text-left ${seg.segment_type === 'flug' ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{SEGMENT_TYPE_LABELS[seg.segment_type]}</span>
                        {seg.order_index > 0 && <span className="text-[10px] text-slate-400">Etappe {idx + 1}</span>}
                      </div>
                      {seg.title && <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-1">{seg.title}</p>}

                      {seg.from_location && seg.to_location && (
                        <div className="flex items-center gap-2 mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                          <span>{seg.from_location}</span>
                          <ChevronRight size={14} className="text-slate-400" />
                          <span>{seg.to_location}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {seg.departure_date && (
                          <span className="flex items-center gap-1"><Calendar size={11} /> {formatDateShort(seg.departure_date)}{seg.departure_time && ` · ${formatTime(seg.departure_time)}`}</span>
                        )}
                        {seg.arrival_date && (
                          <span className="flex items-center gap-1"><Clock size={11} /> Ankunft {formatDateShort(seg.arrival_date)}{seg.arrival_time && ` · ${formatTime(seg.arrival_time)}`}</span>
                        )}
                      </div>

                      {(seg.airline || seg.flight_number || seg.booking_number || seg.terminal || seg.gate || seg.seat || seg.baggage_info) && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                          {seg.airline && <Detail label="Fluggesellschaft" value={seg.airline} />}
                          {seg.flight_number && <Detail label="Flugnummer" value={seg.flight_number} />}
                          {seg.booking_number && <Detail label="Buchungsnummer" value={seg.booking_number} mono />}
                          {seg.terminal && <Detail label="Terminal" value={seg.terminal} />}
                          {seg.gate && <Detail label="Gate" value={seg.gate} />}
                          {seg.seat && <Detail label="Sitzplatz" value={seg.seat} />}
                          {seg.baggage_info && <Detail label="Gepäck" value={seg.baggage_info} />}
                        </div>
                      )}
                      {seg.segment_type === 'flug' && seg.last_flight_status && (
                        <div className="mt-2">
                          <FlightStatusBadge
                            status={seg.last_flight_status}
                            delayMinutes={seg.delay_minutes}
                            gateChanged={seg.gate_changed}
                            compact
                          />
                        </div>
                      )}

                      {seg.segment_type === 'flug' && (
                        <div className="mt-2 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400">Tippe für Flugdetails & Live-Status →</span>
                        </div>
                      )}
                      </button>
                      <button
                        onClick={() => { setEditingSeg(seg); setSegEditorOpen(true); }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        aria-label="Bearbeiten"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>

        {/* Travel Checklist */}
        <TravelChecklist tripId={trip.id} />

        {/* Wallet */}
        <WalletPanel tripId={trip.id} />

        {/* Cost summary */}
        {tripSegs.some((s) => s.price_amount != null) && (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Reisekosten</h3>
            <div className="space-y-1.5 mb-3">
              {tripSegs.filter((s) => s.price_amount != null).map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{SEGMENT_TYPE_LABELS[s.segment_type]}{s.title ? `: ${s.title}` : ''}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {s.price_amount?.toFixed(2)} {s.price_currency ?? 'EUR'}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Gesamtkosten</span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {tripSegs
                  .filter((s) => s.price_amount != null && (s.price_currency ?? 'EUR') === 'EUR')
                  .reduce((sum, s) => sum + (s.price_amount ?? 0), 0)
                  .toFixed(2)} EUR
              </span>
            </div>
          </div>
        )}

        {/* Contact info */}
        {(trip.contact_person || trip.contact_phone || trip.booking_links) && (
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Ansprechpartner & Links</h3>
            <div className="space-y-2">
              {trip.contact_person && <div className="text-sm text-slate-600 dark:text-slate-300">{trip.contact_person}</div>}
              {trip.contact_phone && (
                <a href={`tel:${trip.contact_phone}`} className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-medium">
                  <Phone size={15} /> {trip.contact_phone}
                </a>
              )}
              {trip.booking_links && (
                <a href={trip.booking_links} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 font-medium">
                  <ExternalLink size={15} /> Buchung öffnen
                </a>
              )}
            </div>
          </div>
        )}

        {tripSegs.some((s) => s.price_amount != null) && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <Wallet size={11} />
            <span>
              Gesamtkosten:{' '}
              {tripSegs
                .filter((s) => s.price_amount != null && (s.price_currency ?? 'EUR') === 'EUR')
                .reduce((sum, s) => sum + (s.price_amount ?? 0), 0)
                .toFixed(2)} EUR
            </span>
          </div>
        )}

        {/* Suggested reminders */}
        <div>
          <button
            onClick={() => setSuggestSheet(true)}
            className="w-full h-11 rounded-xl border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
          >
            <Calendar size={16} /> Erinnerungen vorschlagen
          </button>
        </div>

        <button
          onClick={async () => {
            await tripsApi.deleteTrip(trip.id);
            onClose();
          }}
          className="w-full h-11 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <Trash2 size={16} /> Reise löschen
        </button>
      </div>

      <SuggestedRemindersSheet open={suggestSheet} onClose={() => setSuggestSheet(false)} trip={trip} segments={tripSegs} />
    </Sheet>

    {segEditorOpen && (
      <SegmentEditor
        open={segEditorOpen}
        onClose={() => { setSegEditorOpen(false); setEditingSeg(null); }}
        tripId={trip.id}
        segment={editingSeg}
      />
    )}

    {flightDetailSeg && (
      <FlightDetail
        segment={flightDetailSeg}
        open={!!flightDetailSeg}
        onClose={() => setFlightDetailSeg(null)}
        tripName={trip.name}
      />
    )}
    </>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      <p className={`text-slate-700 dark:text-slate-200 font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function SuggestedRemindersSheet({ open, onClose, trip, segments }: { open: boolean; onClose: () => void; trip: Trip; segments: TripSegment[] }) {
  const { tasksApi, categoriesApi } = useOrganizer();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);

  const suggestions = useMemo(() => {
    const flightSegs = segments.filter((s) => s.segment_type === 'flug');
    const all = flightSegs.flatMap((s) => generateSuggestedFlightReminders(s));
    // de-duplicate by title
    const seen = new Set<string>();
    return all.filter((s) => {
      if (seen.has(s.title)) return false;
      seen.add(s.title);
      return true;
    });
  }, [segments]);

  const handleAdd = async (idx: number) => {
    setSaving(true);
    const s = suggestions[idx];
    const cat = categoriesApi.categories.find((c) => c.name === 'Reise');
    try {
      await tasksApi.addTask({
        title: s.title,
        description: `Automatisch vorgeschlagen für ${trip.name}`,
        due_date: s.due_date,
        due_time: s.due_time,
        priority: s.priority,
        category_id: cat?.id ?? null,
        repeat_rule: null,
        reminder_offset: '1d',
        trip_id: trip.id,
        status: 'offen',
        is_suggested: true,
      });
      setSaved((prev) => [...prev, s.title]);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Vorgeschlagene Erinnerungen">
      <div className="space-y-2.5">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Basierend auf deinen Flugdaten hat die App sinnvolle Erinnerungen vorbereitet. Tippe eine an, um sie als Aufgabe zu übernehmen.
        </p>
        {suggestions.map((s, idx) => {
          const isSaved = saved.includes(s.title);
          return (
            <div key={idx} className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{s.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatRelativeDate(s.due_date)}{s.due_time && ` · ${formatTime(s.due_time)}`}
                </p>
              </div>
              <button
                onClick={() => handleAdd(idx)}
                disabled={isSaved || saving}
                className={`shrink-0 h-9 px-3 rounded-full text-xs font-semibold transition-colors ${
                  isSaved
                    ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isSaved ? 'Übernommen' : 'Übernehmen'}
              </button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function AddTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { tripsApi } = useOrganizer();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await tripsApi.addTrip({ name: name.trim(), destination: destination.trim() || null, notes: notes.trim() || null });
      setName('');
      setDestination('');
      setNotes('');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Neue Reise"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Speichert…' : 'Reise anlegen'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Name der Reise</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Namibia-Reise" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" autoFocus />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Reiseziel</span>
          <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="z. B. Windhoek, Namibia" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Wichtige Hinweise</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="z. B. Visum, Impfungen…" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 resize-none" />
        </label>
      </div>
    </Sheet>
  );
}
