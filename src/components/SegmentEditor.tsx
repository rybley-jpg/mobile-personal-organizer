import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { useOrganizer } from '@/context/OrganizerContext';
import { TripSegment, SegmentType, TravelClass, TRAVEL_CLASS_LABELS, SEGMENT_TYPE_LABELS } from '@/types';
import { AirlineSelector } from '@/components/AirlineSelector';
import { AirportSelector } from '@/components/AirportSelector';

interface SegmentEditorProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  segment?: TripSegment | null;
}

type SegmentDraft = {
  segment_type: SegmentType;
  title: string;
  from_location: string;
  to_location: string;
  from_airport_code: string;
  to_airport_code: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  booking_number: string;
  terminal: string;
  gate: string;
  seat: string;
  baggage_info: string;
  travel_class: TravelClass | '';
  carry_on_baggage: string;
  checked_baggage: string;
  segment_notes: string;
  price_amount: string;
  price_currency: string;
  order_index: number;
  train_number: string;
  train_operator: string;
  platform: string;
  wagon: string;
  seat_number: string;
};

const EMPTY_DRAFT: SegmentDraft = {
  segment_type: 'flug',
  title: '',
  from_location: '',
  to_location: '',
  from_airport_code: '',
  to_airport_code: '',
  departure_date: '',
  departure_time: '',
  arrival_date: '',
  arrival_time: '',
  airline: '',
  flight_number: '',
  booking_number: '',
  terminal: '',
  gate: '',
  seat: '',
  baggage_info: '',
  travel_class: '',
  carry_on_baggage: '',
  checked_baggage: '',
  segment_notes: '',
  price_amount: '',
  price_currency: 'EUR',
  order_index: 0,
  train_number: '',
  train_operator: '',
  platform: '',
  wagon: '',
  seat_number: '',
};

export function SegmentEditor({ open, onClose, tripId, segment }: SegmentEditorProps) {
  const { tripsApi } = useOrganizer();
  const [draft, setDraft] = useState<SegmentDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (segment) {
      setDraft({
        segment_type: segment.segment_type,
        title: segment.title ?? '',
        from_location: segment.from_location ?? '',
        to_location: segment.to_location ?? '',
        from_airport_code: segment.from_airport_code ?? '',
        to_airport_code: segment.to_airport_code ?? '',
        departure_date: segment.departure_date ?? '',
        departure_time: segment.departure_time ?? '',
        arrival_date: segment.arrival_date ?? '',
        arrival_time: segment.arrival_time ?? '',
        airline: segment.airline ?? '',
        flight_number: segment.flight_number ?? '',
        booking_number: segment.booking_number ?? '',
        terminal: segment.terminal ?? '',
        gate: segment.gate ?? '',
        seat: segment.seat ?? '',
        baggage_info: segment.baggage_info ?? '',
        travel_class: segment.travel_class ?? '',
        carry_on_baggage: segment.carry_on_baggage ?? '',
        checked_baggage: segment.checked_baggage ?? '',
        segment_notes: segment.segment_notes ?? '',
        price_amount: segment.price_amount != null ? String(segment.price_amount) : '',
        price_currency: segment.price_currency ?? 'EUR',
        order_index: segment.order_index,
        train_number: segment.train_number ?? '',
        train_operator: segment.train_operator ?? '',
        platform: segment.platform ?? '',
        wagon: segment.wagon ?? '',
        seat_number: segment.seat_number ?? '',
      });
    } else {
      const existingSegs = tripsApi.segments.filter((s) => s.trip_id === tripId);
      setDraft({ ...EMPTY_DRAFT, order_index: existingSegs.length });
    }
  }, [open, segment, tripId, tripsApi.segments]);

  const update = <K extends keyof SegmentDraft>(key: K, value: SegmentDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!draft.departure_date.trim()) {
      setError('Bitte gib mindestens ein Abflugdatum ein.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        trip_id: tripId,
        segment_type: draft.segment_type,
        title: draft.title.trim() || null,
        from_location: draft.from_location.trim() || null,
        to_location: draft.to_location.trim() || null,
        from_airport_code: draft.from_airport_code.trim() || null,
        to_airport_code: draft.to_airport_code.trim() || null,
        departure_date: draft.departure_date || null,
        departure_time: draft.departure_time || null,
        arrival_date: draft.arrival_date || null,
        arrival_time: draft.arrival_time || null,
        airline: draft.airline.trim() || null,
        flight_number: draft.flight_number.trim() || null,
        booking_number: draft.booking_number.trim() || null,
        terminal: draft.terminal.trim() || null,
        gate: draft.gate.trim() || null,
        seat: draft.seat.trim() || null,
        baggage_info: draft.baggage_info.trim() || null,
        travel_class: (draft.travel_class || null) as TravelClass | null,
        carry_on_baggage: draft.carry_on_baggage.trim() || null,
        checked_baggage: draft.checked_baggage.trim() || null,
        segment_notes: draft.segment_notes.trim() || null,
        price_amount: draft.price_amount ? parseFloat(draft.price_amount) : null,
        price_currency: draft.price_currency || 'EUR',
        order_index: draft.order_index,
        train_number: draft.train_number.trim() || null,
        train_operator: draft.train_operator.trim() || null,
        platform: draft.platform.trim() || null,
        wagon: draft.wagon.trim() || null,
        seat_number: draft.seat_number.trim() || null,
      };
      if (segment) {
        await tripsApi.updateSegment(segment.id, payload);
      } else {
        await tripsApi.addSegment(payload);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!segment) return;
    setSaving(true);
    try {
      await tripsApi.deleteSegment(segment.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const isFlight = draft.segment_type === 'flug';
  const isTrain = draft.segment_type === 'bahn';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={segment ? 'Etappe bearbeiten' : 'Etappe hinzufügen'}
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Abbrechen
          </button>
          {segment && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="h-11 px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Segment type */}
        <Field label="Typ">
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(SEGMENT_TYPE_LABELS) as SegmentType[]).map((t) => (
              <button
                key={t}
                onClick={() => update('segment_type', t)}
                className={`h-10 rounded-xl text-xs font-medium transition-colors ${
                  draft.segment_type === t
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {SEGMENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Bezeichnung">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder={isFlight ? 'z. B. Flug nach Windhoek' : 'z. B. Hotel Übernachtung'}
            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
          />
        </Field>

        {/* Locations */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Von / Startort">
            <input
              type="text"
              value={draft.from_location}
              onChange={(e) => update('from_location', e.target.value)}
              placeholder="z. B. Frankfurt"
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
          <Field label="Nach / Zielort">
            <input
              type="text"
              value={draft.to_location}
              onChange={(e) => update('to_location', e.target.value)}
              placeholder="z. B. Windhoek"
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
        </div>

        {/* Airport codes (flight only) */}
        {isFlight && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Flughafen (Abflug)">
              <AirportSelector
                value=""
                code={draft.from_airport_code || null}
                onChange={(airport) => update('from_airport_code', airport?.iata ?? '')}
                placeholder="z. B. FRA"
              />
            </Field>
            <Field label="Flughafen (Ankunft)">
              <AirportSelector
                value=""
                code={draft.to_airport_code || null}
                onChange={(airport) => update('to_airport_code', airport?.iata ?? '')}
                placeholder="z. B. WDH"
              />
            </Field>
          </div>
        )}

        {/* Departure */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Abflugdatum">
            <input
              type="date"
              value={draft.departure_date}
              onChange={(e) => update('departure_date', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
          <Field label="Abflugzeit">
            <input
              type="time"
              value={draft.departure_time}
              onChange={(e) => update('departure_time', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
        </div>

        {/* Arrival */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ankunftsdatum">
            <input
              type="date"
              value={draft.arrival_date}
              onChange={(e) => update('arrival_date', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
          <Field label="Ankunftszeit">
            <input
              type="time"
              value={draft.arrival_time}
              onChange={(e) => update('arrival_time', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
        </div>

        {/* Flight-specific fields */}
        {isFlight && (
          <>
            <Field label="Fluggesellschaft">
              <AirlineSelector
                value={draft.airline}
                onChange={(airline) => update('airline', airline?.name ?? '')}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Flugnummer">
                <input
                  type="text"
                  value={draft.flight_number}
                  onChange={(e) => update('flight_number', e.target.value)}
                  placeholder="z. B. LH 570"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
              <Field label="Buchungsnummer">
                <input
                  type="text"
                  value={draft.booking_number}
                  onChange={(e) => update('booking_number', e.target.value)}
                  placeholder="z. B. X7K2LP"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Terminal">
                <input
                  type="text"
                  value={draft.terminal}
                  onChange={(e) => update('terminal', e.target.value)}
                  placeholder="z. B. 1"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
              <Field label="Gate">
                <input
                  type="text"
                  value={draft.gate}
                  onChange={(e) => update('gate', e.target.value)}
                  placeholder="z. B. A15"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Sitzplatz">
                <input
                  type="text"
                  value={draft.seat}
                  onChange={(e) => update('seat', e.target.value)}
                  placeholder="z. B. 12A"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
              <Field label="Reiseklasse">
                <select
                  value={draft.travel_class}
                  onChange={(e) => update('travel_class', e.target.value as TravelClass | '')}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="">Keine Angabe</option>
                  {(Object.keys(TRAVEL_CLASS_LABELS) as TravelClass[]).map((tc) => (
                    <option key={tc} value={tc}>{TRAVEL_CLASS_LABELS[tc]}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Handgepäck">
                <select
                  value={draft.carry_on_baggage}
                  onChange={(e) => update('carry_on_baggage', e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="">Keines</option>
                  <option value="1 x 4kg">1 × 4 kg</option>
                  <option value="1 x 6kg">1 × 6 kg</option>
                  <option value="1 x 8kg">1 × 8 kg</option>
                  <option value="1 x 10kg">1 × 10 kg</option>
                  <option value="2 x 8kg">2 × 8 kg</option>
                  <option value="__custom">Eigener Wert…</option>
                </select>
              </Field>
              <Field label="Aufgabegepäck">
                <select
                  value={draft.checked_baggage}
                  onChange={(e) => update('checked_baggage', e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="">Keines</option>
                  <option value="1 x 23kg">1 × 23 kg</option>
                  <option value="1 x 24kg">1 × 24 kg</option>
                  <option value="1 x 25kg">1 × 25 kg</option>
                  <option value="1 x 26kg">1 × 26 kg</option>
                  <option value="2 x 23kg">2 × 23 kg</option>
                  <option value="2 x 24kg">2 × 24 kg</option>
                  <option value="2 x 25kg">2 × 25 kg</option>
                  <option value="2 x 26kg">2 × 26 kg</option>
                  <option value="__custom">Eigener Wert…</option>
                </select>
              </Field>
            </div>
            {draft.carry_on_baggage === '__custom' && (
              <Field label="Handgepäck (eigener Wert)">
                <input
                  type="text"
                  value=""
                  onChange={(e) => update('carry_on_baggage', e.target.value)}
                  placeholder="z. B. 1 x 12kg"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
            )}
            {draft.checked_baggage === '__custom' && (
              <Field label="Aufgabegepäck (eigener Wert)">
                <input
                  type="text"
                  value=""
                  onChange={(e) => update('checked_baggage', e.target.value)}
                  placeholder="z. B. 3 x 20kg"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
            )}
          </>
        )}

        {/* Train-specific fields */}
        {isTrain && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Zugnummer">
                <input
                  type="text"
                  value={draft.train_number}
                  onChange={(e) => update('train_number', e.target.value)}
                  placeholder="z. B. ICE 628"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 font-mono"
                />
              </Field>
              <Field label="Verkehrsunternehmen">
                <input
                  type="text"
                  value={draft.train_operator}
                  onChange={(e) => update('train_operator', e.target.value)}
                  placeholder="z. B. DB Fernverkehr"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Gleis">
                <input
                  type="text"
                  value={draft.platform}
                  onChange={(e) => update('platform', e.target.value)}
                  placeholder="z. B. 7"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
              <Field label="Buchungsnummer">
                <input
                  type="text"
                  value={draft.booking_number}
                  onChange={(e) => update('booking_number', e.target.value)}
                  placeholder="z. B. QKL2XY"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 font-mono"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Wagen">
                <input
                  type="text"
                  value={draft.wagon}
                  onChange={(e) => update('wagon', e.target.value)}
                  placeholder="z. B. 12"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
              <Field label="Sitzplatz">
                <input
                  type="text"
                  value={draft.seat_number}
                  onChange={(e) => update('seat_number', e.target.value)}
                  placeholder="z. B. 42"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </Field>
            </div>
          </>
        )}

        <Field label="Notizen">
          <textarea
            value={draft.segment_notes}
            onChange={(e) => update('segment_notes', e.target.value)}
            rows={2}
            placeholder="Optional"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Preis">
            <input
              type="number"
              inputMode="decimal"
              value={draft.price_amount}
              onChange={(e) => update('price_amount', e.target.value)}
              placeholder="0.00"
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
          <Field label="Währung">
            <select
              value={draft.price_currency}
              onChange={(e) => update('price_currency', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CHF">CHF</option>
              <option value="NAD">NAD (N$)</option>
              <option value="ZAR">ZAR (R)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="USD">USD ($)</option>
            </select>
          </Field>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
