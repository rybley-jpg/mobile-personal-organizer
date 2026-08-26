import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

const SKIP_KEY = 'klarly_skip_delete_confirm';

export function shouldSkipDeleteConfirm(): boolean {
  try {
    return localStorage.getItem(SKIP_KEY) === 'true';
  } catch {
    return false;
  }
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Löschen',
  cancelLabel = 'Abbrechen',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [skipFuture, setSkipFuture] = useState(false);

  useEffect(() => {
    if (open) setSkipFuture(false);
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (skipFuture) {
      try { localStorage.setItem(SKIP_KEY, 'true'); } catch { /* noop */ }
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-5 animate-slide-up">
        <div className="flex items-start gap-3 mb-4">
          <span className="shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>
          </div>
        </div>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={skipFuture}
            onChange={(e) => setSkipFuture(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">Nicht mehr nachfragen</span>
        </label>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 h-11 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
