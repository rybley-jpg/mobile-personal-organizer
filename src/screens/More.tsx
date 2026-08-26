import { useState } from 'react';
import { Moon, Sun, Plus, Tag, Trash2, Info, Bell, Plane, LogOut, User, Shield, Palette, Check, Calculator } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useOrganizer } from '@/context/OrganizerContext';
import { useAuth } from '@/context/AuthContext';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Sheet } from '@/components/ui/Sheet';
import { CurrencyConverter } from '@/screens/CurrencyConverter';

const ICON_OPTIONS = ['tag', 'home', 'briefcase', 'heart', 'plane', 'phone', 'wallet', 'calendar', 'shopping-cart', 'alert-triangle'];
const COLOR_OPTIONS = ['#64748b', '#2563eb', '#ec4899', '#0ea5e9', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444', '#8b5cf6'];

export function More() {
  const { theme, toggleTheme, accentId, setAccentId, accentPresets } = useTheme();
  const { categoriesApi } = useOrganizer();
  const { user, signOut } = useAuth();
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  return (
    <div className="px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Mehr</h1>

      <div className="space-y-5">
        {/* Account */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Konto</h2>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
                <User size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.email}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Angemeldet</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full h-11 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              <LogOut size={16} /> Abmelden
            </button>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Darstellung</h2>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4"
          >
            <span className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </span>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tippen zum Wechseln</p>
            </div>
            <span className="text-xs text-slate-400">{theme === 'dark' ? 'Aktiv' : 'Aktiv'}</span>
          </button>

          {/* Accent color picker */}
          <div className="mt-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette size={16} className="text-slate-400" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">Akzentfarbe</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {accentPresets.map((preset) => {
                const selected = accentId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setAccentId(preset.id)}
                    className={`relative w-10 h-10 rounded-full transition-transform active:scale-90 ${selected ? 'scale-110' : ''}`}
                    style={{ backgroundColor: preset.shades[600], boxShadow: selected ? `0 0 0 2px ${preset.shades[600]}, 0 0 0 4px var(--tw-ring-offset-color, white)` : undefined }}
                    aria-label={preset.name}
                  >
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check size={18} className="text-white drop-shadow" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Die Farbe wird auf alle Schaltflächen, Hervorhebungen und Akzente angewendet.
            </p>
          </div>
        </section>

        {/* Categories */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Kategorien</h2>
            <button onClick={() => setAddCatOpen(true)} className="text-primary-600 dark:text-primary-400 text-sm font-medium flex items-center gap-1">
              <Plus size={15} /> Neu
            </button>
          </div>
          <div className="space-y-1.5">
            {categoriesApi.categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5">
                <CategoryIcon icon={cat.icon} color={cat.color} size={16} />
                <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{cat.name}</span>
                {cat.is_default && <span className="text-[10px] text-slate-400">Standard</span>}
                {!cat.is_default && (
                  <button
                    onClick={() => categoriesApi.deleteCategory(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                    aria-label="Kategorie löschen"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Werkzeuge</h2>
          <button
            onClick={() => setCurrencyOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4"
          >
            <span className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center">
              <Calculator size={18} />
            </span>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Währungsrechner</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Aktuelle Wechselkurse</p>
            </div>
          </button>
        </section>

        {/* Info */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Über die App</h2>
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 space-y-3">
            <InfoRow icon={<Plane size={16} />} title="Live-Flugstatus" text="Echte Flugdaten von Airlines: Verspätungen, Gate-Wechsel, Check-in-Status und Abfluginformationen werden automatisch abgerufen." />
            <InfoRow icon={<Bell size={16} />} title="Erinnerungen" text="Push-Benachrichtigungen für anstehende Aufgaben. Bei Reisen werden sinnvolle Erinnerungen automatisch vorgeschlagen." />
            <InfoRow icon={<Tag size={16} />} title="Kategorien" text="Standardkategorien sind voreingestellt. Eigene Kategorien lassen sich jederzeit hinzufügen." />
            <InfoRow icon={<Shield size={16} />} title="Datenschutz" text="Deine Daten sind privat. Jeder Nutzer hat ein eigenes Konto – niemand sonst kann deine Aufgaben, Reisen oder Kontakte sehen." />
          </div>
        </section>

        <p className="text-center text-xs text-slate-400 dark:text-slate-600 pt-4">Klarly · Persönlicher Organizer</p>
      </div>

      <AddCategorySheet open={addCatOpen} onClose={() => setAddCatOpen(false)} />
      {currencyOpen && <CurrencyConverter onClose={() => setCurrencyOpen(false)} />}
    </div>
  );
}

function InfoRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{text}</p>
      </div>
    </div>
  );
}

function AddCategorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { categoriesApi } = useOrganizer();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await categoriesApi.addCategory(name.trim(), color, icon);
      setName('');
      onClose();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Neue Kategorie"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Gesundheit" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" autoFocus />
        </label>

        <div>
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Farbe</span>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 scale-110' : ''}`}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Symbol</span>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setIcon(ic)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${icon === ic ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
              >
                <CategoryIcon icon={ic} color={icon === ic ? '#ffffff' : color} size={16} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
