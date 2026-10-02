import { useMemo, useState, useEffect } from 'react';
import { Plane, Calendar, AlertCircle, CheckCircle2, Bell, ChevronRight, RefreshCw, X, MapPin, Globe, Clock, Navigation, Train } from 'lucide-react';
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
import { getAirportTimezone, getCityTimezone, formatTimeInZone } from '@/lib/timezoneData';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

type ClockStyle = 'analog' | 'digital';

export function Dashboard({ onNavigate }: DashboardProps) {
  const { tasksApi, tripsApi } = useOrganizer();
  const { user } = useAuth();
  const { tasks } = tasksApi;
  const allSegments = tripsApi.segments;
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [flightDetailSegment, setFlightDetailSegment] = useState<typeof allSegments[number] | null>(null);
  const [refreshingFlight, setRefreshingFlight] = useState(false);
  const [overdueChecklistItems, setOverdueChecklistItems] = useState<{ label: string }[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [clockStyle, setClockStyle] = useState<ClockStyle>('analog');

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
      .filter((r) => r.remindAt && r.remindAt!.getTime() > Date.now())
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

  const nextTrainSegment = useMemo(() => {
    const today = todayISO();
    const trains = allSegments
      .filter((s) => s.segment_type === 'bahn' && s.departure_date && s.departure_date >= today)
      .sort((a, b) => (a.departure_date ?? '').localeCompare(b.departure_date ?? ''));
    return trains[0] ?? null;
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
    if (!nextTrip) { setOverdueChecklistItems([]); return; }
    supabase
      .from('travel_checklists')
      .select('label,checked,deadline')
      .eq('trip_id', nextTrip.trip.id)
      .eq('checked', false)
      .order('sort_index', { ascending: true })
      .then(({ data }) => {
        if (!data) { setOverdueChecklistItems([]); return; }
        const today = todayISO();
        setOverdueChecklistItems(
          data
            .filter((d) => d.deadline && d.deadline < today)
            .map((d) => ({ label: d.label }))
        );
      });
  }, [nextTrip]);

  const openTripTasks = useMemo(() => {
    if (!nextTrip) return [];
    return tasks.filter((t) => t.trip_id === nextTrip.trip.id && t.status === 'offen');
  }, [tasks, nextTrip]);

  const allOpenTasks = useMemo(() => {
    return tasks.filter((t) => t.status === 'offen');
  }, [tasks]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const homeTimezone = 'Europe/Berlin';
  const destinationTimezone = useMemo(() => {
    if (!nextTrip) return null;
    const tripSegs = allSegments.filter((s) => s.trip_id === nextTrip.trip.id);
    for (const seg of tripSegs) {
      if (seg.to_airport_code) {
        const tz = getAirportTimezone(seg.to_airport_code);
        if (tz) return { tz: tz.tz, label: nextTrip.trip.destination ?? seg.to_airport_code };
      }
    }
    if (nextTrip.trip.destination) {
      const tz = getCityTimezone(nextTrip.trip.destination);
      if (tz) return { tz: tz.tz, label: nextTrip.trip.destination };
    }
    return null;
  }, [nextTrip, allSegments]);

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
  const hasOverdueItems = overdueChecklistItems.length > 0;

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

      {/* Trip countdown — main hero card */}
      {nextTrip && (
        <div className="rounded-3xl bg-gradient-to-br from-primary-600 via-sky-600 to-primary-700 p-6 text-white shadow-xl shadow-primary-600/20 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-sm text-white/80 mb-2">
              <MapPin size={14} />
              <span>{nextTrip.trip.destination ?? nextTrip.trip.name}</span>
            </div>
            {daysUntilTrip !== null ? (
              <div>
                <p className="text-sm text-white/85">
                  {userName ? `${userName}, deine ` : 'Deine '}Reise nach {nextTrip.trip.destination ?? nextTrip.trip.name}
                </p>
                <p className="text-4xl font-bold mt-1">
                  {daysUntilTrip === 0 ? 'startet heute!' : daysUntilTrip === 1 ? 'startet in 1 Tag' : `startet in ${daysUntilTrip} Tagen`}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold mt-1">{nextTrip.trip.name}</p>
                {nextTrip.trip.destination && <p className="text-sm text-white/85 mt-0.5">Reise nach {nextTrip.trip.destination}</p>}
                <p className="text-xs text-white/70 mt-1">Noch kein Abreisedatum festgelegt</p>
              </div>
            )}
          </div>

          {/* Open items with overdue highlight */}
          {(hasOverdueItems || openTripTasks.length > 0 || allOpenTasks.length > 0) && (
            <div className="mt-4 pt-4 border-t border-white/20 relative z-10 space-y-1.5">
              {hasOverdueItems && (
                <p className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                  <AlertCircle size={13} /> Überfällig:
                </p>
              )}
              {overdueChecklistItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-red-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
              {(openTripTasks.length > 0 || (overdueChecklistItems.length === 0 && allOpenTasks.length > 0)) && (
                <p className={`text-xs font-medium ${hasOverdueItems ? 'text-white/90 mt-2' : 'text-white/90'}`}>
                  {hasOverdueItems ? 'Außerdem offen:' : 'Du musst noch:'}
                </p>
              )}
              {openTripTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm text-white/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                  <span className="truncate">{task.title}</span>
                </div>
              ))}
              {openTripTasks.length === 0 && overdueChecklistItems.length === 0 && allOpenTasks.slice(0, 3).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm text-white/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                  <span className="truncate">{task.title}</span>
                </div>
              ))}
            </div>
          )}

          {overdueChecklistItems.length === 0 && openTripTasks.length === 0 && allOpenTasks.length === 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 relative z-10">
              <p className="text-sm text-white/85 flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Alles erledigt – du bist startklar!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Flight card — airline, flight number, live tracking */}
      {nextFlight && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Plane size={16} className="text-sky-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Flug</h2>
          </div>
          <button
            onClick={() => setFlightDetailSegment(nextFlight)}
            className="w-full text-left"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">{nextFlight.airline ?? 'Fluglinie'}</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                  {nextFlight.flight_number ?? 'Flugnummer'}
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
          </button>
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
          {/* Live tracking button */}
          <button
            onClick={() => onNavigate('reisen')}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white py-2.5 text-sm font-medium transition-colors"
          >
            <Navigation size={15} /> Live-Tracking
          </button>
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
        </div>
      )}

      {/* Train connection card */}
      {nextTrainSegment && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Train size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bahnverbindung</h2>
          </div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs text-slate-400">Zug</p>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {nextTrainSegment.train_number ?? nextTrainSegment.from_location ?? '—'}
              </h3>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
            <span>{nextTrainSegment.from_location ?? '—'}</span>
            <Train size={16} className="text-slate-400" />
            <span>{nextTrainSegment.to_location ?? '—'}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
            {nextTrainSegment.departure_date && <span className="flex items-center gap-1"><Calendar size={11} /> {formatRelativeDate(nextTrainSegment.departure_date)}</span>}
            {nextTrainSegment.departure_time && <span className="flex items-center gap-1">{formatTime(nextTrainSegment.departure_time)}</span>}
          </div>
        </div>
      )}

      {/* World clock — analog + digital, two clocks side by side */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-sky-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Weltuhr</h2>
          </div>
          <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setClockStyle('analog')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                clockStyle === 'analog' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Analog
            </button>
            <button
              onClick={() => setClockStyle('digital')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                clockStyle === 'digital' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              Digital
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ClockCard label="Nürnberg" subLabel="Deutschland" tz={homeTimezone} now={now} style={clockStyle} highlight />
          {destinationTimezone ? (
            <ClockCard label={destinationTimezone.label} subLabel="Reiseziel" tz={destinationTimezone.tz} now={now} style={clockStyle} />
          ) : (
            <ClockCard label="Reiseziel" subLabel="noch offen" tz={homeTimezone} now={now} style={clockStyle} dimmed />
          )}
        </div>
      </div>

      {/* Overdue tasks */}
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

function ClockCard({ label, subLabel, tz, now, style, highlight, dimmed }: {
  label: string;
  subLabel: string;
  tz: string;
  now: number;
  style: ClockStyle;
  highlight?: boolean;
  dimmed?: boolean;
}) {
  const { time, date, offset } = formatTimeInZone(tz);

  if (style === 'analog') {
    return (
      <div className={`rounded-2xl border p-4 flex flex-col items-center ${
        highlight
          ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-100 dark:border-primary-900/40'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
      } ${dimmed ? 'opacity-50' : ''}`}>
        <AnalogClock tz={tz} now={now} highlight={highlight} />
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mt-2 truncate w-full text-center">{label}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{subLabel}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums font-mono">{date}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 flex flex-col items-center justify-center min-h-[140px] ${
      highlight
        ? 'bg-gradient-to-br from-primary-600 to-sky-600 border-primary-400 text-white'
        : 'bg-slate-900 dark:bg-slate-800 border-slate-700 text-white'
    } ${dimmed ? 'opacity-50' : ''}`}>
      <p className="text-sm font-medium truncate w-full text-center mb-1">{label}</p>
      <p className={`text-[10px] mb-3 ${highlight ? 'text-white/70' : 'text-slate-400'}`}>{subLabel}</p>
      <p className="text-2xl font-bold tabular-nums font-mono tracking-wider">{time}</p>
      <p className={`text-[10px] mt-1 ${highlight ? 'text-white/70' : 'text-slate-400'}`}>{offset} · {date}</p>
    </div>
  );
}

function AnalogClock({ tz, now, highlight }: { tz: string; now: number; highlight?: boolean }) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(new Date(now));

  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 12;
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const s = parseInt(parts.find((p) => p.type === 'second')?.value ?? '0', 10);

  const hourAngle = (h * 30) + (m * 0.5);
  const minuteAngle = (m * 6) + (s * 0.1);
  const secondAngle = s * 6;

  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      {/* Face */}
      <circle cx="50" cy="50" r="46" fill={highlight ? 'white' : '#1e293b'} stroke={highlight ? '#3b82f6' : '#334155'} strokeWidth="2" />
      {/* Hour markers */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 50 + 38 * Math.cos(angle);
        const y1 = 50 + 38 * Math.sin(angle);
        const x2 = 50 + 42 * Math.cos(angle);
        const y2 = 50 + 42 * Math.sin(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={highlight ? '#475569' : '#64748b'} strokeWidth="1.5" strokeLinecap="round" />;
      })}
      {/* Hour hand */}
      <line
        x1="50" y1="50"
        x2={50 + 22 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
        y2={50 + 22 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
        stroke={highlight ? '#1e293b' : '#e2e8f0'} strokeWidth="3" strokeLinecap="round"
      />
      {/* Minute hand */}
      <line
        x1="50" y1="50"
        x2={50 + 32 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
        y2={50 + 32 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
        stroke={highlight ? '#1e293b' : '#e2e8f0'} strokeWidth="2" strokeLinecap="round"
      />
      {/* Second hand */}
      <line
        x1="50" y1="50"
        x2={50 + 35 * Math.cos((secondAngle - 90) * (Math.PI / 180))}
        y2={50 + 35 * Math.sin((secondAngle - 90) * (Math.PI / 180))}
        stroke={highlight ? '#3b82f6' : '#38bdf8'} strokeWidth="1" strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="50" cy="50" r="3" fill={highlight ? '#3b82f6' : '#38bdf8'} />
    </svg>
  );
}
