import { useState } from 'react';
import { SegmentedControl } from '@/components/expenses/SegmentedControl';
import { totalEur, totalsByCurrency } from '@/lib/expenseMath';
import type { TravelExpense } from '@/types';

type SpendMode = 'eur' | 'local';

const MODE_OPTIONS: { value: SpendMode; label: string }[] = [
  { value: 'eur', label: 'Euro' },
  { value: 'local', label: 'Landeswährung' },
];

export function SpendSummary({ expenses }: { expenses: TravelExpense[] }) {
  const [mode, setMode] = useState<SpendMode>('eur');
  const { total, missing } = totalEur(expenses);
  const localTotals = totalsByCurrency(expenses);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Gesamtausgaben</span>
        <div className="w-44">
          <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} ariaLabel="Anzeige der Summe" />
        </div>
      </div>

      {mode === 'eur' ? (
        <>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{total.toFixed(2)} €</p>
          {missing > 0 && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              {missing === 1 ? '1 Ausgabe' : `${missing} Ausgaben`} ohne Kurs {missing === 1 ? 'ist' : 'sind'} nicht in der Summe enthalten.
            </p>
          )}
        </>
      ) : (
        <ul className="space-y-1.5">
          {localTotals.map((t) => (
            <li key={t.currency} className="flex items-baseline justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t.currency}</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{t.amount.toFixed(2)} {t.currency}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
