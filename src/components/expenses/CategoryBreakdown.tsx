import { categoryTotalsEur } from '@/lib/expenseMath';
import type { TravelExpense } from '@/types';

export function CategoryBreakdown({ expenses }: { expenses: TravelExpense[] }) {
  const rows = categoryTotalsEur(expenses);
  if (rows.length === 0) return null;
  const max = rows[0].total;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nach Kategorie</h3>
      {rows.map((row) => (
        <div key={row.name}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-200">{row.name}</span>
            <span className="font-medium text-slate-900 dark:text-white">{row.total.toFixed(2)} €</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-500"
              style={{ width: `${max > 0 ? (row.total / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
