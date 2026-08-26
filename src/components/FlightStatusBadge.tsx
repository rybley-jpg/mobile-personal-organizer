import { CheckCircle2, AlertTriangle, Clock, Plane, XCircle, Navigation, RefreshCw } from 'lucide-react';
import { FlightStatus, FLIGHT_STATUS_LABELS } from '@/types';

interface FlightStatusBadgeProps {
  status: FlightStatus | null;
  delayMinutes?: number | null;
  gateChanged?: boolean;
  compact?: boolean;
}

export function FlightStatusBadge({ status, delayMinutes, gateChanged, compact }: FlightStatusBadgeProps) {
  if (!status) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ${compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'}`}>
        <Clock size={compact ? 10 : 12} /> Keine Live-Daten
      </span>
    );
  }

  const config: Record<FlightStatus, { icon: typeof CheckCircle2; bg: string; text: string }> = {
    scheduled: { icon: CheckCircle2, bg: 'bg-green-100 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-300' },
    delayed: { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300' },
    boarding: { icon: Plane, bg: 'bg-sky-100 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300' },
    departed: { icon: Navigation, bg: 'bg-blue-100 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300' },
    arrived: { icon: CheckCircle2, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    cancelled: { icon: XCircle, bg: 'bg-red-100 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300' },
    diverted: { icon: AlertTriangle, bg: 'bg-orange-100 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300' },
  };

  const cfg = config[status];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 rounded-full ${cfg.bg} ${cfg.text} ${compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'} font-medium`}>
        <Icon size={compact ? 10 : 12} />
        {FLIGHT_STATUS_LABELS[status]}
      </span>
      {status === 'delayed' && delayMinutes && (
        <span className={`inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ${compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'} font-semibold`}>
          +{delayMinutes} Min
        </span>
      )}
      {gateChanged && (
        <span className={`inline-flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 ${compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'} font-semibold`}>
          <AlertTriangle size={compact ? 10 : 12} /> Gate-Wechsel
        </span>
      )}
    </div>
  );
}

export function GateChangeAlert({ previousGate, newGate }: { previousGate: string | null; newGate: string | null }) {
  if (!previousGate || !newGate || previousGate === newGate) return null;
  return (
    <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400" />
        <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Gate-Wechsel erkannt</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-500 dark:text-slate-400">Bisher: <span className="font-mono font-medium">{previousGate}</span></span>
        <span className="text-slate-300 dark:text-slate-600">→</span>
        <span className="text-slate-900 dark:text-white">Neu: <span className="font-mono font-bold text-orange-600 dark:text-orange-400">{newGate}</span></span>
      </div>
    </div>
  );
}

export function DelayInfo({ delayMinutes, scheduledTime, estimatedTime }: { delayMinutes: number | null; scheduledTime: string | null; estimatedTime: string | null }) {
  if (!delayMinutes || delayMinutes <= 0) return null;
  return (
    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Clock size={16} className="text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Verspätung: +{delayMinutes} Minuten</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {scheduledTime && (
          <div>
            <p className="text-xs text-slate-400">Planmäßig</p>
            <p className="font-medium text-slate-600 dark:text-slate-300">{scheduledTime}</p>
          </div>
        )}
        {estimatedTime && (
          <div>
            <p className="text-xs text-slate-400">Erwartet</p>
            <p className="font-bold text-amber-600 dark:text-amber-400">{estimatedTime}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveUpdateInfo({ lastUpdate, onRefresh, loading }: { lastUpdate: string | null; onRefresh?: () => void; loading?: boolean }) {
  const timeStr = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <RefreshCw size={12} />
        {timeStr ? `Zuletzt aktualisiert: ${timeStr} Uhr` : 'Keine Aktualisierung bisher'}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Aktualisieren
        </button>
      )}
    </div>
  );
}
