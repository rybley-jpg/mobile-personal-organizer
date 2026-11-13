import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { SUPPORTED_CURRENCIES } from '@/lib/currencyApi';
import { todayISO } from '@/lib/dateUtils';
import type { ExpenseDraft } from '@/hooks/useExpenses';
import type { Trip } from '@/types';

const FIELD_CLASS = 'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500';
const LABEL_CLASS = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5';

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  trips: Trip[];
  defaultTripId: string | null;
  categories: string[];
  onSave: (draft: ExpenseDraft) => Promise<void>;
}

export function AddExpenseSheet({ open, onClose, trips, defaultTripId, categories, onSave }: AddExpenseSheetProps) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(defaultTripId);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount.replace(',', '.'));
  const valid = label.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0 && tripId !== null;

  const handleSave = async () => {
    if (!valid || !tripId) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        trip_id: tripId,
        label: label.trim(),
        amount: parsedAmount,
        currency,
        expense_date: date,
        category,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      setError('Die Ausgabe konnte nicht gespeichert werden. Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Neue Ausgabe"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {saving ? (currency === 'EUR' ? 'Speichert…' : 'Kurs wird abgerufen…') : 'Speichern'}
          </button>
        </div>
      }
    >
      {trips.length === 0 ? (
        <p className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-300">
          Lege zuerst eine Reise an, damit du die Ausgabe zuordnen kannst.
        </p>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className={LABEL_CLASS}>Reise</span>
            <select value={tripId ?? ''} onChange={(e) => setTripId(e.target.value || null)} className={FIELD_CLASS}>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className={LABEL_CLASS}>Bezeichnung</span>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Tankstelle" className={FIELD_CLASS} autoFocus />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={LABEL_CLASS}>Betrag</span>
              <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className={FIELD_CLASS} />
            </label>
            <label className="block">
              <span className={LABEL_CLASS}>Währung</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={FIELD_CLASS}>
                {SUPPORTED_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
              </select>
            </label>
          </div>

          <label className="block">
            <span className={LABEL_CLASS}>Datum</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD_CLASS} />
          </label>

          <div>
            <span className={LABEL_CLASS}>Kategorie</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(active ? null : c)}
                    aria-pressed={active}
                    className={`h-9 px-3.5 rounded-full text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className={LABEL_CLASS}>Notiz (optional)</span>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z. B. bar bezahlt" className={FIELD_CLASS} />
          </label>

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </Sheet>
  );
}
