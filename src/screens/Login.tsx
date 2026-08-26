import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckSquare, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten.';
      if (msg.includes('Invalid login')) {
        setError('E-Mail oder Passwort ist falsch.');
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('Diese E-Mail ist bereits registriert. Bitte einloggen.');
        setMode('signin');
      } else if (msg.includes('Password should be at least')) {
        setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      } else if (msg.includes('Unable to validate email')) {
        setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center px-5 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-600/30 mb-3">
            <CheckSquare size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Klarly</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
            Dein persönlicher Organizer – privat und sicher.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-5">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`h-10 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'signin' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <LogIn size={16} /> Anmelden
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`h-10 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'signup' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <UserPlus size={16} /> Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">E-Mail</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="deine@email.de"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Passwort</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="mindestens 6 Zeichen"
                  className="w-full h-12 pl-11 pr-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-3">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Bitte warten…' : mode === 'signin' ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3">
              Nach der Registrierung kannst du sofort loslegen. Deine Daten sind nur für dich sichtbar.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-6">
          Jede Person hat ihr eigenes Konto. Deine Aufgaben, Reisen und Kontakte
          bleiben komplett privat – niemand sonst kann sie sehen.
        </p>
      </div>
    </div>
  );
}
