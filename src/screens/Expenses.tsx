import { useMemo, useState } from 'react';
import { Plus, Receipt, TrendingDown, Calculator, Tags } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useOrganizer } from '@/context/OrganizerContext';
import { SegmentedControl } from '@/components/expenses/SegmentedControl';
import { SpendSummary } from '@/components/expenses/SpendSummary';
import { CategoryBreakdown } from '@/components/expenses/CategoryBreakdown';
import { ExpenseRow } from '@/components/expenses/ExpenseRow';
import { AddExpenseSheet } from '@/components/expenses/AddExpenseSheet';
import { ManageCategoriesSheet } from '@/components/expenses/ManageCategoriesSheet';
import { YearOverview } from '@/components/expenses/YearOverview';
import { EXPENSE_CATEGORIES } from '@/types';
import { defaultTripId } from '@/lib/expenseMath';
import { todayISO } from '@/lib/dateUtils';

type FinanceView = 'reise' | 'jahr';

const VIEW_OPTIONS: { value: FinanceView; label: string }[] = [
  { value: 'reise', label: 'Reise' },
  { value: 'jahr', label: 'Jahr' },
];

interface ExpensesProps {
  onNavigate: (tab: string) => void;
}

export function Expenses({ onNavigate }: ExpensesProps) {
  const { tripsApi } = useOrganizer();
  const { trips, segments } = tripsApi;
  const { expenses, loading, addExpense, deleteExpense } = useExpenses();
  const categoriesState = useExpenseCategories();
  const [view, setView] = useState<FinanceView>('reise');
  const [pickedTripId, setPickedTripId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const suggestedTripId = useMemo(() => defaultTripId(trips, segments, todayISO()), [trips, segments]);
  const selectedTripId = pickedTripId && trips.some((t) => t.id === pickedTripId) ? pickedTripId : suggestedTripId;
  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;
  const tripExpenses = useMemo(
    () => expenses.filter((e) => e.trip_id === selectedTripId),
    [expenses, selectedTripId],
  );
  const categoryNames = useMemo(
    () => [...EXPENSE_CATEGORIES, ...categoriesState.categories.map((c) => c.name)],
    [categoriesState.categories],
  );

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

      <div className="mb-5">
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} ariaLabel="Ansicht wählen" />
      </div>

      {loading ? (
        <div className="text-center text-sm text-slate-400 py-8">Lädt…</div>
      ) : view === 'jahr' ? (
        <YearOverview expenses={expenses} trips={trips} />
      ) : trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <Receipt size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Lege zuerst eine Reise an, um Ausgaben zu erfassen.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setPickedTripId(t.id)}
                aria-pressed={t.id === selectedTripId}
                className={`shrink-0 max-w-[70vw] h-9 px-3.5 rounded-full text-sm font-medium truncate transition-colors ${
                  t.id === selectedTripId
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <SpendSummary expenses={tripExpenses} />

          {tripExpenses.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5">
              <CategoryBreakdown expenses={tripExpenses} />
            </div>
          )}

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Ausgaben {selectedTrip ? `· ${selectedTrip.name}` : ''}
            </h2>
            {tripExpenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
                <TrendingDown size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Ausgaben für diese Reise.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tripExpenses.map((e) => (
                  <ExpenseRow key={e.id} expense={e} onDelete={() => deleteExpense(e.id)} />
                ))}
              </div>
            )}
          </section>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setCategoriesOpen(true)}
              className="h-9 px-3 rounded-lg text-sm font-medium text-primary-700 dark:text-primary-300 flex items-center gap-1.5"
            >
              <Tags size={16} /> Kategorien verwalten
            </button>
            <button
              onClick={() => onNavigate('funktionen')}
              className="h-9 px-3 rounded-lg text-sm font-medium text-primary-700 dark:text-primary-300 flex items-center gap-1.5"
            >
              <Calculator size={16} /> Währungsrechner
            </button>
          </div>
        </div>
      )}

      {addOpen && (
        <AddExpenseSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          trips={trips}
          defaultTripId={selectedTripId}
          categories={categoryNames}
          onSave={async (draft) => { await addExpense(draft); }}
        />
      )}

      <ManageCategoriesSheet
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        categories={categoriesState.categories}
        onAdd={categoriesState.addCategory}
        onDelete={categoriesState.deleteCategory}
      />
    </div>
  );
}
