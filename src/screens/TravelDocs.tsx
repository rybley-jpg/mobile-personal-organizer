import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Trash2, FileText, Plane, Hotel, Car, Package, FolderOpen } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { supabase } from '@/lib/supabase';
import { Sheet } from '@/components/ui/Sheet';
import { WalletDocument } from '@/types';
import { formatDateShort } from '@/lib/dateUtils';
import { useAuth } from '@/context/AuthContext';

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

  return (
    <div className="px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reisemappe</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="h-10 px-4 rounded-full bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <Plus size={18} /> Dokument
        </button>
      </header>

      {/* Trip filter */}
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
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Buchungsbestätigungen, Tickets und mehr.</p>
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
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5">
      <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </span>
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
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim() || !tripId) return;
    setSaving(true);
    try {
      await onSave({
        label: label.trim(),
        doc_type: docType,
        trip_id: tripId,
        file_name: fileName.trim() || 'manuell',
        file_path: '',
      });
      setLabel(''); setDocType('sonstiges'); setFileName('');
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
          Hinterlege hier wichtige Reisedokumente wie Buchungsnummern, Bestätigungen oder Tickets. Du kannst auch nur die Buchungsnummer oder einen Link notieren – ein Datei-Upload ist nicht erforderlich.
        </p>
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
          <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="z. B. ABC123XY" className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500" />
        </label>
      </div>
    </Sheet>
  );
}
