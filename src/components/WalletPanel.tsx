import { useRef, useState } from 'react';
import { FileText, Image, File, Trash2, Plus, Shield, Upload } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { WalletLock } from '@/components/WalletLock';
import { isWalletPinSet } from '@/lib/walletSecurity';

const DOC_TYPES = [
  { value: 'reisepass', label: 'Reisepass' },
  { value: 'personalausweis', label: 'Personalausweis' },
  { value: 'visa', label: 'Visa' },
  { value: 'versicherung', label: 'Versicherungsunterlagen' },
  { value: 'impfung', label: 'Impfunterlagen' },
  { value: 'arzt', label: 'Arztinformationen' },
  { value: 'medikamente', label: 'Medikamentenplan' },
  { value: 'buchung', label: 'Buchungsunterlagen' },
  { value: 'sonstiges', label: 'Sonstige Dokumente' },
];

function getDocIcon(type: string) {
  if (type === 'image' || type.startsWith('image/')) return <Image size={18} />;
  if (type === 'application/pdf' || type === 'pdf') return <File size={18} />;
  return <FileText size={18} />;
}

export function WalletPanel({ tripId }: { tripId: string }) {
  const { documents, addDocument, deleteDocument, loading } = useWallet(tripId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState('sonstiges');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [walletLocked, setWalletLocked] = useState(isWalletPinSet());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const fileName = `${Date.now()}-${file.name}`;
          const filePath = `wallet/${tripId}/${fileName}`;

          await Filesystem.writeFile({
            path: filePath,
            data: base64Data,
            directory: Directory.Data,
            recursive: true,
          });

          const docType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : selectedType;

          await addDocument({
            label: DOC_TYPES.find((t) => t.value === selectedType)?.label ?? 'Dokument',
            doc_type: docType,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
          });
          setUploading(false);
        } catch (err) {
          setError('Datei konnte nicht gespeichert werden.');
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setError('Datei konnte nicht gelesen werden.');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Ein Fehler ist aufgetreten.');
      setUploading(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
    } catch {
      setError('Dokument konnte nicht gelöscht werden.');
    }
  };

  return (
    <div className="space-y-3">
      <WalletLock locked={walletLocked} onUnlocked={() => setWalletLocked(false)} onLock={() => setWalletLocked(true)} />

      {walletLocked ? (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center">
          <Shield size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Entsperre das Wallet oben, um deine Dokumente zu sehen.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reise-Wallet</h3>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
            <Shield size={11} /> Dokumente werden ausschließlich lokal auf deinem Gerät gespeichert.
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">Lädt…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
              Noch keine Dokumente. Füge Reisepass, Versicherungsnachweise oder andere wichtige Dokumente hinzu.
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-800 p-3"
                >
                  <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                    {getDocIcon(doc.doc_type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{doc.label}</p>
                    <p className="text-xs text-slate-400 truncate">{doc.file_name}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="shrink-0 p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
            >
              {DOC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-10 rounded-xl bg-primary-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                'Speichert…'
              ) : (
                <>
                  <Upload size={15} /> Dokument hinzufügen
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
