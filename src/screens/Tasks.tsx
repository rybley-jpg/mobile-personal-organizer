import { useMemo, useState } from 'react';
import { Search as SearchIcon, Trash2, CheckSquare, X } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { SwipeableTaskItem } from '@/components/SwipeableTaskItem';
import { TaskEditor } from '@/components/TaskEditor';
import { ConfirmDialog, shouldSkipDeleteConfirm } from '@/components/ConfirmDialog';

import { Task } from '@/types';
import { sortTasks, isOverdue } from '@/lib/dateUtils';
import { CategoryIcon } from '@/components/CategoryIcon';

type FilterKey = 'alle' | 'offen' | 'erledigt' | 'hoch' | 'überfällig';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'offen', label: 'Offen' },
  { key: 'alle', label: 'Alle' },
  { key: 'hoch', label: 'Wichtig' },
  { key: 'überfällig', label: 'Überfällig' },
  { key: 'erledigt', label: 'Erledigt' },
];

interface TasksProps {
  onOpenSearch: () => void;
}

export function Tasks({ onOpenSearch }: TasksProps) {
  const { tasksApi, categoriesApi } = useOrganizer();
  const { tasks } = tasksApi;
  const [filter, setFilter] = useState<FilterKey>('offen');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filtered = useMemo(() => {
    let result = tasks;
    if (filter === 'offen') result = result.filter((t) => t.status === 'offen');
    else if (filter === 'erledigt') result = result.filter((t) => t.status === 'erledigt');
    else if (filter === 'hoch') result = result.filter((t) => t.priority === 'hoch' && t.status === 'offen');
    else if (filter === 'überfällig') result = result.filter((t) => isOverdue(t));
    if (activeCategory) result = result.filter((t) => t.category_id === activeCategory);
    return sortTasks(result);
  }, [tasks, filter, activeCategory]);

  const openCounts = useMemo(() => ({
    offen: tasks.filter((t) => t.status === 'offen').length,
    hoch: tasks.filter((t) => t.priority === 'hoch' && t.status === 'offen').length,
    überfällig: tasks.filter((t) => isOverdue(t)).length,
    erledigt: tasks.filter((t) => t.status === 'erledigt').length,
  }), [tasks]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filtered.map((t) => t.id)));
  const selectNone = () => setSelectedIds(new Set());

  const handleSwipeDelete = async (task: Task) => {
    await tasksApi.deleteTask(task.id);
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => tasksApi.deleteTask(id)));
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
    }
  };

  const requestDeleteSelected = () => {
    if (shouldSkipDeleteConfirm()) {
      handleDeleteSelected();
    } else {
      setConfirmDelete(true);
    }
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Aufgaben</h1>
        <div className="flex items-center gap-2">
          {!selectMode && (
            <button
              onClick={enterSelectMode}
              className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400"
              aria-label="Auswählen"
            >
              <CheckSquare size={18} />
            </button>
          )}
          <button
            onClick={onOpenSearch}
            className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400"
            aria-label="Suche"
          >
            <SearchIcon size={18} />
          </button>
        </div>
      </header>

      {/* Select mode bar */}
      {selectMode && (
        <div className="flex items-center justify-between mb-3 rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800/50 px-3 py-2.5">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs font-medium text-primary-700 dark:text-primary-300">
              Alle auswählen
            </button>
            <button onClick={selectNone} className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Keine
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{selectedIds.size} gewählt</span>
            <button
              onClick={requestDeleteSelected}
              disabled={selectedIds.size === 0 || deleting}
              className="h-8 px-3 rounded-lg bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Trash2 size={14} /> {deleting ? 'Löscht…' : 'Löschen'}
            </button>
            <button onClick={exitSelectMode} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-3">
        {FILTERS.map((f) => {
          const count = f.key === 'alle' ? tasks.length : openCounts[f.key as keyof typeof openCounts] ?? 0;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f.label}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium transition-colors ${
            !activeCategory
              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
              : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Alle Kategorien
        </button>
        {categoriesApi.categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.id ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <CategoryIcon icon={cat.icon} color={cat.color} size={13} />
            {cat.name}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">Keine Aufgaben in diesem Filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              {selectMode && (
                <button
                  onClick={() => toggleSelect(task.id)}
                  className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    selectedIds.has(task.id)
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 text-transparent'
                  }`}
                  aria-label="Auswählen"
                >
                  {selectedIds.has(task.id) && <CheckSquare size={14} strokeWidth={3} />}
                </button>
              )}
              {selectMode ? (
                <div className="flex-1">
                  <SwipeableTaskItem
                    task={task}
                    showTrip
                    onToggle={undefined}
                    onClick={() => toggleSelect(task.id)}
                    onSwipeDelete={handleSwipeDelete}
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <SwipeableTaskItem
                    task={task}
                    showTrip
                    onToggle={tasksApi.toggleTaskStatus}
                    onClick={(t) => {
                      setEditingTask(t);
                      setEditorOpen(true);
                    }}
                    onSwipeDelete={handleSwipeDelete}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TaskEditor open={editorOpen} onClose={() => { setEditorOpen(false); setEditingTask(null); }} task={editingTask} />

      <ConfirmDialog
        open={confirmDelete}
        title="Aufgaben löschen?"
        message={`${selectedIds.size} Aufgabe(n) werden endgültig entfernt.`}
        onConfirm={() => {
          setConfirmDelete(false);
          handleDeleteSelected();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
