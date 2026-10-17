import { useState, useMemo } from 'react';
import { Plus, Trash2, FolderOpen, FileText, Plane, Hotel, Car, Package, CheckSquare, Square } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { usePacklist } from '@/hooks/usePacklist';
import { Sheet } from '@/components/ui/Sheet';
import { PACKLIST_CATEGORIES, PacklistItem } from '@/types';

export function Packlist({ onClose }: { onClose: () => void }) {
  const { tripsApi } = useOrganizer();
  const { trips } = tripsApi;
  const [tripFilter, setTripFilter] = useState<string | null>(null);
  const { items, loading, addItem, toggleItem, deleteItem } = usePacklist(tripFilter ?? undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, PacklistItem[]> = {};
    for (const item of items) {
      const cat = item.category ?? 'Sonstiges';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return Object.entries(map);
  }, [items]);

  const checkedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await addItem({ label: newLabel.trim(), category: newCategory, trip_id: tripFilter, checked: false, sort_index: items.length });
    setNewLabel('');
    setNewCategory(null);
  };

  return (
    <Sheet open={true} onClose={onClose} title="Packliste" footer={
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Schließen</button>
      </div>
    }>
      <div className="space-y-4">
        {/* Trip filter */}
        {trips.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            <button
              onClick={() => setTripFilter(null)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium ${!tripFilter ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
            >
              Allgemein
            </button>
            {trips.map((t) => (
              <button
                key={t.id}
                onClick={() => setTripFilter(t.id)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium ${tripFilter === t.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Progress */}
        {items.length > 0 && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{checkedCount} von {items.length} eingepackt</span>
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full bg-primary-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Add new */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Was packen?"
            className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
          />
          <select
            value={newCategory ?? ''}
            onChange={(e) => setNewCategory(e.target.value || null)}
            className="h-10 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
          >
            <option value="">Kategorie</option>
            {PACKLIST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={handleAdd}
            disabled={!newLabel.trim()}
            className="h-10 w-10 rounded-xl bg-primary-600 text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
            aria-label="Hinzufügen"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Items grouped by category */}
        {loading ? (
          <p className="text-center text-sm text-slate-400 py-4">Lädt…</p>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">Noch nichts auf der Packliste.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([cat, catItems]) => (
              <div key={cat}>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">{cat}</h3>
                <div className="space-y-1.5">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3">
                      <button
                        onClick={() => toggleItem(item.id, item.checked)}
                        className="shrink-0 text-primary-600 dark:text-primary-400"
                        aria-label={item.checked ? 'Abhaken' : 'Als eingepackt markieren'}
                      >
                        {item.checked ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300 dark:text-slate-600" />}
                      </button>
                      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                        {item.label}
                      </span>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="shrink-0 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                        aria-label="Entfernen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
