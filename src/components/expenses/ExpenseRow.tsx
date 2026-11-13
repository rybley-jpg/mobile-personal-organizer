import { RemovableItem } from '@/components/RemovableItem';
import { formatDateShort } from '@/lib/dateUtils';
import type { TravelExpense } from '@/types';

interface ExpenseRowProps {
  expense: TravelExpense;
  onDelete: () => void;
}

export function ExpenseRow({ expense, onDelete }: ExpenseRowProps) {
  const isForeign = expense.currency !== 'EUR';
  return (
    <RemovableItem label={expense.label} onDelete={onDelete}>
      <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{expense.label}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatDateShort(expense.expense_date)}</span>
            {expense.category && <span className="truncate">· {expense.category}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {expense.amount.toFixed(2)} {expense.currency}
          </p>
          {isForeign && <RateNote expense={expense} />}
        </div>
      </div>
    </RemovableItem>
  );
}

function RateNote({ expense }: { expense: TravelExpense }) {
  if (expense.rate_status === 'missing' || expense.amount_eur === null) {
    return (
      <span className="inline-block mt-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
        Kurs fehlt
      </span>
    );
  }
  return (
    <p className="text-[10px] text-slate-500 dark:text-slate-400">
      ≈ {expense.amount_eur.toFixed(2)} €
      {expense.rate_status === 'cached' && <span className="ml-1 text-amber-700 dark:text-amber-300">(alter Kurs)</span>}
    </p>
  );
}
