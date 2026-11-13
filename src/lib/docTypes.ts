import { Plane, Hotel, Car, Train, Shield, Package, IdCard, Stamp, Syringe, Heart, type LucideIcon } from 'lucide-react';
import type { WalletDocument } from '@/types';
import { todayISO } from '@/lib/dateUtils';

export interface DocTypeDef {
  value: string;
  label: string;
}

export interface DocSectionDef {
  id: string;
  title: string;
  types: DocTypeDef[];
}

export const DOC_SECTIONS: DocSectionDef[] = [
  {
    id: 'ausweise',
    title: 'Ausweise und Papiere',
    types: [
      { value: 'reisepass', label: 'Reisepass' },
      { value: 'personalausweis', label: 'Personalausweis' },
      { value: 'fuehrerschein', label: 'Führerschein' },
      { value: 'internationaler_fuehrerschein', label: 'Internationaler Führerschein' },
      { value: 'visum', label: 'Visum' },
      { value: 'impfnachweis', label: 'Impfnachweis' },
    ],
  },
  {
    id: 'buchungen',
    title: 'Buchungen',
    types: [
      { value: 'flugticket', label: 'Flugticket' },
      { value: 'hotelbestaetigung', label: 'Hotelbestätigung' },
      { value: 'mietwagen', label: 'Mietwagenbuchung' },
      { value: 'bahnticket', label: 'Bahnticket' },
    ],
  },
  {
    id: 'versicherungen',
    title: 'Versicherungen',
    types: [
      { value: 'auslandskrankenversicherung', label: 'Auslandskrankenversicherung' },
      { value: 'reiseversicherung', label: 'Reiseversicherung' },
      { value: 'versicherung', label: 'Versicherung (allgemein)' },
    ],
  },
  {
    id: 'weitere',
    title: 'Weitere Dokumente',
    types: [{ value: 'sonstiges', label: 'Sonstiges' }],
  },
];

export const DOC_TYPES: DocTypeDef[] = DOC_SECTIONS.flatMap((section) => section.types);

export const DOC_TYPE_LABEL: Record<string, string> = Object.fromEntries(DOC_TYPES.map((t) => [t.value, t.label]));

export const DOC_TYPE_ICON: Record<string, LucideIcon> = {
  reisepass: Stamp,
  personalausweis: IdCard,
  fuehrerschein: Car,
  internationaler_fuehrerschein: Car,
  visum: Stamp,
  impfnachweis: Syringe,
  flugticket: Plane,
  hotelbestaetigung: Hotel,
  mietwagen: Car,
  bahnticket: Train,
  auslandskrankenversicherung: Heart,
  reiseversicherung: Shield,
  versicherung: Shield,
  sonstiges: Package,
};

export const MANDATORY_DOC_TYPES = [
  { value: 'reisepass', label: 'Reisepass' },
  { value: 'personalausweis', label: 'Personalausweis' },
  { value: 'fuehrerschein', label: 'Führerschein' },
  { value: 'auslandskrankenversicherung', label: 'Auslandskrankenversicherung' },
] as const;

export type DocStatus = 'vorhanden' | 'bald' | 'abgelaufen';

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const [ty, tm, td] = todayISO().split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / DAY_MS);
}

export function docStatus(doc: Pick<WalletDocument, 'doc_type' | 'expires_on'>): DocStatus {
  if (!doc.expires_on) return 'vorhanden';
  const days = daysUntil(doc.expires_on);
  if (days < 0) return 'abgelaufen';
  const warnDays = doc.doc_type === 'reisepass' ? 180 : 90;
  return days <= warnDays ? 'bald' : 'vorhanden';
}

export const DOC_STATUS_BADGE: Record<DocStatus, { label: string; className: string }> = {
  vorhanden: { label: 'Vorhanden', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  bald: { label: 'Läuft bald ab', className: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' },
  abgelaufen: { label: 'Abgelaufen', className: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
};
