import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import type { WalletDocument } from '@/types';
import { formatDateShort } from '@/lib/dateUtils';
import { MANDATORY_DOC_TYPES, docStatus, daysUntil } from '@/lib/docTypes';

interface MissingDocsCardProps {
  documents: WalletDocument[];
  onAdd: (docType: string) => void;
}

export function MissingDocsCard({ documents, onAdd }: MissingDocsCardProps) {
  const missing = MANDATORY_DOC_TYPES.filter((m) => !documents.some((d) => d.doc_type === m.value));
  const attention = documents
    .filter((d) => docStatus(d) !== 'vorhanden')
    .sort((a, b) => (a.expires_on ?? '').localeCompare(b.expires_on ?? ''));
  const allGood = missing.length === 0 && attention.length === 0;

  return (
    <section className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-6">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Was fehlt</h2>

      {allGood ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={18} className="shrink-0" /> Alle Pflichtdokumente sind hinterlegt und gültig.
        </p>
      ) : (
        <ul className="space-y-1">
          {missing.map((m) => (
            <li key={m.value}>
              <button
                onClick={() => onAdd(m.value)}
                className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 min-w-0">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 shrink-0">
                  fehlt noch <ChevronRight size={14} />
                </span>
              </button>
            </li>
          ))}
          {attention.map((d) => {
            const expired = docStatus(d) === 'abgelaufen';
            const days = d.expires_on ? daysUntil(d.expires_on) : 0;
            return (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 min-w-0">
                  <AlertTriangle size={16} className={`${expired ? 'text-red-500' : 'text-amber-500'} shrink-0`} />
                  <span className="truncate">{d.label}</span>
                </span>
                <span className={`text-xs font-medium shrink-0 ${expired ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>
                  {expired
                    ? `abgelaufen am ${formatDateShort(d.expires_on ?? '')}`
                    : `läuft in ${days} ${days === 1 ? 'Tag' : 'Tagen'} ab`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
