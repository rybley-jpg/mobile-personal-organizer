import { useMemo, useState } from 'react';
import { ChevronRight, Receipt } from 'lucide-react';
import { TripDetailSheet } from '@/components/expenses/TripDetailSheet';
import { expenseYears, totalEur, yearTripGroups } from '@/lib/expenseMath';
import type { Trip, TravelExpense } from '@/types';

interface YearOverviewProps {
  expenses: TravelExpense[];
  trips: Trip[];
}

export function YearOverview({ expenses, trips }: YearOverviewProps) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => expenseYears(expenses, currentYear), [expenses, currentYear]);
  const [year, setYear] = useState(currentYear);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const groups = useMemo(() => yearTripGroups(expenses, year, trips), [expenses, year, trips]);
  const openGroup = groups.find((g) => g.key === openKey) ?? null;
  const yearExpenses = useMemo(() => groups.flatMap((g) => g.expenses), [groups]);
  const grand = totalEur(yearExpenses);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            aria-pressed={y === year}
            className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium transition-colors ${
              y === year
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Summe {year} in Euro</span>
        <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{grand.total.toFixed(2)} €</p>
        {grand.missing > 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {grand.missing === 1 ? '1 Ausgabe' : `${grand.missing} Ausgaben`} ohne Kurs {grand.missing === 1 ? 'ist' : 'sind'} nicht enthalten.
          </p>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <Receipt size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Für {year} sind keine Ausgaben erfasst.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const sum = totalEur(group.expenses);
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => setOpenKey(group.key)}
                className="w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 text-left transition-colors hover:border-primary-200 dark:hover:border-primary-500/40 active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{group.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {group.expenses.length} {group.expenses.length === 1 ? 'Ausgabe' : 'Ausgaben'}
                    {sum.missing > 0 && <span className="text-amber-700 dark:text-amber-300"> · {sum.missing} ohne Kurs</span>}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white shrink-0">{sum.total.toFixed(2)} €</p>
                <ChevronRight size={18} className="text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      <TripDetailSheet
        open={openGroup !== null}
        onClose={() => setOpenKey(null)}
        title={openGroup?.name ?? ''}
        subtitle={`Jahr ${year}`}
        expenses={openGroup?.expenses ?? []}
      />
    </div>
  );
}
