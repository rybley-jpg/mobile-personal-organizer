import { useEffect, useState } from 'react';
import { Trash2, Plus, Check, X, ListChecks } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { useOrganizer } from '@/context/OrganizerContext';
import { useChecklist } from '@/hooks/useChecklist';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import { supabase } from '@/lib/supabase';
import { Task, Priority, ReminderOffset, RepeatRule, TaskStatus } from '@/types';
import { PRIORITY_LABELS, REMINDER_OFFSET_LABELS, REPEAT_LABELS } from '@/types';
import { CategoryIcon } from '@/components/CategoryIcon';

interface TaskEditorProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultTripId?: string | null;
  prefill?: Partial<TaskDraft>;
}

export interface TaskDraft {
  title: string;
  description: string;
  due_date: string;
  due_time: string;
  priority: Priority;
  category_ids: string[];
  repeat_rule: RepeatRule | '';
  reminder_offset: ReminderOffset;
  trip_id: string | '';
  status: TaskStatus;
}

const EMPTY_DRAFT: TaskDraft = {
  title: '',
  description: '',
  due_date: '',
  due_time: '',
  priority: 'normal',
  category_ids: [],
  repeat_rule: '',
  reminder_offset: 'none',
  trip_id: '',
  status: 'offen',
};

export function TaskEditor({ open, onClose, task, defaultTripId, prefill }: TaskEditorProps) {
  const { categoriesApi, tasksApi, tripsApi } = useOrganizer();
  const { categories } = categoriesApi;
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const { items: checklistItems, addItem: addChecklistItem, toggleItem: toggleChecklistItem, deleteItem: deleteChecklistItem } = useChecklist(task?.id ?? null);
  const { categoryIds: existingCategoryIds, setCategories: saveTaskCategories } = useTaskCategories(task?.id ?? null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (task) {
      setDraft({
        title: task.title,
        description: task.description ?? '',
        due_date: task.due_date ?? '',
        due_time: task.due_time ?? '',
        priority: task.priority,
        category_ids: existingCategoryIds.length > 0 ? existingCategoryIds : (task.category_id ? [task.category_id] : []),
        repeat_rule: task.repeat_rule ?? '',
        reminder_offset: task.reminder_offset,
        trip_id: task.trip_id ?? '',
        status: task.status,
      });
    } else {
      setDraft({
        ...EMPTY_DRAFT,
        category_ids: prefill?.category_id ? [prefill.category_id] : [],
        trip_id: defaultTripId ?? prefill?.trip_id ?? '',
      });
    }
  }, [open, task, defaultTripId, prefill, categories, existingCategoryIds]);

  const update = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCategory = (catId: string) => {
    setDraft((prev) => {
      const has = prev.category_ids.includes(catId);
      return {
        ...prev,
        category_ids: has ? prev.category_ids.filter((c) => c !== catId) : [...prev.category_ids, catId],
      };
    });
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      setError('Bitte gib einen Titel ein.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const primaryCategory = draft.category_ids[0] ?? null;
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        due_date: draft.due_date || null,
        due_time: draft.due_time || null,
        priority: draft.priority,
        category_id: primaryCategory,
        repeat_rule: draft.repeat_rule || null,
        reminder_offset: draft.reminder_offset,
        trip_id: draft.trip_id || null,
        status: draft.status,
      };
      let savedTaskId: string;
      if (task) {
        const updated = await tasksApi.updateTask(task.id, payload);
        savedTaskId = task.id;
      } else {
        const created = await tasksApi.addTask(payload);
        savedTaskId = created?.id ?? '';
      }
      // Save multiple categories to junction table
      if (savedTaskId) {
        await supabase.from('task_categories').delete().eq('task_id', savedTaskId);
        if (draft.category_ids.length > 0) {
          const rows = draft.category_ids.map((category_id) => ({ task_id: savedTaskId, category_id }));
          await supabase.from('task_categories').insert(rows);
        }
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setSaving(true);
    try {
      await tasksApi.deleteTask(task.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Abbrechen
          </button>
          {task && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="h-11 px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Titel">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Was steht an?"
            className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            autoFocus
          />
        </Field>

        <Field label="Beschreibung">
          <textarea
            value={draft.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Optional"
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Datum">
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => update('due_date', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
          <Field label="Uhrzeit">
            <input
              type="time"
              value={draft.due_time}
              onChange={(e) => update('due_time', e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            />
          </Field>
        </div>

        <Field label="Status">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => update('status', 'offen')}
              className={`h-10 rounded-xl text-sm font-medium transition-colors ${
                draft.status === 'offen'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Offen
            </button>
            <button
              onClick={() => update('status', 'erledigt')}
              className={`h-10 rounded-xl text-sm font-medium transition-colors ${
                draft.status === 'erledigt'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Erledigt
            </button>
          </div>
        </Field>

        <Field label="Priorität">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => update('priority', p)}
                className={`h-10 rounded-xl text-sm font-medium transition-colors ${
                  draft.priority === p
                    ? p === 'hoch'
                      ? 'bg-red-600 text-white'
                      : p === 'normal'
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Kategorien">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2">Mehrfachauswahl möglich – tippe mehrere an.</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const selected = draft.category_ids.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium transition-all ${
                    selected
                      ? 'text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                  style={selected ? { backgroundColor: cat.color } : undefined}
                >
                  <CategoryIcon icon={cat.icon} color={selected ? '#ffffff' : cat.color} size={13} />
                  {cat.name}
                  {selected && <Check size={13} className="ml-0.5" />}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Erinnerung">
            <SelectInput
              value={draft.reminder_offset}
              onChange={(v) => update('reminder_offset', v as ReminderOffset)}
              options={(Object.keys(REMINDER_OFFSET_LABELS) as ReminderOffset[]).map((k) => ({ value: k, label: REMINDER_OFFSET_LABELS[k] }))}
            />
          </Field>
          <Field label="Wiederholung">
            <SelectInput
              value={draft.repeat_rule}
              onChange={(v) => update('repeat_rule', v as RepeatRule | '')}
              options={[
                { value: '', label: 'Keine' },
                ...(Object.keys(REPEAT_LABELS) as RepeatRule[]).map((k) => ({ value: k, label: REPEAT_LABELS[k] })),
              ]}
            />
          </Field>
        </div>

        {tripsApi.trips.length > 0 && (
          <Field label="Reise">
            <SelectInput
              value={draft.trip_id}
              onChange={(v) => update('trip_id', v)}
              options={[
                { value: '', label: 'Keine Reise' },
                ...tripsApi.trips.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </Field>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* Checklist - only for existing tasks */}
        {task && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ListChecks size={15} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Checkliste</span>
            </div>
            <div className="space-y-1.5">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                      item.checked
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-slate-300 dark:border-slate-600'
                    }`
                    }
                  >
                    {item.checked && <Check size={12} strokeWidth={3} />}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      item.checked
                        ? 'line-through text-slate-400 dark:text-slate-600'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="shrink-0 p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="shrink-0 w-5 h-5" />
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newChecklistItem.trim()) {
                      e.preventDefault();
                      addChecklistItem(newChecklistItem);
                      setNewChecklistItem('');
                    }
                  }}
                  placeholder="Listeneintrag hinzufügen…"
                  className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
                <button
                  onClick={() => {
                    if (newChecklistItem.trim()) {
                      addChecklistItem(newChecklistItem);
                      setNewChecklistItem('');
                    }
                  }}
                  className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 flex items-center justify-center"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
