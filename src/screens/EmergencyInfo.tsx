import { useState, useEffect } from 'react';
import { Phone, User, Shield, Heart, AlertTriangle, Save } from 'lucide-react';
import { useEmergencyInfo } from '@/hooks/useEmergencyInfo';
import { Sheet } from '@/components/ui/Sheet';

export function EmergencyInfoScreen({ onClose }: { onClose: () => void }) {
  const { info, loading, saveInfo } = useEmergencyInfo();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    insurance_name: '',
    insurance_phone: '',
    embassy_name: '',
    embassy_phone: '',
    blood_type: '',
    allergies: '',
    medications: '',
    medical_notes: '',
  });

  useEffect(() => {
    if (info) {
      setForm({
        emergency_contact_name: info.emergency_contact_name ?? '',
        emergency_contact_phone: info.emergency_contact_phone ?? '',
        insurance_name: info.insurance_name ?? '',
        insurance_phone: info.insurance_phone ?? '',
        embassy_name: info.embassy_name ?? '',
        embassy_phone: info.embassy_phone ?? '',
        blood_type: info.blood_type ?? '',
        allergies: info.allergies ?? '',
        medications: info.medications ?? '',
        medical_notes: info.medical_notes ?? '',
      });
    }
  }, [info]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveInfo(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet
      open={true}
      onClose={onClose}
      title="Notfallinformationen"
      footer={
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? 'Speichert…' : saved ? 'Gespeichert!' : 'Speichern'}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Diese Informationen sind privat und nur für dich sichtbar. Bitte prüfe und aktualisiere sie regelmäßig. Die allgemeine europäische Notrufnummer ist <strong>112</strong>.
          </p>
        </div>

        {/* Emergency contact */}
        <Section icon={<User size={16} />} title="Notfallkontakt">
          <FormField label="Name" value={form.emergency_contact_name} onChange={(v) => update('emergency_contact_name', v)} placeholder="z. B. Maria Mustermann" />
          <FormField label="Telefon" value={form.emergency_contact_phone} onChange={(v) => update('emergency_contact_phone', v)} placeholder="z. B. +49 170 1234567" type="tel" />
        </Section>

        {/* Insurance */}
        <Section icon={<Shield size={16} />} title="Versicherung">
          <FormField label="Versicherung" value={form.insurance_name} onChange={(v) => update('insurance_name', v)} placeholder="z. B. Allianz Reiseversicherung" />
          <FormField label="Telefon" value={form.insurance_phone} onChange={(v) => update('insurance_phone', v)} placeholder="Hotline der Versicherung" type="tel" />
        </Section>

        {/* Embassy */}
        <Section icon={<Phone size={16} />} title="Botschaft / Konsulat">
          <FormField label="Botschaft" value={form.embassy_name} onChange={(v) => update('embassy_name', v)} placeholder="z. B. Deutsche Botschaft Windhoek" />
          <FormField label="Telefon" value={form.embassy_phone} onChange={(v) => update('embassy_phone', v)} placeholder="Telefonnummer der Botschaft" type="tel" />
        </Section>

        {/* Medical */}
        <Section icon={<Heart size={16} />} title="Medizinische Informationen">
          <FormField label="Blutgruppe" value={form.blood_type} onChange={(v) => update('blood_type', v)} placeholder="z. B. A+" />
          <FormField label="Allergien" value={form.allergies} onChange={(v) => update('allergies', v)} placeholder="z. B. Penicillin, Erdnüsse" />
          <FormField label="Medikamente" value={form.medications} onChange={(v) => update('medications', v)} placeholder="Regelmäßige Medikation" />
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Medizinische Notizen</span>
            <textarea
              value={form.medical_notes}
              onChange={(e) => update('medical_notes', e.target.value)}
              rows={3}
              placeholder="z. B. chronische Erkrankungen, Impfungen…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
            />
          </div>
        </Section>
      </div>
    </Sheet>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
      />
    </label>
  );
}
