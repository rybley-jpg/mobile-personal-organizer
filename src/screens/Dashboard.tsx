import { useMemo, useState, useEffect } from 'react';
import { Plane, Calendar, AlertCircle, CheckCircle2, Bell, ChevronRight, RefreshCw, X, MapPin } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { useAuth } from '@/context/AuthContext';
import { TaskItem } from '@/components/TaskItem';
import { TaskEditor } from '@/components/TaskEditor';
import { FlightStatusBadge } from '@/components/FlightStatusBadge';
import { FlightDetail } from '@/components/FlightDetail';
import { Task } from '@/types';
import { sortTasks, isOverdue, isDueToday, formatRelativeDate, formatTime, formatDateShort, computeReminderAt, formatReminderCountdown, todayISO } from '@/lib/dateUtils';
import { fetchAndStoreFlightStatus, shouldRefreshFlightStatus } from '@/lib/flightApi';
import { supabase } from '@/lib/supabase';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { tasksApi, tripsApi } = useOrganizer();
  const { user } = useAuth();
  const { tasks } = tasksApi;
  const allSegments = tripsApi.segments;
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [flightDetailSegment, setFlightDetailSegment] = useState<typeof allSegments[number] | null>(null);
  const [refreshingFlight, setRefreshingFlight] = useState(false);
  const [openChecklistItems, setOpenChecklistItems] = useState<string[]>([]);

  const userName = useMemo(() => {
    const meta = user?.user_metadata;
    if (meta?.name) return meta.name;
    if (meta?.full_name) return meta.full_name;
    if (meta?.first_name) return meta.first_name;
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1).replace(/[._-]/g, ' ');
    }
    return '';
  }, [user]);

  const sorted = useMemo(() => sortTasks(tasks), [tasks]);

  const overdueTasks = sorted.filter((t) => isOverdue(t));
  const todayTasks = sorted.filter((t) => isDueToday(t) && t.status === 'offen');
  const upcomingTasks = sorted
    .filter((t) => t.status === 'offen' && t.due_date && !isOverdue(t) && !isDueToday(t))
    .slice(0, 4);

  const upcomingReminders = useMemo(() => {
    return tasks
      .filter((t) => t.status === 'offen' && t.reminder_offset !== 'none' && t.due_date)
      .map((t) => ({ task: t, remindAt: computeReminderAt(t) }))
      .filter((r) => r.remindAt && r.remindAt.getTime() > Date.now())
      .sort((a, b) => a.remindAt!.getTime() - b.remindAt!.getTime())
      .slice(0, 3);
  }, [tasks]);

  const nextFlight = useMemo(() => {
    const today = todayISO();
    const flights = allSegments
      .filter((s) => s.segment_type === 'flug' && s.departure_date && s.departure_date >= today)
      .sort((a, b) => (a.departure_date ?? '').localeCompare(b.departure_date ?? ''));
    return flights[0] ?? null;
  }, [allSegments]);

  const nextTrip = useMemo(() => {
    const today = todayISO();
    const tripsWithDeparture = tripsApi.trips
      .map((trip) => {
        const tripSegs = allSegments.filter((s) => s.trip_id === trip.id);
        const firstSeg = tripSegs.sort((a, b) => a.order_index - b.order_index)[0];
        const depDate = firstSeg?.departure_date ?? null;
        return { trip, depDate };
      })
      .filter((x): x is { trip: typeof x.trip; depDate: string | null } => x.depDate !== null ? x.depDate >= today : true)
      .sort((a, b) => {
        const aDate = a.depDate ?? '9999-12-31';
        const bDate = b.depDate ?? '9999-12-31';
        return aDate.localeCompare(bDate);
      });
    return tripsWithDeparture[0] ?? null;
  }, [tripsApi.trips, allSegments]);

  const daysUntilTrip = useMemo(() => {
    if (!nextTrip || !nextTrip.depDate) return null;
    const today = new Date(todayISO() + 'T00:00:00');
    const dep = new Date(nextTrip.depDate + 'T00:00:00');
    return Math.round((dep.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [nextTrip]);

  useEffect(() => {
    if (!nextTrip) { setOpenChecklistItems([]); return; }
    supabase
      .from('travel_checklists')
      .select('label,checked')
      .eq('trip_id', nextTrip.trip.id)
      .eq('checked', false)
      .order('sort_index', { ascending: true })
      .then(({ data }) => {
        if (data) setOpenChecklistItems(data.map((d) => d.label));
      });
  }, [nextTrip]);

  const openTripTasks = useMemo(() => {
    if (!nextTrip) return [];
    return tasks.filter((t) => t.trip_id === nextTrip.trip.id && t.status === 'offen');
  }, [tasks, nextTrip]);

  const allOpenTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'offen');
  }, [tasks]);

  const handleRefreshFlight = async () => {
    if (!nextFlight) return;
    setRefreshingFlight(true);
    try {
      await fetchAndStoreFlightStatus(nextFlight, tripsApi.updateSegment);
    } catch {
      // silent
    } finally {
      setRefreshingFlight(false);
    }
  };

  const canRefreshFlight = nextFlight && shouldRefreshFlightStatus(nextFlight);

  return (
    <div className="px-4 pt-6 pb-[calc(112px+env(safe-area-inset-bottom))] space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Heute, {formatDateShort(todayISO())}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {userName ? `Willkommen, ${userName}!` : 'Willkommen!'}
          </h1>
        </div>
      </header>

      {/* Trip countdown summary */}
      {nextTrip && (
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-sky-600 p-5 text-white shadow-lg shadow-primary-600/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-white/80">
                <MapPin size={14} />
                <span>{nextTrip.trip.destination ?? nextTrip.trip.name}</span>
              </div>
              {daysUntilTrip !== null ? (
                <>
                  <p className="text-3xl font-bold mt-1">
                    {daysUntilTrip === 0 ? 'Heute geht es los!' : daysUntilTrip === 1 ? 'Noch 1 Tag' : `Noch ${daysUntilTrip} Tage`}
                  </p>
                  <p className="text-sm text-white/80 mt-0.5">bis zu deiner Reise nach {nextTrip.trip.destination ?? nextTrip.trip.name}</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold mt-1">{nextTrip.trip.name}</p>
                  {nextTrip.trip.destination && <p className="text-sm text-white/80 mt-0.5">Reise nach {nextTrip.trip.destination}</p>}
                  <p className="text-xs text-white/70 mt-1">Noch kein Abreisedatum festgelegt</p>
                </>
              )}
            </div>
            <button
              onClick={() => onNavigate('reisen')}
              className="shrink-0 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-2 text-xs font-medium transition-colors"
            >
              Reise ansehen
            </button>
          </div>
          {(openChecklistItems.length > 0 || openTripTasks.length > 0 || (openTripTasks.length === 0 && allOpenTasks.length > 0)) && (
            <div className="space-y-1.5 pt-3 border-t border-white/20">
              <p className="text-xs font-medium text-white/90">Du musst noch:</p>
              {openChecklistItems.slice(0, 4).map((label) => (
                <div key={label} className="flex items-center gap-2 text-sm text-white/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                  <span className="truncate">{label} besorgen</span>
                </div>
              ))}
              {openTripTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm text-white/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                  <span className="truncate">{task.title}</span>
                </div>
              ))}
              {openTripTasks.length === 0 && openChecklistItems.length === 0 && allOpenTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm text-white/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                  <span className="truncate">{task.title} erledigen</span>
                </div>
              ))}
              {(openChecklistItems.length + (openTripTasks.length || allOpenTasks.length)) > 4 && (
                <p className="text-xs text-white/70 pl-3.5">
                  und {openChecklistItems.length + (openTripTasks.length || allOpenTasks.length) - 4} weitere…
                </p>
              )}
            </div>
          )}
          {openChecklistItems.length === 0 && openTripTasks.length === 0 && allOpenTasks.length === 0 && (
            <div className="pt-3 border-t border-white/20">
              <p className="text-sm text-white/85 flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Alles erledigt – du bist startklar!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Next flight with live status */}
      {nextFlight && (
        <Section title="Nächster Flug" icon={<Plane size={16} className="text-sky-500" />}>
          <button
            onClick={() => setFlightDetailSegment(nextFlight)}
            className="w-full text-left rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">{nextFlight.airline ?? 'Flug'}</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                  {nextFlight.flight_number ?? 'Flug'}
                </h3>
              </div>
              <FlightStatusBadge
                status={nextFlight.last_flight_status}
                delayMinutes={nextFlight.delay_minutes}
                gateChanged={nextFlight.gate_changed}
                compact
              />
            </div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>{nextFlight.from_airport_code ?? nextFlight.from_location ?? '—'}</span>
              <Plane size={16} className="text-slate-400 rotate-90" />
              <span>{nextFlight.to_airport_code ?? nextFlight.to_location ?? '—'}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Calendar size={11} /> {formatRelativeDate(nextFlight.departure_date!)}</span>
              {nextFlight.departure_time && <span className="flex items-center gap-1">{formatTime(nextFlight.departure_time)}</span>}
              {nextFlight.last_known_gate && (
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">Gate {nextFlight.last_known_gate}</span>
              )}
            </div>
            {nextFlight.gate_changed && (
              <div className="mt-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1.5 text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                <AlertCircle size={12} /> Gate-Wechsel: {nextFlight.previous_gate} → {nextFlight.last_known_gate}
              </div>
            )}
            {nextFlight.last_flight_status === 'delayed' && nextFlight.delay_minutes && (
              <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <AlertCircle size={12} /> Verspätet: +{nextFlight.delay_minutes} Minuten
              </div>
            )}
            {canRefreshFlight && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Live-Status verfügbar</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleRefreshFlight(); }}
                  className="flex items-center gap-1 text-[10px] font-medium text-primary-600 dark:text-primary-400"
              >
                <RefreshCw size={11} className={refreshingFlight ? 'animate-spin' : ''} /> Aktualisieren
              </span>
              </div>
            )}
          </button>
        </Section>
      )}

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <Section title="Überfällig" count={overdueTasks.length} icon={<AlertCircle size={16} className="text-red-500" />}>
          <div className="space-y-2">
            {overdueTasks.slice(0, 3).map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={tasksApi.toggleTaskStatus}
                onClick={(t) => {
                  setEditingTask(t);
                  setTaskEditorOpen(true);
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Today */}
      <Section title="Heute" count={todayTasks.length} icon={<CheckCircle2 size={16} className="text-primary-600" />}>
        {todayTasks.length === 0 ? (
          <EmptyHint text="Nichts für heute. Zeit für eine Pause!" />
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={tasksApi.toggleTaskStatus}
                onClick={(t) => {
                  setEditingTask(t);
                  setTaskEditorOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Next trip */}
      {nextTrip && (
        <Section title="Nächste Reise" icon={<Plane size={16} className="text-sky-500" />}>
          <button
            onClick={() => onNavigate('reisen')}
            className="w-full text-left rounded-2xl bg-gradient-to-br from-sky-500 to-primary-600 p-4 text-white shadow-lg shadow-sky-500/20"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-sky-100">Reise</p>
                <h3 className="text-lg font-bold">{nextTrip.trip.name}</h3>
                {nextTrip.trip.destination && <p className="text-sm text-sky-100">{nextTrip.trip.destination}</p>}
              </div>
              <ChevronRight size={20} className="text-sky-100" />
            </div>
          </button>
        </Section>
      )}

      {/* Upcoming */}
      {upcomingTasks.length > 0 && (
        <Section title="Anstehend" icon={<Calendar size={16} className="text-slate-400" />}>
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={tasksApi.toggleTaskStatus}
                onClick={(t) => {
                  setEditingTask(t);
                  setTaskEditorOpen(true);
                }}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Reminders */}
      {upcomingReminders.length > 0 && (
        <Section title="Erinnerungen" icon={<Bell size={16} className="text-amber-500" />}>
          <div className="space-y-2">
            {upcomingReminders.map(({ task, remindAt }) => (
              <div key={task.id} className="flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5">
                <Bell size={16} className="text-amber-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">{formatReminderCountdown(remindAt!)}</p>
                </div>
                <button
                  onClick={() => tasksApi.updateTask(task.id, { reminder_offset: 'none' })}
                  className="shrink-0 p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  aria-label="Erinnerung entfernen"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <TaskEditor open={taskEditorOpen} onClose={() => { setTaskEditorOpen(false); setEditingTask(null); }} task={editingTask} />
      {flightDetailSegment && (
        <FlightDetail
          segment={flightDetailSegment}
          open={!!flightDetailSegment}
          onClose={() => setFlightDetailSegment(null)}
          tripName={tripsApi.trips.find((t) => t.id === flightDetailSegment.trip_id)?.name}
        />
      )}
    </div>
  );
}

function Section({ title, count, icon, children }: { title: string; count?: number; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-4 text-center text-sm text-slate-400 dark:text-slate-500">
      {text}
    </div>
  );
}
