import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, FolderOpen, Lock, AlertTriangle, ChevronRight } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { DocLock } from '@/components/DocLock';
import { RemovableItem } from '@/components/RemovableItem';
import { AddDocSheet, type DocInput } from '@/components/travel-docs/AddDocSheet';
import { DocRow } from '@/components/travel-docs/DocRow';
import { MissingDocsCard } from '@/components/travel-docs/MissingDocsCard';
import { EmergencyInfoScreen } from '@/screens/EmergencyInfo';
import { isDocPinSet } from '@/lib/docSecurity';
import { DOC_SECTIONS } from '@/lib/docTypes';
import { removeDocFile } from '@/lib/docFiles';
import type { WalletDocument } from '@/types';

const FALLBACK_SECTION = 'weitere';

function sectionIdFor(docType: string): string {
  return DOC_SECTIONS.find((s) => s.types.some((t) => t.value === docType))?.id ?? FALLBACK_SECTION;
}

export function TravelDocs() {
  const { tripsApi } = useOrganizer();
  const { trips } = tripsApi;
  const { user } = useAuth();
  const [documents, setDocuments] = useState<WalletDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<string | undefined>(undefined);
  const [filterTrip, setFilterTrip] = useState<string | null>(null);
  const [locked, setLocked] = useState(isDocPinSet());
  const [emergencyOpen, setEmergencyOpen] = useState(false);

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

  const sections = useMemo(
    () => DOC_SECTIONS.map((section) => ({
      ...section,
      docs: filtered.filter((d) => sectionIdFor(d.doc_type) === section.id),
    })),
    [filtered],
  );

  const addDocument = async (data: DocInput) => {
    const { data: inserted, error } = await supabase
      .from('wallet_documents')
      .insert(data)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (inserted) setDocuments((prev) => [inserted, ...prev]);
  };

  const deleteDocument = async (doc: WalletDocument) => {
    setActionError(null);
    const { error } = await supabase.from('wallet_documents').delete().eq('id', doc.id);
    if (error) {
      setActionError('Dokument konnte nicht gelöscht werden. Bitte versuche es erneut.');
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    if (doc.file_path) await removeDocFile(doc.file_path);
  };

  const openAdd = (docType?: string) => {
    setAddType(docType);
    setAddOpen(true);
  };

  const pinActive = isDocPinSet();
  const hidden = locked && pinActive;

  return (
    <div className="px-4 pt-6 pb-[calc(96px+env(safe-area-inset-bottom))] md:px-8 md:max-w-5xl md:mx-auto">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reisemappe</h1>
        <button
          onClick={() => openAdd()}
          disabled={hidden}
          className="h-10 px-4 rounded-full bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
        >
          <Plus size={18} /> Dokument
        </button>
      </header>

      <div className="mb-4">
        <DocLock locked={locked} onUnlocked={() => setLocked(false)} onLock={() => setLocked(true)} />
      </div>

      {hidden ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
          <Lock size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Entsperre die Reisemappe oben, um deine Dokumente zu sehen und hinzuzufügen.</p>
        </div>
      ) : (
        <>
          {!loading && <MissingDocsCard documents={documents} onAdd={openAdd} />}

          <button
            onClick={() => setEmergencyOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-4 mb-6 text-left active:scale-[0.99] transition-transform"
          >
            <span className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">Notfallinformationen</span>
              <span className="block text-xs text-slate-600 dark:text-slate-300">Notfallkontakte und medizinische Infos</span>
            </span>
            <ChevronRight size={18} className="text-slate-400 shrink-0" />
          </button>

          {trips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 mb-6">
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

          {actionError && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{actionError}</p>}

          {loading ? (
            <div className="text-center text-sm text-slate-400 py-8">Lädt…</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {sections
                .filter((section) => section.id !== FALLBACK_SECTION || section.docs.length > 0)
                .map((section) => (
                  <section key={section.id}>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{section.title}</h2>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">{section.docs.length}</span>
                    </div>
                    {section.docs.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-5 text-center">
                        <FolderOpen size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                        <p className="text-xs text-slate-400 dark:text-slate-500">Noch keine Dokumente in diesem Bereich.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {section.docs.map((doc) => (
                          <RemovableItem key={doc.id} label={doc.label} onDelete={() => { void deleteDocument(doc); }}>
                            <DocRow doc={doc} tripName={trips.find((t) => t.id === doc.trip_id)?.name} />
                          </RemovableItem>
                        ))}
                      </div>
                    )}
                  </section>
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
          initialType={addType}
          onSave={async (data) => { await addDocument(data); setAddOpen(false); }}
        />
      )}

      {emergencyOpen && !hidden && <EmergencyInfoScreen onClose={() => setEmergencyOpen(false)} />}
    </div>
  );
}
