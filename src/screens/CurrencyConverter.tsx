import { useEffect, useState } from 'react';
import { X, ArrowDownUp, ChevronDown } from 'lucide-react';
import { SUPPORTED_CURRENCIES, fetchExchangeRates, convertCurrency, getFallbackRates } from '@/lib/currencyApi';

interface CurrencyConverterProps {
  onClose: () => void;
}

export function CurrencyConverter({ onClose }: CurrencyConverterProps) {
  const [amount, setAmount] = useState('100');
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('USD');
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [rateDate, setRateDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchExchangeRates('EUR')
      .then((data) => {
        if (cancelled) return;
        setRates({ ...data.rates, [data.base]: 1 });
        setRateDate(data.date);
        setUsingFallback(false);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = getFallbackRates('EUR');
        setRates({ ...fallback.rates, [fallback.base]: 1 });
        setRateDate(fallback.date + ' (offline)');
        setUsingFallback(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value.replace(/[^0-9.,]/g, ''));
  };

  const numericAmount = parseFloat(amount.replace(',', '.')) || 0;
  const result = rates ? convertCurrency(numericAmount, from, to, rates) : null;
  const unitRate = rates ? convertCurrency(1, from, to, rates) : null;

  const formatResult = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatRate = (n: number) =>
    n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in">
      <div className="flex items-center gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Schließen"
        >
          <X size={20} />
        </button>
        <h1 className="text-base font-semibold text-slate-900 dark:text-white">Währungsrechner</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4">
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Betrag</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0,00"
              className="w-full h-12 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-2xl font-semibold tabular-nums focus:outline-none focus:border-primary-500"
            />
          </label>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4">
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Von</span>
            <div className="relative">
              <select
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full h-11 pl-3 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium appearance-none focus:outline-none focus:border-primary-500"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex justify-center my-2">
            <button
              onClick={handleSwap}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center active:scale-90 transition-transform"
              aria-label="Währungen tauschen"
            >
              <ArrowDownUp size={18} />
            </button>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Nach</span>
            <div className="relative">
              <select
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full h-11 pl-3 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium appearance-none focus:outline-none focus:border-primary-500"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} · {c.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-4 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">Wechselkurse momentan nicht verfügbar. Bitte überprüfe deine Internetverbindung.</p>
          </div>
        ) : loading ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500 animate-pulse">Kurse werden geladen…</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-primary-600 p-6 text-center shadow-sm">
              <p className="text-sm font-medium text-white/80">{formatResult(numericAmount)} {from}</p>
              <p className="text-4xl font-bold text-white mt-1 tabular-nums">
                {result !== null ? formatResult(result) : '—'}
              </p>
              <p className="text-sm font-medium text-white/80 mt-1">{to}</p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Kurs</span>
                <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                  {unitRate !== null ? `1 ${from} = ${formatRate(unitRate)} ${to}` : 'Nicht verfügbar'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Stand</span>
                <span className="font-medium text-slate-900 dark:text-white">{rateDate}</span>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 dark:text-slate-600 pt-1">
              {usingFallback
                ? 'Offline-Kurse (Richtwerte). Bei Internetverbindung werden aktuelle Kurse geladen.'
                : 'Referenzkurse der Europäischen Zentralbank'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
