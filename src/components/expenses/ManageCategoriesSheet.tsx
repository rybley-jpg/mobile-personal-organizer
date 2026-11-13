import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { RemovableItem } from '@/components/RemovableItem';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/types';

interface ManageCategoriesSheetProps {
  open: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const MAX_NAME_LENGTH = 40;

export function ManageCategoriesSheet({ open, onClose, categories, onAdd, onDelete }: ManageCategoriesSheetProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const isStandard = EXPENSE_CATEGORIES.some((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (isStandard) {
      setError('Diese Kategorie gibt es schon als Standard.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onAdd(trimmed);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die Kategorie konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die Kategorie konnte nicht gelöscht werden.');
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Kategorien">
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Standard</h3>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map((c) => (
              <span key={c} className="h-8 inline-flex items-center px-3 rounded-full bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300">
                {c}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Eigene</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine eigenen Kategorien.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => (
                <RemovableItem key={c.id} label={c.name} onDelete={() => handleDelete(c.id)}>
                  <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3.5 h-11">
                    <span className="text-sm text-slate-800 dark:text-slate-100">{c.name}</span>
                  </div>
                </RemovableItem>
              ))}
            </div>
          )}
        </section>

        <section>
          <label htmlFor="new-category" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Neue Kategorie
          </label>
          <div className="flex gap-2">
            <input
              id="new-category"
              type="text"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="z. B. Mitbringsel"
              className="flex-1 h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || saving}
              className="h-11 px-4 rounded-xl bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-transform"
            >
              <Plus size={16} /> Hinzufügen
            </button>
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </section>
      </div>
    </Sheet>
  );
}
