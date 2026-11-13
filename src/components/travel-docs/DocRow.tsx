import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import type { WalletDocument } from '@/types';
import { formatDateShort } from '@/lib/dateUtils';
import { DOC_TYPE_ICON, DOC_TYPE_LABEL, DOC_STATUS_BADGE, docStatus } from '@/lib/docTypes';
import { readDocBase64 } from '@/lib/docFiles';

interface DocRowProps {
  doc: WalletDocument;
  tripName?: string;
}

export function DocRow({ doc, tripName }: DocRowProps) {
  const Icon = DOC_TYPE_ICON[doc.doc_type] ?? FileText;
  const status = docStatus(doc);
  const badge = DOC_STATUS_BADGE[status];
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!doc.file_path || !doc.file_type?.startsWith('image/')) return;
    readDocBase64(doc.file_path).then((data) => {
      if (!cancelled && data) setPreview(`data:${doc.file_type};base64,${data}`);
    });
    return () => { cancelled = true; };
  }, [doc.file_path, doc.file_type]);

  const meta = [
    DOC_TYPE_LABEL[doc.doc_type],
    doc.doc_number,
    doc.expires_on ? `gültig bis ${formatDateShort(doc.expires_on)}` : null,
    tripName,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5">
      {preview ? (
        <img src={preview} alt={doc.label} className="w-10 h-10 rounded-xl object-cover shrink-0" />
      ) : (
        <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{doc.label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{meta.join(' · ')}</p>
      </div>
      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
        {badge.label}
      </span>
    </div>
  );
}
