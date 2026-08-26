import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, X, MapPin } from 'lucide-react';
import { searchAirports, Airport } from '@/lib/airportData';

interface AirportSelectorProps {
  value: string;
  code: string | null;
  onChange: (airport: Airport | null) => void;
  placeholder?: string;
}

export function AirportSelector({ value, code, onChange, placeholder = 'Flughafen wählen' }: AirportSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => searchAirports(query), [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 flex items-center justify-between gap-2"
      >
        {code ? (
          <>
            <span className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-primary-600 dark:text-primary-400 shrink-0">{code}</span>
              <span className="truncate text-slate-600 dark:text-slate-300">{value}</span>
            </span>
          </>
        ) : (
          <span className="text-slate-400">{value || placeholder}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Flughafen</h2>
              <button onClick={() => setOpen(false)} className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-3">
                <Search size={16} className="text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Stadt, Name oder IATA-Code…"
                  className="flex-1 h-11 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-3 py-2">
              {filtered.map((a) => (
                <button
                  key={a.iata}
                  onClick={() => {
                    onChange(a);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="w-12 h-10 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    {a.iata}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.city}</p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                      <MapPin size={10} /> {a.name}, {a.country}
                    </p>
                  </div>
                  {code === a.iata && <Check size={18} className="text-primary-600 shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-8 text-center">
                  <MapPin size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">Kein Flughafen gefunden.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
