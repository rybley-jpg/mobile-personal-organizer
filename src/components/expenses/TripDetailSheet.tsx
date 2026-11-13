import { Sheet } from '@/components/ui/Sheet';
import { SpendSummary } from '@/components/expenses/SpendSummary';
import { CategoryBreakdown } from '@/components/expenses/CategoryBreakdown';
import type { TravelExpense } from '@/types';

interface TripDetailSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  expenses: TravelExpense[];
}

export function TripDetailSheet({ open, onClose, title, subtitle, expenses }: TripDetailSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="space-y-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {subtitle} · {expenses.length} {expenses.length === 1 ? 'Ausgabe' : 'Ausgaben'}
        </p>
        <SpendSummary expenses={expenses} />
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5">
          <CategoryBreakdown expenses={expenses} />
        </div>
      </div>
    </Sheet>
  );
}
