import { useState } from 'react';
import { Lock, Unlock, Shield, Check } from 'lucide-react';
import { isWalletPinSet, setWalletPin, clearWalletPin, verifyWalletPin } from '@/lib/walletSecurity';

interface WalletLockProps {
  onUnlocked: () => void;
  locked: boolean;
  onLock: () => void;
}

export function WalletLock({ onUnlocked, locked, onLock }: WalletLockProps) {
  const pinIsSet = isWalletPinSet();
  const [mode, setMode] = useState<'idle' | 'enter' | 'setup' | 'confirm' | 'remove'>(pinIsSet ? 'idle' : 'idle');
  const [enteredPin, setEnteredPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEnteredPin('');
    setFirstPin('');
    setError(null);
    setMode('idle');
  };

  if (locked && pinIsSet) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Lock size={22} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">Wallet gesperrt</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Gib deinen PIN ein, um das Wallet zu entsperren.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, '')); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && enteredPin.length === 4) {
              if (verifyWalletPin(enteredPin)) {
                onUnlocked();
                reset();
              } else {
                setError('Falscher PIN.');
                setEnteredPin('');
              }
            }
          }}
          placeholder="••••"
          className="w-24 h-12 mx-auto text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 mb-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <button
          onClick={() => {
            if (verifyWalletPin(enteredPin)) { onUnlocked(); reset(); }
            else { setError('Falscher PIN.'); setEnteredPin(''); }
          }}
          disabled={enteredPin.length !== 4}
          className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm disabled:opacity-50 hover:bg-primary-700 transition-colors"
        >
          Entperren
        </button>
      </div>
    );
  }

  if (mode === 'setup') {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">PIN festlegen</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Wähle einen 4-stelligen PIN zum Schutz des Wallets.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, '')); setError(null); }}
          placeholder="••••"
          className="w-24 h-12 mx-auto block text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 mb-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button
            onClick={() => {
              if (enteredPin.length !== 4) { setError('PIN muss 4 Ziffern haben.'); return; }
              setFirstPin(enteredPin);
              setEnteredPin('');
              setMode('confirm');
            }}
            className="flex-1 h-10 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors"
          >
            Weiter
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'confirm') {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">PIN bestätigen</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Gib den PIN erneut ein.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, '')); setError(null); }}
          placeholder="••••"
          className="w-24 h-12 mx-auto block text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 mb-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button
            onClick={() => {
              if (enteredPin !== firstPin) { setError('PINs stimmen nicht überein.'); setEnteredPin(''); return; }
              setWalletPin(enteredPin);
              reset();
            }}
            className="flex-1 h-10 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-colors"
          >
            Speichern
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'remove') {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Unlock size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">PIN entfernen</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Gib deinen aktuellen PIN ein, um den Schutz zu entfernen.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, '')); setError(null); }}
          placeholder="••••"
          className="w-24 h-12 mx-auto block text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 mb-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button
            onClick={() => {
              if (verifyWalletPin(enteredPin)) { clearWalletPin(); onLock(); reset(); }
              else { setError('Falscher PIN.'); setEnteredPin(''); }
            }}
            className="flex-1 h-10 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            Entfernen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lock size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Wallet-Schutz</h3>
        {pinIsSet && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 ml-auto">
            <Check size={11} /> Aktiv
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        {pinIsSet
          ? 'Das Wallet ist durch einen PIN geschützt. Nur das Wallet ist gesperrt – die restliche App bleibt frei nutzbar.'
          : 'Schütze dein Wallet mit einem PIN. Die restliche App bleibt ohne PIN nutzbar.'}
      </p>
      {pinIsSet ? (
        <button
          onClick={() => setMode('remove')}
          className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Unlock size={15} /> PIN entfernen
        </button>
      ) : (
        <button
          onClick={() => setMode('setup')}
          className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
        >
          <Lock size={15} /> PIN festlegen
        </button>
      )}
    </div>
  );
}
