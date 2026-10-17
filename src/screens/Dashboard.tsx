import { useMemo, useState, useEffect, useCallback } from 'react';
import { Plane, Calendar, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, RefreshCw, MapPin, Globe, Navigation, Train, Cloud, CloudRain, Sun, CloudSun, CloudSnow, Sunrise, Sunset } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { useAuth } from '@/context/AuthContext';
import { FlightStatusBadge } from '@/components/FlightStatusBadge';
import { FlightDetail } from '@/components/FlightDetail';
import { formatRelativeDate, formatTime, formatDateShort, todayISO } from '@/lib/dateUtils';
import { fetchAndStoreFlightStatus, shouldRefreshFlightStatus } from '@/lib/flightApi';
import { supabase } from '@/lib/supabase';
import { getCountryFlag } from '@/lib/countryFlags';
import { getAirportTimezone, getCityTimezone, formatTimeInZone } from '@/lib/timezoneData';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  sunrise: string | null;
  sunset: string | null;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=sunrise,sunset&timezone=auto`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.current) return null;
    return {
      temperature: Math.round(data.current.temperature_2m),
      weatherCode: data.current.weather_code,
      windSpeed: Math.round(data.current.wind_speed_10m),
      humidity: Math.round(data.current.relative_humidity_2m),
      sunrise: data?.daily?.sunrise?.[0] ?? null,
      sunset: data?.daily?.sunset?.[0] ?? null,
    };
  } catch {
    return null;
  }
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'de' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

function weatherIcon(code: number): typeof Sun {
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return Cloud;
  if (code <= 67) return CloudRain;
  if (code <= 77) return CloudSnow;
  if (code <= 82) return CloudRain;
  if (code <= 99) return CloudRain;
  return Cloud;
}

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

type ClockStyle = 'analog' | 'digital';

const CLOCK_COLOR_PRESETS = [
  { id: 'blue', color: '#3b82f6' },
  { id: 'teal', color: '#14b8a6' },
  { id: 'green', color: '#22c55e' },
  { id: 'orange', color: '#f97316' },
  { id: 'rose', color: '#f43f5e' },
  { id: 'amber', color: '#f59e0b' },
  { id: 'cyan', color: '#06b6d4' },
  { id: 'red', color: '#ef4444' },
  { id: 'violet', color: '#8b5cf6' },
  { id: 'pink', color: '#ec4899' },
  { id: 'emerald', color: '#10b981' },
  { id: 'indigo', color: '#6366f1' },
];

export function Dashboard({ onNavigate }: DashboardProps) {
  const { tripsApi } = useOrganizer();
  const { user } = useAuth();
  const allSegments = tripsApi.segments;
  const [flightDetailSegment, setFlightDetailSegment] = useState<typeof allSegments[number] | null>(null);
  const [refreshingFlight, setRefreshingFlight] = useState(false);
  const [overdueChecklistItems, setOverdueChecklistItems] = useState<{ label: string }[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [clockStyle, setClockStyle] = useState<ClockStyle>('analog');
  const [homeClockColor, setHomeClockColor] = useState<string>(() => localStorage.getItem('klarly-clock-home-color') || '#3b82f6');
  const [destClockColor, setDestClockColor] = useState<string>(() => localStorage.getItem('klarly-clock-dest-color') || '#f97316');
  const [clockColorsOpen, setClockColorsOpen] = useState(false);
  const [homeWeather, setHomeWeather] = useState<WeatherData | null>(null);
  const [destWeather, setDestWeather] = useState<WeatherData | null>(null);

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

  const tripCountdown = useMemo(() => {
    if (!nextTrip || !nextTrip.depDate) return null;
    const dep = new Date(nextTrip.depDate + 'T00:00:00').getTime();
    const diff = dep - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, started: true };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return { days, hours, minutes, started: false };
  }, [nextTrip, now]);

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

  const fetchWeatherData = useCallback(async () => {
    try {
      const homeCoords = await geocodeCity('Nürnberg, Deutschland');
      if (homeCoords) {
        const w = await fetchWeather(homeCoords.lat, homeCoords.lon);
        setHomeWeather(w);
      }
      if (nextTrip?.trip.destination) {
        const destCoords = await geocodeCity(nextTrip.trip.destination);
        if (destCoords) {
          const w = await fetchWeather(destCoords.lat, destCoords.lon);
          setDestWeather(w);
        } else {
          setDestWeather(null);
        }
      } else {
        setDestWeather(null);
      }
    } catch {
      // silent
    }
  }, [nextTrip?.trip.destination]);

  useEffect(() => {
    fetchWeatherData();
    const id = setInterval(fetchWeatherData, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchWeatherData]);

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

  const handleHomeClockColorChange = (color: string) => {
    setHomeClockColor(color);
    localStorage.setItem('klarly-clock-home-color', color);
  };

  const handleDestClockColorChange = (color: string) => {
    setDestClockColor(color);
    localStorage.setItem('klarly-clock-dest-color', color);
  };

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
          {(() => {
            const flag = getCountryFlag(nextTrip.trip.destination);
            return flag ? (
              <span className="absolute -right-6 -top-6 text-[200px] leading-none opacity-[0.13] select-none pointer-events-none">{flag}</span>
            ) : null;
          })()}
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-sm text-white/80 mb-2">
              <MapPin size={14} />
              <span>{nextTrip.trip.destination ?? nextTrip.trip.name}</span>
            </div>
            {tripCountdown ? (
              <div>
                <p className="text-sm text-white/85">
                  {userName ? `${userName}, deine ` : 'Deine '}Reise nach {nextTrip.trip.destination ?? nextTrip.trip.name}
                </p>
                {tripCountdown.started ? (
                  <p className="text-4xl font-bold mt-1">startet heute!</p>
                ) : (
                  <div className="mt-1">
                    <p className="text-4xl font-bold">
                      {tripCountdown.days > 0 && `${tripCountdown.days} Tag${tripCountdown.days === 1 ? '' : 'e'}`}
                    </p>
                    <p className="text-lg font-semibold text-white/90 mt-0.5 tabular-nums">
                      {String(tripCountdown.hours).padStart(2, '0')} Std {String(tripCountdown.minutes).padStart(2, '0')} Min
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold mt-1">{nextTrip.trip.name}</p>
                {nextTrip.trip.destination && <p className="text-sm text-white/85 mt-0.5">Reise nach {nextTrip.trip.destination}</p>}
                <p className="text-xs text-white/70 mt-1">Noch kein Abreisedatum festgelegt</p>
              </div>
            )}
          </div>

          {/* Overdue checklist items only */}
          {hasOverdueItems && (
            <div className="mt-4 pt-4 border-t border-white/20 relative z-10 space-y-1.5">
              <p className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                <AlertCircle size={13} /> Überfällige Checkliste:
              </p>
              {overdueChecklistItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-red-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </div>
          )}

          {!hasOverdueItems && (
            <div className="mt-4 pt-4 border-t border-white/20 relative z-10">
              <p className="text-sm text-white/85 flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Du bist startklar!
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
          {nextTrainSegment.last_train_status && nextTrainSegment.last_train_status !== 'unknown' && (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full text-[10px] px-2 py-0.5 font-medium ${
                nextTrainSegment.last_train_status === 'on_time' ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                : nextTrainSegment.last_train_status === 'delayed' ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300'
              }`}>
                {nextTrainSegment.last_train_status === 'on_time' ? 'Pünktlich' : nextTrainSegment.last_train_status === 'delayed' ? `+${nextTrainSegment.delay_minutes_train ?? 0} Min` : 'Ausgefallen'}
              </span>
            </div>
          )}
          {!nextTrainSegment.last_train_status && (
            <p className="text-[10px] text-slate-400 mt-2">Keine Live-Daten verfügbar</p>
          )}
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
        <div className="grid grid-cols-2 gap-4">
          <ClockCard label="Nürnberg" subLabel="Deutschland" tz={homeTimezone} now={now} style={clockStyle} highlight accentColor={homeClockColor} sunrise={homeWeather?.sunrise ?? null} sunset={homeWeather?.sunset ?? null} weather={homeWeather} />
          {destinationTimezone ? (
            <ClockCard label={destinationTimezone.label} subLabel="Reiseziel" tz={destinationTimezone.tz} now={now} style={clockStyle} accentColor={destClockColor} highlight sunrise={destWeather?.sunrise ?? null} sunset={destWeather?.sunset ?? null} weather={destWeather} />
          ) : (
            <ClockCard label="Reiseziel" subLabel="noch offen" tz={homeTimezone} now={now} style={clockStyle} dimmed accentColor={destClockColor} sunrise={null} sunset={null} weather={null} />
          )}
        </div>
        {/* Collapsible color picker */}
        <button
          onClick={() => setClockColorsOpen(!clockColorsOpen)}
          className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          <span>Farben</span>
          {clockColorsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {clockColorsOpen && (
          <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3 space-y-3">
            <ColorRow
              label="Heimatuhr"
              selectedColor={homeClockColor}
              onPick={handleHomeClockColorChange}
            />
            <ColorRow
              label="Reiseuhr"
              selectedColor={destClockColor}
              onPick={handleDestClockColorChange}
            />
          </div>
        )}
      </div>

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

function formatSunTime(iso: string | null, tz: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('de-DE', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function ClockCard({ label, subLabel, tz, now, style, highlight, dimmed, accentColor, sunrise, sunset, weather }: {
  label: string;
  subLabel: string;
  tz: string;
  now: number;
  style: ClockStyle;
  highlight?: boolean;
  dimmed?: boolean;
  accentColor: string;
  sunrise: string | null;
  sunset: string | null;
  weather: WeatherData | null;
}) {
  const { time, date, offset } = formatTimeInZone(tz);
  const sunriseStr = formatSunTime(sunrise, tz);
  const sunsetStr = formatSunTime(sunset, tz);
  const WeatherIcon = weather ? weatherIcon(weather.weatherCode) : null;

  if (style === 'analog') {
    return (
      <div className={`relative rounded-full aspect-square overflow-hidden ${
        highlight ? 'border-2' : 'border border-slate-100 dark:border-slate-800'
      } ${dimmed ? 'opacity-50' : ''}`}
      style={highlight ? { borderColor: accentColor, backgroundColor: `${accentColor}10` } : undefined}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <AnalogClock tz={tz} now={now} highlight={highlight} accentColor={accentColor} sunrise={sunrise} sunset={sunset} weather={weather} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-2 pt-6 bg-gradient-to-t from-white/95 dark:from-slate-900/95 via-white/70 dark:via-slate-900/70 to-transparent">
          <p className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[70%] text-center leading-tight">{label}</p>
          {weather && WeatherIcon && (
            <div className="flex items-center gap-0.5 mt-0.5">
              <WeatherIcon size={11} className="text-sky-500" />
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{weather.temperature}°</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5 text-[9px]">
            {sunriseStr && <span className="flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400"><Sunrise size={9} />{sunriseStr}</span>}
            {sunsetStr && <span className="flex items-center gap-0.5 font-semibold text-green-600 dark:text-green-400"><Sunset size={9} />{sunsetStr}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-full aspect-square overflow-hidden flex flex-col items-center justify-center p-3 ${
      highlight
        ? 'text-white'
        : 'bg-slate-900 dark:bg-slate-800 border border-slate-700 text-white'
    } ${dimmed ? 'opacity-50' : ''}`}
    style={highlight ? { background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` } : undefined}
    >
      <p className="text-[11px] font-bold truncate max-w-[75%] text-center leading-tight">{label}</p>
      <p className={`text-[8px] leading-tight ${highlight ? 'text-white/60' : 'text-slate-400'}`}>{subLabel}</p>
      <p className="text-2xl font-bold tabular-nums font-mono tracking-wider mt-1.5">{time}</p>
      <p className={`text-[8px] leading-tight mt-0.5 ${highlight ? 'text-white/60' : 'text-slate-400'}`}>{date}</p>
      {weather && WeatherIcon && (
        <div className={`flex items-center gap-1 mt-1 ${highlight ? 'text-white' : 'text-slate-200'}`}>
          <WeatherIcon size={14} />
          <span className="text-sm font-bold">{weather.temperature}°C</span>
        </div>
      )}
      <div className={`flex items-center gap-2 mt-1 text-[9px] ${highlight ? 'text-white/90' : 'text-slate-300'}`}>
        {sunriseStr && <span className="flex items-center gap-0.5 font-semibold text-amber-300"><Sunrise size={9} />{sunriseStr}</span>}
        {sunsetStr && <span className="flex items-center gap-0.5 font-semibold text-green-300"><Sunset size={9} />{sunsetStr}</span>}
      </div>
    </div>
  );
}

function AnalogClock({ tz, now, highlight, accentColor, sunrise, sunset, weather }: { tz: string; now: number; highlight?: boolean; accentColor: string; sunrise: string | null; sunset: string | null; weather: WeatherData | null }) {
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

  // Convert ISO sunrise/sunset to positions on the clock arc
  const sunPos = (iso: string | null) => {
    if (!iso) return null;
    try {
      const sunParts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(new Date(iso));
      const sh = parseInt(sunParts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24;
      const sm = parseInt(sunParts.find((p) => p.type === 'minute')?.value ?? '0', 10);
      const angleDeg = ((sh + sm / 60) / 24) * 360;
      const rad = (angleDeg - 90) * (Math.PI / 180);
      const pos = { x: 50 + 44 * Math.cos(rad), y: 50 + 44 * Math.sin(rad), rad, minutes: sm };
      // Offset text outward from the marker
      const tx = 50 + 50 * Math.cos(rad);
      const ty = 50 + 50 * Math.sin(rad);
      return { ...pos, tx, ty };
    } catch {
      return null;
    }
  };
  const sunrisePos = sunPos(sunrise);
  const sunsetPos = sunPos(sunset);

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {/* Face */}
      <circle cx="50" cy="50" r="49" fill={highlight ? `${accentColor}08` : '#1e293b'} stroke={highlight ? accentColor : '#334155'} strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill="none" stroke={highlight ? `${accentColor}20` : '#334155'} strokeWidth="0.5" />
      {/* Day arc between sunrise and sunset */}
      {sunrisePos && sunsetPos && (
        <path
          d={`M ${sunrisePos.x} ${sunrisePos.y} A 44 44 0 0 1 ${sunsetPos.x} ${sunsetPos.y}`}
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
      )}
      {/* Sunrise marker */}
      {sunrisePos && (
        <circle cx={sunrisePos.x} cy={sunrisePos.y} r="3" fill="#facc15" stroke="#white" strokeWidth="0.5" />
      )}
      {/* Sunset marker */}
      {sunsetPos && (
        <circle cx={sunsetPos.x} cy={sunsetPos.y} r="3" fill="#22c55e" stroke="#white" strokeWidth="0.5" />
      )}
      {/* Hour markers */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x1 = 50 + 38 * Math.cos(angle);
        const y1 = 50 + 38 * Math.sin(angle);
        const x2 = 50 + 42 * Math.cos(angle);
        const y2 = 50 + 42 * Math.sin(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={highlight ? '#475569' : '#64748b'} strokeWidth="1.2" strokeLinecap="round" />;
      })}
      {/* Weather temperature in upper clock face */}
      {weather && (
        <text x="50" y="26" textAnchor="middle" fontSize="7" fontWeight="bold" fill={highlight ? accentColor : '#94a3b8'} fontFamily="monospace">
          {weather.temperature}°
        </text>
      )}
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
        stroke={accentColor} strokeWidth="1" strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="50" cy="50" r="2.5" fill={accentColor} />
    </svg>
  );
}

function ColorRow({ label, selectedColor, onPick }: { label: string; selectedColor: string; onPick: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        {CLOCK_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPick(preset.color)}
            className={`w-5 h-5 rounded-full transition-transform active:scale-90 ${selectedColor === preset.color ? 'scale-125 ring-2 ring-offset-1 dark:ring-offset-slate-800' : ''}`}
            style={{ backgroundColor: preset.color, boxShadow: selectedColor === preset.color ? `0 0 0 2px ${preset.color}` : undefined }}
            aria-label={preset.id}
          />
        ))}
        <label className="relative w-5 h-5 rounded-full overflow-hidden cursor-pointer ring-1 ring-slate-300 dark:ring-slate-600" style={{ backgroundColor: selectedColor }}>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => onPick(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
