import { useMemo, useState } from 'react';
import { Search as SearchIcon, X, Plane, Phone } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { TaskItem } from '@/components/TaskItem';
import { formatDateShort } from '@/lib/dateUtils';

interface SearchProps {
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

type ResultType = 'task' | 'trip' | 'contact';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
}

export function Search({ onClose, onNavigate }: SearchProps) {
  const { tasksApi, tripsApi, contactsApi, categoriesApi } = useOrganizer();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const out: SearchResult[] = [];

    for (const t of tasksApi.tasks) {
      if (
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q)) ||
        (t.due_date?.includes(q))
      ) {
        const cat = categoriesApi.categories.find((c) => c.id === t.category_id);
        out.push({
          type: 'task',
          id: t.id,
          title: t.title,
          subtitle: cat?.name,
          meta: t.due_date ? formatDateShort(t.due_date) : undefined,
        });
      }
    }

    for (const trip of tripsApi.trips) {
      const segs = tripsApi.segments.filter((s) => s.trip_id === trip.id);
      const match =
        trip.name.toLowerCase().includes(q) ||
        (trip.destination?.toLowerCase().includes(q)) ||
        (trip.notes?.toLowerCase().includes(q)) ||
        segs.some((s) =>
          (s.airline?.toLowerCase().includes(q)) ||
          (s.flight_number?.toLowerCase().includes(q)) ||
          (s.from_location?.toLowerCase().includes(q)) ||
          (s.to_location?.toLowerCase().includes(q))
        );
      if (match) {
        out.push({
          type: 'trip',
          id: trip.id,
          title: trip.name,
          subtitle: trip.destination ?? undefined,
          meta: 'Reise',
        });
      }
    }

    for (const c of contactsApi.contacts) {
      if (
        c.name.toLowerCase().includes(q) ||
        (c.organization?.toLowerCase().includes(q)) ||
        (c.phone?.includes(q)) ||
        (c.email?.toLowerCase().includes(q)) ||
        (c.notes?.toLowerCase().includes(q))
      ) {
        out.push({
          type: 'contact',
          id: c.id,
          title: c.name,
          subtitle: c.organization ?? undefined,
          meta: c.phone ?? c.email ?? undefined,
        });
      }
    }

    return out;
  }, [query, tasksApi.tasks, tripsApi, contactsApi.contacts, categoriesApi.categories]);

  const taskResults = results.filter((r) => r.type === 'task');
  const tripResults = results.filter((r) => r.type === 'trip');
  const contactResults = results.filter((r) => r.type === 'contact');

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-950 flex flex-col animate-fade-in">
      <div className="flex items-center gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <SearchIcon size={20} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen nach Aufgaben, Reisen, Kontakten…"
          className="flex-1 h-11 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="p-1 text-slate-400">
            <X size={18} />
          </button>
        )}
        <button onClick={onClose} className="text-sm font-medium text-primary-600 dark:text-primary-400">
          Fertig
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!query.trim() ? (
          <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500">
            Tippe einen Begriff ein, um Aufgaben, Reisen und Kontakte zu durchsuchen.
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500">
            Keine Treffer für „{query}“.
          </div>
        ) : (
          <div className="space-y-5">
            {taskResults.length > 0 && (
              <ResultGroup label="Aufgaben" count={taskResults.length}>
                {taskResults.map((r) => {
                  const task = tasksApi.tasks.find((t) => t.id === r.id);
                  if (!task) return null;
                  return (
                    <TaskItem
                      key={r.id}
                      task={task}
                      onToggle={tasksApi.toggleTaskStatus}
                      onClick={() => {
                        onNavigate('tasks');
                        onClose();
                      }}
                    />
                  );
                })}
              </ResultGroup>
            )}
            {tripResults.length > 0 && (
              <ResultGroup label="Reisen" count={tripResults.length} icon={<Plane size={14} />}>
                {tripResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { onNavigate('reisen'); onClose(); }}
                    className="w-full text-left flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5"
                  >
                    <span className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0"><Plane size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{r.subtitle}</p>}
                    </div>
                  </button>
                ))}
              </ResultGroup>
            )}
            {contactResults.length > 0 && (
              <ResultGroup label="Kontakte" count={contactResults.length} icon={<Phone size={14} />}>
                {contactResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { onNavigate('contacts'); onClose(); }}
                    className="w-full text-left flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5"
                  >
                    <span className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center font-semibold text-xs shrink-0">
                      {r.title.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.title}</p>
                      {(r.subtitle || r.meta) && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{[r.subtitle, r.meta].filter(Boolean).join(' · ')}</p>}
                    </div>
                  </button>
                ))}
              </ResultGroup>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultGroup({ label, count, icon, children }: { label: string; count: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</h3>
        <span className="text-xs text-slate-400">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
