import { useState, useMemo } from 'react';
import { Plus, Trash2, Wallet, TrendingDown } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useOrganizer } from '@/context/OrganizerContext';
import { Sheet } from '@/components/ui/Sheet';
import { EXPENSE_CATEGORIES, TravelExpense } from '@/types';
import { todayISO, formatDateShort } from '@/lib/dateUtils';

const CURRENCIES = ['EUR', 'USD', 'CHF', 'GBP', 'JPY', 'AUD', 'CAD', 'ZAR', 'NAD', 'THB', 'MAD', 'TND', 'EGP', 'TRY', 'CZK', 'PLN', 'SEK', 'NOK', 'DKK', 'HUF', 'RON', 'BGN', 'HRK', 'MXN', 'BRL', 'AR', 'CLP', 'PEN', 'COP', 'UYU', 'PYG', 'VES', 'INR', 'CNY', 'KRW', 'SGD', 'HKD', 'TWD', 'PHP', 'MYR', 'IDR', 'VND', 'KHR', 'LAK', 'MMK', 'BDT', 'PKR', 'LKR', 'NPR', 'BTN', 'MOP'];

export function Expenses() {
  const { tripsApi } = useOrganizer();
  const { trips } = tripsApi;
  const { expenses, loading, addExpense, deleteExpense } = useExpenses();
  const [addOpen, setAddOpen] = useState(false);
  const [filterTrip, setFilterTrip] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!filterTrip) return expenses;
    return expenses.filter((e) => e.trip_id === filterTrip);
  }, [expenses, filterTrip]);

  const totalEur = useMemo(() => {
    return filtered.reduce((sum, e) => sum + (e.amount_eur ?? (e.currency === 'EUR' ? e.amount : 0)), 0);
  }, [filtered]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filtered) {
      const cat = e.category ?? 'Sonstiges';
      const eur = e.amount_eur ?? (e.currency === 'EUR' ? e.amount : 0);
      map[cat] = (map[cat] ?? 0) + eur;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  return (
    <div className="px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Finanzen</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="h-10 px-4 rounded-full bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <Plus size={18} /> Ausgabe
        </button>
      </header>

      {/* Trip filter */}
      {trips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
          <button
            onClick={() => setFilterTrip(null)}
            className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium ${!filterTrip ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            Alle
          </button>
          {trips.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTrip(t.id)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium ${filterTrip === t.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-sky-600 p-5 text-white mb-4 shadow-lg shadow-primary-600/20">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} />
            <span className="text-sm text-white/80">Gesamtausgaben</span>
          </div>
          <p className="text-3xl font-bold">{totalEur.toFixed(2)} €</p>
          {byCategory.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
              {byCategory.slice(0, 4).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between text-xs text-white/85">
                  <span>{cat}</span>
                  <span className="font-medium">{amt.toFixed(2)} €</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-sm text-slate-400 py-8">Lädt…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <TrendingDown size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Ausgaben erfasst.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <ExpenseRow key={e.id} expense={e} tripName={trips.find((t) => t.id === e.trip_id)?.name} onDelete={() => deleteExpense(e.id)} />
          ))}
        </div>
      )}

      {addOpen && (
        <AddExpenseSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          trips={trips}
          onSave={async (data) => { await addExpense(data); setAddOpen(false); }}
        />
      )}
    </div>
  );
}

function ExpenseRow({ expense, tripName, onDelete }: { expense: TravelExpense; tripName?: string; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{expense.label}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{formatDateShort(expense.expense_date)}</span>
          {expense.category && <span>· {expense.category}</span>}
          {tripName && <span className="truncate">· {tripName}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{expense.amount.toFixed(2)} {expense.currency}</p>
        {expense.amount_eur !== null && expense.currency !== 'EUR' && (
          <p className="text-[10px] text-slate-400">{expense.amount_eur.toFixed(2)} €</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
        aria-label="Löschen"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function AddExpenseSheet({ open, onClose, trips, onSave }: {
  open: boolean;
  onClose: () => void;
  trips: { id: string; name: string }[];
  onSave: (data: { label: string; amount: number; currency: string; expense_date: string; category: string | null; trip_id: string | null; notes: string | null }) => Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim() || !amount) return;
    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        amount: parseFloat(amount),
        currency,
        expense_date: date,
        category,
        trip_id: tripId,
        notes: notes.trim() || null,
      });
      setLabel(''); setAmount(''); setCurrency('EUR'); setDate(todayISO()); setCategory(null); setTripId(null); setNotes('');
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
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button onClick={handleSave} disabled={!label.trim() || !amount || saving} className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Bezeichnung</span>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Tanken" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" autoFocus />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Betrag</span>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Währung</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Datum</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Kategorie</span>
          <select value={category ?? ''} onChange={(e) => setCategory(e.target.value || null)} className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500">
            <option value="">Keine</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {trips.length > 0 && (
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Reise</span>
            <select value={tripId ?? ''} onChange={(e) => setTripId(e.target.value || null)} className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500">
              <option value="">Keine Zuordnung</option>
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Notiz (optional)</span>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="z. B. bar bezahlt" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" />
        </label>
      </div>
    </Sheet>
  );
}
