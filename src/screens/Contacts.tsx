import { useMemo, useState } from 'react';
import { Plus, Phone, Mail, Trash2, Building2, Search as SearchIcon, ContactRound } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { Contact } from '@/types';
import { Sheet } from '@/components/ui/Sheet';
import { Capacitor } from '@capacitor/core';
import { Contacts as ContactsPlugin } from '@capacitor/contacts';

interface ContactsProps {
  onOpenSearch: () => void;
}

export function Contacts({ onOpenSearch }: ContactsProps) {
  const { contactsApi } = useOrganizer();
  const { contacts } = contactsApi;
  const [selected, setSelected] = useState<Contact | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const sorted = useMemo(() => [...contacts].sort((a, b) => a.name.localeCompare(b.name)), [contacts]);

  return (
    <div className="px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kontakte</h1>
        <button
          onClick={onOpenSearch}
          className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400"
          aria-label="Suche"
        >
          <SearchIcon size={18} />
        </button>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Kontakte.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelected(contact)}
              className="w-full text-left flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center font-semibold text-sm shrink-0">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{contact.name}</p>
                {(contact.organization || contact.category) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {contact.organization ?? contact.category}
                  </p>
                )}
              </div>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 w-9 h-9 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 flex items-center justify-center"
                  aria-label="Anrufen"
                >
                  <Phone size={16} />
                </a>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setAddOpen(true)}
        className="fixed right-4 bottom-[calc(88px+env(safe-area-inset-bottom))] w-14 h-14 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg flex items-center justify-center active:scale-90 transition-transform z-20"
        aria-label="Kontakt hinzufügen"
      >
        <Plus size={24} />
      </button>

      {selected && <ContactDetail contact={selected} onClose={() => setSelected(null)} />}
      <AddContactSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function ContactDetail({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const { contactsApi } = useOrganizer();
  return (
    <Sheet open={!!contact} onClose={onClose} title={contact.name}>
      <div className="space-y-4">
        {contact.organization && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Building2 size={15} /> {contact.organization}
          </div>
        )}

        <div className="space-y-2">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 p-3.5">
              <span className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0"><Phone size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-green-700 dark:text-green-300">Telefon</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{contact.phone}</p>
              </div>
              <span className="text-xs font-semibold text-green-700 dark:text-green-300">Anrufen</span>
            </a>
          )}
          {contact.phone_alt && (
            <a href={`tel:${contact.phone_alt}`} className="flex items-center gap-3 rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 p-3.5">
              <span className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0"><Phone size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-green-700 dark:text-green-300">Alternativ</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{contact.phone_alt}</p>
              </div>
              <span className="text-xs font-semibold text-green-700 dark:text-green-300">Anrufen</span>
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 rounded-2xl bg-primary-50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/40 p-3.5">
              <span className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0"><Mail size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-primary-700 dark:text-primary-300">E-Mail</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{contact.email}</p>
              </div>
              <span className="text-xs font-semibold text-primary-700 dark:text-primary-300">Schreiben</span>
            </a>
          )}
        </div>

        {contact.notes && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-sm text-slate-600 dark:text-slate-300">
            {contact.notes}
          </div>
        )}

        {contact.category && (
          <div className="text-xs text-slate-400 dark:text-slate-500">Kategorie: {contact.category}</div>
        )}

        <button
          onClick={async () => {
            await contactsApi.deleteContact(contact.id);
            onClose();
          }}
          className="w-full h-11 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-medium text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
        >
          <Trash2 size={16} /> Kontakt löschen
        </button>
      </div>
    </Sheet>
  );
}

function AddContactSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { contactsApi } = useOrganizer();
  const [form, setForm] = useState({ name: '', organization: '', phone: '', phone_alt: '', email: '', category: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await contactsApi.addContact({
        name: form.name.trim(),
        organization: form.organization.trim() || null,
        phone: form.phone.trim() || null,
        phone_alt: form.phone_alt.trim() || null,
        email: form.email.trim() || null,
        category: form.category.trim() || null,
        notes: form.notes.trim() || null,
      });
      setForm({ name: '', organization: '', phone: '', phone_alt: '', email: '', category: '', notes: '' });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const pickFromAddressBook = async () => {
    setPickError(null);
    try {
      if (!Capacitor.isNativePlatform()) {
        setPickError('Adressbuch-Zugriff nur auf dem Handy verfügbar.');
        return;
      }
      const perm = await ContactsPlugin.requestPermissions();
      if (perm.contacts !== 'granted') {
        setPickError('Zugriff auf Adressbuch verweigert.');
        return;
      }
      const result = await ContactsPlugin.pickContact();
      const c = result.contact;
      const name = [c.givenName, c.familyName].filter(Boolean).join(' ').trim() || c.displayName?.trim() || '';
      if (!name) {
        setPickError('Kein Name im gewählten Kontakt gefunden.');
        return;
      }
      const phone = c.phoneNumbers?.[0]?.number ?? '';
      const email = c.emails?.[0]?.address ?? '';
      const org = c.organizationName ?? '';
      setForm({
        name,
        organization: org,
        phone,
        phone_alt: c.phoneNumbers?.[1]?.number ?? '',
        email,
        category: '',
        notes: '',
      });
    } catch {
      setPickError('Kontakt konnte nicht ausgewählt werden.');
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Neuer Kontakt"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving} className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <button
          onClick={pickFromAddressBook}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 py-2.5 text-sm font-medium transition-colors hover:bg-primary-100 dark:hover:bg-primary-950/50"
        >
          <ContactRound size={16} /> Aus Adressbuch wählen
        </button>
        {pickError && (
          <p className="text-xs text-red-500 dark:text-red-400 text-center">{pickError}</p>
        )}
        <div className="h-px bg-slate-100 dark:bg-slate-800" />
        <FormField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoFocus />
        <FormField label="Organisation" value={form.organization} onChange={(v) => setForm({ ...form, organization: v })} />
        <FormField label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
        <FormField label="Alternative Telefonnummer" value={form.phone_alt} onChange={(v) => setForm({ ...form, phone_alt: v })} type="tel" />
        <FormField label="E-Mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
        <FormField label="Kategorie" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <FormField label="Notizen" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} textarea />
      </div>
    </Sheet>
  );
}

function FormField({ label, value, onChange, type = 'text', textarea, autoFocus }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; autoFocus?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 resize-none" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus} className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" />
      )}
    </label>
  );
}
