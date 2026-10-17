import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Shield, Check, Fingerprint, ScanFace, KeyRound, Camera } from 'lucide-react';
import {
  isDocPinSet,
  setDocPin,
  clearDocPin,
  verifyDocPin,
  isBiometricEnabled,
  setBiometricEnabled,
  isBiometricAvailable,
  registerBiometric,
  verifyBiometric,
} from '@/lib/docSecurity';

interface DocLockProps {
  locked: boolean;
  onUnlocked: () => void;
  onLock: () => void;
}

export function DocLock({ locked, onUnlocked, onLock }: DocLockProps) {
  const pinIsSet = isDocPinSet();
  const biometricEnabled = isBiometricEnabled();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [mode, setMode] = useState<'idle' | 'setup' | 'confirm' | 'remove'>('idle');
  const [enteredPin, setEnteredPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const reset = useCallback(() => {
    setEnteredPin('');
    setFirstPin('');
    setError(null);
    setMode('idle');
  }, []);

  const tryBiometricUnlock = useCallback(async () => {
    const ok = await verifyBiometric();
    if (ok) onUnlocked();
    else setError('Biometrische Erkennung fehlgeschlagen.');
  }, [onUnlocked]);

  if (locked && pinIsSet) {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-3">
          <Lock size={26} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Reisemappe gesperrt</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Entsperre mit PIN oder Biometrie.</p>

        {biometricEnabled && (
          <div className="flex justify-center gap-3 mb-4">
            <button
              onClick={tryBiometricUnlock}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Fingerprint size={24} className="text-primary-600 dark:text-primary-400" />
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">Fingerabdruck</span>
            </button>
            <button
              onClick={tryBiometricUnlock}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ScanFace size={24} className="text-primary-600 dark:text-primary-400" />
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">Gesicht</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          <span className="text-[10px] text-slate-400">oder PIN</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, '')); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && enteredPin.length === 4) {
              if (verifyDocPin(enteredPin)) { onUnlocked(); reset(); }
              else { setError('Falscher PIN.'); setEnteredPin(''); }
            }
          }}
          placeholder="••••"
          className="w-28 h-12 mx-auto text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 mb-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <button
          onClick={() => {
            if (verifyDocPin(enteredPin)) { onUnlocked(); reset(); }
            else { setError('Falscher PIN.'); setEnteredPin(''); }
          }}
          disabled={enteredPin.length !== 4}
          className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm disabled:opacity-50 hover:bg-primary-700 transition-colors"
        >
          Entsperren
        </button>
      </div>
    );
  }

  if (mode === 'setup') {
    return (
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound size={16} className="text-primary-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">PIN festlegen</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Wähle einen 4-stelligen PIN zum Schutz der Reisemappe.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, '')); setError(null); }}
          placeholder="••••"
          className="w-28 h-12 mx-auto block text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 mb-3"
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
          <KeyRound size={16} className="text-primary-500" />
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
          className="w-28 h-12 mx-auto block text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 mb-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button
            onClick={() => {
              if (enteredPin !== firstPin) { setError('PINs stimmen nicht überein.'); setEnteredPin(''); return; }
              setDocPin(enteredPin);
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
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Schutz entfernen</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Gib deinen PIN ein, um den Schutz zu entfernen.</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={enteredPin}
          onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, '')); setError(null); }}
          placeholder="••••"
          className="w-28 h-12 mx-auto block text-center text-xl font-bold tracking-[0.5em] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 mb-3"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={reset} className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button
            onClick={() => {
              if (verifyDocPin(enteredPin)) {
                clearDocPin();
                setBiometricEnabled(false);
                onLock();
                reset();
              } else { setError('Falscher PIN.'); setEnteredPin(''); }
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
        <Shield size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reisemappen-Schutz</h3>
        {pinIsSet && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 ml-auto">
            <Check size={11} /> Aktiv
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        {pinIsSet
          ? 'Die Reisemappe ist geschützt. Nur die Reisemappe ist gesperrt – die restliche App bleibt frei nutzbar.'
          : 'Schütze deine Dokumente mit PIN, Fingerabdruck oder Gesichtserkennung.'}
      </p>

      {pinIsSet && biometricAvailable && (
        <button
          onClick={async () => {
            if (biometricEnabled) {
              setBiometricEnabled(false);
            } else {
              const ok = await registerBiometric();
              if (ok) setBiometricEnabled(true);
              else setError('Biometrie konnte nicht aktiviert werden.');
            }
          }}
          className={`w-full h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors mb-2 ${
            biometricEnabled
              ? 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50'
              : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {biometricEnabled ? <Check size={15} /> : <Fingerprint size={15} />}
          {biometricEnabled ? 'Biometrie aktiv' : 'Biometrie aktivieren'}
        </button>
      )}

      {pinIsSet ? (
        <button
          onClick={() => setMode('remove')}
          className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Unlock size={15} /> Schutz entfernen
        </button>
      ) : (
        <button
          onClick={() => setMode('setup')}
          className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
        >
          <Lock size={15} /> PIN festlegen
        </button>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
    </div>
  );
}
