import { useState } from 'react';
import { Check, Plus, X, ListChecks, Calendar, AlertCircle } from 'lucide-react';
import { useTravelChecklist } from '@/hooks/useTravelChecklist';
import { todayISO, formatDateShort } from '@/lib/dateUtils';

export function TravelChecklist({ tripId }: { tripId: string }) {
  const { items, addItem, toggleItem, deleteItem, updateDeadline, seedDefaultItems, loading } = useTravelChecklist(tripId);
  const [newItem, setNewItem] = useState('');

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const today = todayISO();

  const handleAdd = () => {
    if (!newItem.trim()) return;
    addItem(newItem.trim());
    setNewItem('');
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reise-Checkliste</h3>
        </div>
        <p className="text-sm text-slate-400">Lädt…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reise-Checkliste</h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Noch keine Checklistenpunkte. Lade die Standardliste oder füge eigene Punkte hinzu.
        </p>
        <button
          onClick={() => seedDefaultItems()}
          className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors"
        >
          Standardliste laden
        </button>
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            placeholder="Eigener Punkt…"
            className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
          />
          <button
            onClick={handleAdd}
            className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 flex items-center justify-center"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reise-Checkliste</h3>
        </div>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {checkedCount} von {totalCount} erledigt
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden">
        <div
          className="h-full bg-primary-600 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-1.5">
        {items.map((item) => {
          const isOverdue = !item.checked && item.deadline && item.deadline < today;
          return (
            <div key={item.id} className={`flex items-center gap-2 group rounded-lg px-1.5 py-1 transition-colors ${isOverdue ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
              <button
                onClick={() => toggleItem(item.id)}
                className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  item.checked
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : isOverdue
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {item.checked && <Check size={12} strokeWidth={3} />}
              </button>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm block truncate ${
                    item.checked
                      ? 'line-through text-slate-400 dark:text-slate-600'
                      : isOverdue
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {/* Deadline display / picker */}
              <label className="shrink-0 cursor-pointer relative">
                <input
                  type="date"
                  value={item.deadline ?? ''}
                  onChange={(e) => updateDeadline(item.id, e.target.value || null)}
                  className="sr-only"
                />
                <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                  isOverdue
                    ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 font-semibold'
                    : item.deadline
                      ? 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800'
                      : 'text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100'
                }`}>
                  {isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
                  {item.deadline ? formatDateShort(item.deadline) : 'Frist'}
                </span>
              </label>
              {item.is_custom && (
                <button
                  onClick={() => deleteItem(item.id)}
                  className="shrink-0 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="shrink-0 w-5 h-5" />
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder="Eigener Punkt hinzufügen…"
          className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
        />
        <button
          onClick={handleAdd}
          className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 flex items-center justify-center"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
