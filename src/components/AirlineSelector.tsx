import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Check, X, Plane } from 'lucide-react';
import { AIRLINES, Airline } from '@/lib/airlineData';

interface AirlineSelectorProps {
  value: string;
  onChange: (airline: Airline | null) => void;
}

export function AirlineSelector({ value, onChange }: AirlineSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return AIRLINES;
    return AIRLINES.filter(
      (a) => a.name.toLowerCase().includes(q) || a.iata.toLowerCase().includes(q)
    );
  }, [query]);

  const selected = AIRLINES.find((a) => a.name === value) ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 flex items-center justify-between"
      >
        <span className={selected ? '' : 'text-slate-400'}>
          {selected ? selected.name : 'Fluggesellschaft wählen'}
        </span>
        {selected && <span className="text-xs text-slate-400">{selected.iata}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Fluggesellschaft</h2>
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
                  placeholder="Suchen nach Name oder Code…"
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
                  <span className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 text-xs font-bold">
                    {a.iata}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.name}</p>
                    {a.website && <p className="text-xs text-slate-400 truncate">{a.website.replace(/^https?:\/\//, '')}</p>}
                  </div>
                  {selected?.name === a.name && <Check size={18} className="text-primary-600 shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="py-8 text-center">
                  <Plane size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-400">Keine Fluggesellschaft gefunden.</p>
                </div>
              )}
              <button
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                  setQuery('');
                }}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left mt-1"
              >
                <span className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 text-xs">
                  Andere
                </span>
                <span className="text-sm text-slate-600 dark:text-slate-300">Andere Fluggesellschaft (manuell eingeben)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
