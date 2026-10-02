import { useState, useEffect, useCallback } from 'react';
import { Train, Clock, Calendar, MapPin, Armchair, Ticket, AlertTriangle, ExternalLink } from 'lucide-react';
import { TripSegment } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { TrainStatusBadge, PlatformChangeAlert, TrainLiveUpdateInfo } from '@/components/TrainStatusBadge';
import { isRailApiConfigured, shouldRefreshTrainStatus, fetchAndStoreTrainStatus } from '@/lib/railApi';
import { formatDateShort, formatTime } from '@/lib/dateUtils';
import { useOrganizer } from '@/context/OrganizerContext';

interface TrainDetailProps {
  segment: TripSegment;
  open: boolean;
  onClose: () => void;
  tripName?: string;
}

export function TrainDetail({ segment, open, onClose, tripName }: TrainDetailProps) {
  const { tripsApi } = useOrganizer();
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!segment.train_number || !segment.departure_date) return;
    setLiveLoading(true);
    setLiveError(null);
    try {
      const result = await fetchAndStoreTrainStatus(segment, tripsApi.updateSegment);
      if (!result && !isRailApiConfigured()) {
        setLiveError('Live-Daten momentan nicht verfügbar. Entweder sind die DB-API-Zugangsdaten noch nicht hinterlegt oder die Verbindung konnte nicht gefunden werden.');
      } else if (!result) {
        setLiveError('Zug nicht in den Live-Daten gefunden. Prüfe Zugnummer und Abfahrtsbahnhof.');
      }
    } catch {
      setLiveError('Live-Daten konnten nicht abgerufen werden.');
    } finally {
      setLiveLoading(false);
    }
  }, [segment, tripsApi]);

  useEffect(() => {
    if (open && shouldRefreshTrainStatus(segment)) {
      refreshStatus();
    }
  }, [open, segment, refreshStatus]);

  const hasLiveStatus = segment.last_train_status && segment.last_train_status !== 'unknown';

  return (
    <Sheet open={open} onClose={onClose} title="Zugdetails">
      <div className="space-y-5">
        {/* Train header */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-100">Zugverbindung</p>
              <h2 className="text-lg font-bold">{segment.train_number ?? segment.title ?? 'Zug'}</h2>
              {segment.train_operator && <p className="text-xs text-emerald-100 mt-0.5">{segment.train_operator}</p>}
            </div>
            {segment.train_number && (
              <div className="text-right">
                <p className="text-xs text-emerald-100">Zugnummer</p>
                <p className="text-xl font-bold font-mono">{segment.train_number}</p>
              </div>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {segment.from_location ?? '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Abfahrtsbahnhof</p>
            </div>
            <div className="flex flex-col items-center">
              <Train size={22} className="text-emerald-600 dark:text-emerald-400" />
              <div className="w-16 h-px bg-slate-200 dark:bg-slate-700 my-1" />
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {segment.to_location ?? '—'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Zielbahnhof</p>
            </div>
          </div>
          {segment.departure_date && (
            <p className="text-center text-sm text-slate-600 dark:text-slate-300 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {formatDateShort(segment.departure_date)}
              {segment.departure_time && ` · ${formatTime(segment.departure_time)} Uhr`}
            </p>
          )}
        </div>

        {/* Live Status */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Zugstatus</h3>
            <TrainStatusBadge
              status={segment.last_train_status}
              delayMinutes={segment.delay_minutes_train}
              platformChanged={segment.platform_changed}
              compact
            />
          </div>

          {segment.platform_changed && (
            <PlatformChangeAlert previousPlatform={segment.previous_platform} newPlatform={segment.last_known_platform} />
          )}

          {segment.last_train_status === 'delayed' && segment.delay_minutes_train && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Verspätung: +{segment.delay_minutes_train} Minuten</span>
              </div>
            </div>
          )}

          {segment.last_train_status === 'cancelled' && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertTriangle size={16} /> Dieser Zug fällt aus.
            </div>
          )}

          {liveError && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock size={14} /> {liveError}
            </div>
          )}

          {!hasLiveStatus && !liveError && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Clock size={14} /> Tippe auf "Aktualisieren", um Live-Daten von der Deutschen Bahn abzufragen. Beim ersten Abruf kann es kurz dauern.
            </div>
          )}

          <TrainLiveUpdateInfo lastUpdate={segment.last_train_update} onRefresh={refreshStatus} loading={liveLoading} />
        </div>

        {/* Schedule */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Fahrplan</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} /> Abfahrt</p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {segment.departure_date ? formatDateShort(segment.departure_date) : '—'}
              </p>
              {segment.departure_time && <p className="text-sm text-slate-600 dark:text-slate-300">{formatTime(segment.departure_time)} Uhr</p>}
            </div>
            <div>
              <p className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={11} /> Ankunft</p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {segment.arrival_date ? formatDateShort(segment.arrival_date) : '—'}
              </p>
              {segment.arrival_time && <p className="text-sm text-slate-600 dark:text-slate-300">{formatTime(segment.arrival_time)} Uhr</p>}
            </div>
          </div>
        </div>

        {/* Platform & seat */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Gleis & Wagen</h3>
          <div className="grid grid-cols-2 gap-4">
            <DetailRow icon={<MapPin size={14} />} label="Gleis" value={segment.last_known_platform ?? segment.platform} />
            <DetailRow icon={<Armchair size={14} />} label="Sitzplatz" value={segment.seat_number} />
            <DetailRow icon={<Train size={14} />} label="Wagen" value={segment.wagon} />
            {segment.booking_number && <DetailRow icon={<Ticket size={14} />} label="Buchungsnummer" value={segment.booking_number} mono />}
          </div>
        </div>

        {/* DB Journey planner link */}
        {segment.train_number && (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Reiseauskunft</h3>
            <a
              href={`https://reiseauskunft.bahn.de/bin/query.exe/d?S=${encodeURIComponent(segment.from_location ?? '')}&Z=${encodeURIComponent(segment.to_location ?? '')}&date=${segment.departure_date ?? ''}&time=${segment.departure_time ?? ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
            >
              <ExternalLink size={15} /> Bei der DB öffnen
            </a>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
              Öffnet die Reiseauskunft der Deutschen Bahn im Browser.
            </p>
          </div>
        )}

        {/* Notes */}
        {segment.segment_notes && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-600 dark:text-slate-300">
            {segment.segment_notes}
          </div>
        )}

        {tripName && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">Teil der Reise: {tripName}</p>
        )}
      </div>
    </Sheet>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">{icon} {label}</p>
      <p className={`text-sm font-medium text-slate-800 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
