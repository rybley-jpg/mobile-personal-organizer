import { useRef, useState } from 'react';
import { Camera, Upload, ScanLine, QrCode, Trash2, FileText, Loader2 } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { DOC_SECTIONS } from '@/lib/docTypes';
import { isNativeScanAvailable, scanDocumentNative, scanQrCodeNative, SCAN_CANCELLED } from '@/lib/documentScanner';
import { storeDocFromBase64, storeDocFromUri, removeDocFile } from '@/lib/docFiles';

export interface DocInput {
  label: string;
  doc_type: string;
  trip_id: string | null;
  doc_number: string | null;
  expires_on: string | null;
  notes: string | null;
  file_name: string;
  file_path: string;
  file_type: string | null;
}

interface StoredFile {
  path: string;
  name: string;
  mime: string;
  previewBase64: string | null;
}

interface AddDocSheetProps {
  open: boolean;
  onClose: () => void;
  trips: { id: string; name: string }[];
  initialType?: string;
  onSave: (data: DocInput) => Promise<void>;
}

const INPUT_CLASS = 'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500';
const LABEL_CLASS = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5';
const ACTION_CLASS = 'h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50';

export function AddDocSheet({ open, onClose, trips, initialType, onSave }: AddDocSheetProps) {
  const [label, setLabel] = useState('');
  const [docType, setDocType] = useState(initialType ?? 'sonstiges');
  const [tripId, setTripId] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<StoredFile | null>(null);
  const [busy, setBusy] = useState<'scan' | 'qr' | 'file' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrFilled, setQrFilled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const native = isNativeScanAvailable();

  const handleCancel = () => {
    if (file) void removeDocFile(file.path);
    onClose();
  };

  const attachBrowserFile = (picked: File) => {
    setError(null);
    setBusy('file');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const path = await storeDocFromBase64(base64, picked.name);
        if (file) void removeDocFile(file.path);
        setFile({ path, name: picked.name, mime: picked.type, previewBase64: picked.type.startsWith('image/') ? base64 : null });
        if (!label.trim()) setLabel(picked.name.replace(/\.[^.]+$/, ''));
      } catch {
        setError('Datei konnte nicht gespeichert werden.');
      } finally {
        setBusy(null);
      }
    };
    reader.onerror = () => {
      setError('Datei konnte nicht gelesen werden.');
      setBusy(null);
    };
    reader.readAsDataURL(picked);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (picked) attachBrowserFile(picked);
  };

  const handleScan = async () => {
    if (!native) {
      cameraInputRef.current?.click();
      return;
    }
    setError(null);
    setBusy('scan');
    const scanned = await scanDocumentNative();
    if (!scanned.ok) {
      if (scanned.error !== SCAN_CANCELLED) setError(scanned.error);
      setBusy(null);
      return;
    }
    try {
      const path = await storeDocFromUri(scanned.data.uri, scanned.data.name);
      if (file) void removeDocFile(file.path);
      setFile({ path, name: scanned.data.name, mime: scanned.data.mime, previewBase64: null });
      if (!label.trim()) setLabel('Gescanntes Dokument');
    } catch {
      setError('Scan konnte nicht gespeichert werden.');
    } finally {
      setBusy(null);
    }
  };

  const handleQr = async () => {
    setError(null);
    if (!native) {
      setError('QR-Codes lesen ist nur in der Handy-App verfügbar.');
      return;
    }
    setBusy('qr');
    const result = await scanQrCodeNative();
    setBusy(null);
    if (!result.ok) {
      if (result.error !== SCAN_CANCELLED) setError(result.error);
      return;
    }
    setDocNumber(result.data);
    setQrFilled(true);
  };

  const handleSave = async () => {
    if (!label.trim()) return;
    setBusy('save');
    setError(null);
    try {
      await onSave({
        label: label.trim(),
        doc_type: docType,
        trip_id: tripId || null,
        doc_number: docNumber.trim() || null,
        expires_on: expiresOn || null,
        notes: notes.trim() || null,
        file_name: file?.name ?? (docNumber.trim() || notes.trim() || 'manuell'),
        file_path: file?.path ?? '',
        file_type: file?.mime ?? null,
      });
      setLabel(''); setDocNumber(''); setExpiresOn(''); setNotes(''); setTripId(''); setFile(null); setQrFilled(false);
    } catch {
      setError('Speichern fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setBusy(null);
    }
  };

  const isVersicherung = docType === 'auslandskrankenversicherung' || docType === 'reiseversicherung';

  return (
    <Sheet
      open={open}
      onClose={handleCancel}
      title="Dokument hinzufügen"
      footer={
        <div className="flex gap-2">
          <button onClick={handleCancel} className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button onClick={handleSave} disabled={!label.trim() || busy !== null} className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50">
            {busy === 'save' ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {file && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
            {file.previewBase64 ? (
              <img src={`data:${file.mime};base64,${file.previewBase64}`} alt="Vorschau" className="w-full max-h-48 object-cover" />
            ) : (
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/60">
                <FileText size={22} className="text-primary-500 shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
              </div>
            )}
            <button
              onClick={() => { void removeDocFile(file.path); setFile(null); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="Datei entfernen"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button onClick={handleScan} disabled={busy !== null} className={ACTION_CLASS}>
            {busy === 'scan' ? <Loader2 size={18} className="animate-spin text-primary-500" /> : <ScanLine size={18} className="text-primary-500" />}
            <span className="text-xs sm:text-sm">Dokument scannen</span>
          </button>
          <button onClick={handleQr} disabled={busy !== null} className={ACTION_CLASS}>
            {busy === 'qr' ? <Loader2 size={18} className="animate-spin text-primary-500" /> : <QrCode size={18} className="text-primary-500" />}
            <span className="text-xs sm:text-sm">QR-Code lesen</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={busy !== null} className={ACTION_CLASS}>
            <Upload size={18} className="text-primary-500" />
            <span className="text-xs sm:text-sm">Datei</span>
          </button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileInput} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileInput} className="hidden" />
        </div>
        {!native && (
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Camera size={14} /> Im Browser öffnet „Dokument scannen“ die Kamera oder den Dateiwähler.
          </p>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <label className="block">
          <span className={LABEL_CLASS}>Bezeichnung</span>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Reisepass Max" className={INPUT_CLASS} autoFocus />
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Dokumenttyp</span>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className={INPUT_CLASS}>
            {DOC_SECTIONS.map((section) => (
              <optgroup key={section.id} label={section.title}>
                {section.types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={LABEL_CLASS}>Nummer (optional)</span>
            <input type="text" value={docNumber} onChange={(e) => { setDocNumber(e.target.value); setQrFilled(false); }} placeholder="z. B. C01X00T47" className={INPUT_CLASS} />
            {qrFilled && <span className="block text-[11px] text-primary-600 dark:text-primary-400 mt-1">Aus QR-Code übernommen. Bitte prüfen.</span>}
          </label>
          <label className="block">
            <span className={LABEL_CLASS}>Gültig bis (optional)</span>
            <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={INPUT_CLASS} />
          </label>
        </div>
        <label className="block">
          <span className={LABEL_CLASS}>Reise (optional)</span>
          <select value={tripId} onChange={(e) => setTripId(e.target.value)} className={INPUT_CLASS}>
            <option value="">Keiner Reise zugeordnet</option>
            {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={LABEL_CLASS}>Notiz (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={isVersicherung ? 'Notrufnummer, z. B. +49 30 1234567' : 'Zusätzliche Hinweise'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 resize-none"
          />
        </label>
      </div>
    </Sheet>
  );
}
