import { useEffect, useState } from 'react';
import { Trash2, Check, Star } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { useDeleteRequest } from '@/components/RemovableItem';
import { useOrganizer } from '@/context/OrganizerContext';
import { useTaskCategories } from '@/hooks/useTaskCategories';
import { supabase } from '@/lib/supabase';
import { Task, Priority, ReminderOffset, RepeatRule, TaskStatus } from '@/types';
import { REMINDER_OFFSET_LABELS, REPEAT_LABELS } from '@/types';
import { tripStartDate } from '@/lib/tripDates';
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

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function TaskEditor({ open, onClose, task, defaultTripId, prefill }: TaskEditorProps) {
  const { categoriesApi, tasksApi, tripsApi } = useOrganizer();
  const { categories } = categoriesApi;
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        category_ids: prefill?.category_ids ?? [],
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
  const { requestDelete, confirmDialog } = useDeleteRequest(task?.title || 'Aufgabe', handleDelete);

  const tripStartForDraft = draft.trip_id
    ? tripStartDate(tripsApi.segments.filter((s) => s.trip_id === draft.trip_id))
    : null;

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
              onClick={requestDelete}
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

        {tripStartForDraft && (
          <button
            type="button"
            onClick={() => update('due_date', addDaysIso(tripStartForDraft, -7))}
            className="-mt-2 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            Eine Woche vor Abflug ({addDaysIso(tripStartForDraft, -7)})
          </button>
        )}

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

        <button
          type="button"
          onClick={() => update('priority', draft.priority === 'hoch' ? 'normal' : 'hoch')}
          aria-pressed={draft.priority === 'hoch'}
          className={`w-full h-11 px-4 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
            draft.priority === 'hoch'
              ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
              : 'bg-slate-100 dark:bg-slate-800 border border-transparent text-slate-600 dark:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-2"><Star size={16} className={draft.priority === 'hoch' ? 'fill-current' : ''} />Als wichtig markieren</span>
          <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${draft.priority === 'hoch' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${draft.priority === 'hoch' ? 'translate-x-4' : ''}`} />
          </span>
        </button>

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
      </div>
      {confirmDialog}
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
