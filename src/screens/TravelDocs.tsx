import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, FileText, Plane, Hotel, Car, Package, FolderOpen, Camera, Upload, Shield, Lock, Eye, Fingerprint } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { supabase } from '@/lib/supabase';
import { Sheet } from '@/components/ui/Sheet';
import { DocLock } from '@/components/DocLock';
import { WalletDocument } from '@/types';
import { formatDateShort } from '@/lib/dateUtils';
import { useAuth } from '@/context/AuthContext';
import { isDocPinSet } from '@/lib/docSecurity';
import { Filesystem, Directory } from '@capacitor/filesystem';

const DOC_TYPE_ICON: Record<string, typeof FileText> = {
  'flugticket': Plane,
  'hotelbestaetigung': Hotel,
  'mietwagen': Car,
  'versicherung': FileText,
  'sonstiges': Package,
};

export function TravelDocs() {
  const { tripsApi } = useOrganizer();
  const { trips } = tripsApi;
  const { user } = useAuth();
  const [documents, setDocuments] = useState<WalletDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [filterTrip, setFilterTrip] = useState<string | null>(null);
  const [locked, setLocked] = useState(isDocPinSet());

  const fetchDocuments = useCallback(async () => {
    if (!user) { setDocuments([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('wallet_documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setDocuments(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const filtered = useMemo(() => {
    if (!filterTrip) return documents;
    return documents.filter((d) => d.trip_id === filterTrip);
  }, [documents, filterTrip]);

  const addDocument = async (data: { label: string; doc_type: string; trip_id: string; file_name: string; file_path: string }) => {
    const { data: inserted, error } = await supabase
      .from('wallet_documents')
      .insert({ ...data, file_type: null, file_size: null })
      .select()
      .maybeSingle();
    if (error) throw error;
    if (inserted) setDocuments((prev) => [inserted, ...prev]);
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from('wallet_documents').delete().eq('id', id);
    if (error) throw error;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const pinActive = isDocPinSet();

  return (
    <div className="px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reisemappe</h1>
        <button
          onClick={() => setAddOpen(true)}
          disabled={locked && pinActive}
          className="h-10 px-4 rounded-full bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
        >
          <Plus size={18} /> Dokument
        </button>
      </header>

      <div className="mb-4">
        <DocLock locked={locked} onUnlocked={() => setLocked(false)} onLock={() => setLocked(true)} />
      </div>

      {locked && pinActive ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
          <Lock size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Entsperre die Reisemappe oben, um deine Dokumente zu sehen und hinzuzufügen.</p>
        </div>
      ) : (
        <>
          {trips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 mb-4">
              <button
                onClick={() => setFilterTrip(null)}
                className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium ${!filterTrip ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
              >
                Alle
              </button>
              {trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilterTrip(t.id)}
                  className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium ${filterTrip === t.id ? 'bg-primary-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="text-center text-sm text-slate-400 py-8">Lädt…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
              <FolderOpen size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Noch keine Dokumente hinterlegt.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Scanne oder fotografiere Dokumente, oder hinterlege Buchungsnummern.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  tripName={trips.find((t) => t.id === doc.trip_id)?.name}
                  onDelete={() => deleteDocument(doc.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {addOpen && (
        <AddDocSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          trips={trips}
          onSave={async (data) => { await addDocument(data); setAddOpen(false); }}
        />
      )}
    </div>
  );
}

function DocRow({ doc, tripName, onDelete }: { doc: WalletDocument; tripName?: string; onDelete: () => void }) {
  const Icon = DOC_TYPE_ICON[doc.doc_type] ?? FileText;
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPreview() {
      if (!doc.file_path) return;
      try {
        const result = await Filesystem.readFile({ path: doc.file_path, directory: Directory.Data });
        if (!cancelled && typeof result.data === 'string' && doc.file_type?.startsWith('image/')) {
          setImagePreview(`data:${doc.file_type};base64,${result.data}`);
        }
      } catch {
        // file not found or read error
      }
    }
    loadPreview();
    return () => { cancelled = true; };
  }, [doc.file_path, doc.file_type]);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5">
      {imagePreview ? (
        <img src={imagePreview} alt={doc.label} className="w-10 h-10 rounded-xl object-cover shrink-0" />
      ) : (
        <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
          <Icon size={20} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{doc.label}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{formatDateShort(doc.created_at.slice(0, 10))}</span>
          {tripName && <span className="truncate">· {tripName}</span>}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
        aria-label="Löschen"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

const DOC_TYPES = [
  { value: 'flugticket', label: 'Flugticket' },
  { value: 'hotelbestaetigung', label: 'Hotelbestätigung' },
  { value: 'mietwagen', label: 'Mietwagenbuchung' },
  { value: 'versicherung', label: 'Versicherung' },
  { value: 'sonstiges', label: 'Sonstiges' },
];

function AddDocSheet({ open, onClose, trips, onSave }: {
  open: boolean;
  onClose: () => void;
  trips: { id: string; name: string }[];
  onSave: (data: { label: string; doc_type: string; trip_id: string; file_name: string; file_path: string }) => Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [docType, setDocType] = useState('sonstiges');
  const [tripId, setTripId] = useState(trips[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<{ data: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `wallet-docs/${tripId}/${fileName}`;
        try {
          await Filesystem.writeFile({
            path: filePath,
            data: base64Data,
            directory: Directory.Data,
            recursive: true,
          });
          setCapturedImage({ data: base64Data, name: file.name, type: file.type });
          if (!label) setLabel(file.name.replace(/\.[^.]+$/, ''));
        } catch {
          setError('Datei konnte nicht gespeichert werden.');
        }
      };
      reader.onerror = () => setError('Datei konnte nicht gelesen werden.');
      reader.readAsDataURL(file);
    } catch {
      setError('Ein Fehler ist aufgetreten.');
    }
    if (isCamera && cameraInputRef.current) cameraInputRef.current.value = '';
    if (!isCamera && fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!label.trim() || !tripId) return;
    setSaving(true);
    setError(null);
    try {
      let filePath = '';
      let fileName = note.trim() || 'manuell';

      if (capturedImage) {
        const storedName = `${Date.now()}-${capturedImage.name}`;
        filePath = `wallet-docs/${tripId}/${storedName}`;
        await Filesystem.writeFile({
          path: filePath,
          data: capturedImage.data,
          directory: Directory.Data,
          recursive: true,
        });
        fileName = capturedImage.name;
      }

      await onSave({
        label: label.trim(),
        doc_type: capturedImage ? 'sonstiges' : docType,
        trip_id: tripId,
        file_name: fileName,
        file_path: filePath,
      });
      setLabel(''); setDocType('sonstiges'); setNote(''); setCapturedImage(null);
    } catch {
      setError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Dokument hinzufügen"
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm">Abbrechen</button>
          <button onClick={handleSave} disabled={!label.trim() || !tripId || saving} className="flex-1 h-11 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Scanne oder fotografiere ein Dokument mit der Kamera, lade eine Datei hoch, oder hinterlege nur eine Buchungsnummer oder Notiz.
        </p>

        {capturedImage && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
            <img src={`data:${capturedImage.type};base64,${capturedImage.data}`} alt="Vorschau" className="w-full max-h-48 object-cover" />
            <button
              onClick={() => setCapturedImage(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="Entfernen"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Camera size={18} className="text-primary-500" /> Scannen
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Upload size={18} className="text-primary-500" /> Datei
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileSelect(e, true)}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => handleFileSelect(e, false)}
            className="hidden"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Bezeichnung</span>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Flugticket Frankfurt–Windhoek" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" autoFocus />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Dokumenttyp</span>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500">
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Reise</span>
          <select value={tripId} onChange={(e) => setTripId(e.target.value)} className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500">
            {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Buchungsnummer / Notiz (optional)</span>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. ABC123XY" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" />
        </label>
      </div>
    </Sheet>
  );
}
