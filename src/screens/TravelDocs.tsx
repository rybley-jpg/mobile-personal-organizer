import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, FileText, Plane, Hotel, Car, Package, FolderOpen, Camera, Upload, Shield, Lock, Eye, Fingerprint, MapPin, Loader2, Image as ImageIcon } from 'lucide-react';
import { useOrganizer } from '@/context/OrganizerContext';
import { supabase } from '@/lib/supabase';
import { Sheet } from '@/components/ui/Sheet';
import { DocLock } from '@/components/DocLock';
import { WalletDocument, LocationPhoto } from '@/types';
import { formatDateShort } from '@/lib/dateUtils';
import { useAuth } from '@/context/AuthContext';
import { isDocPinSet } from '@/lib/docSecurity';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useLocationPhotos } from '@/hooks/useLocationPhotos';

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
  const { photos: locationPhotos, addPhoto, deletePhoto } = useLocationPhotos();
  const [gpsPhotoOpen, setGpsPhotoOpen] = useState(false);

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
        <button
          onClick={() => setGpsPhotoOpen(true)}
          className="w-full h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-sky-500 text-white text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-primary-600/20"
        >
          <MapPin size={18} /> Ortsfoto speichern
        </button>
      </div>

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

          {locationPhotos.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ortsfotos</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {locationPhotos.map((photo) => (
                  <GpsPhotoCard
                    key={photo.id}
                    photo={photo}
                    tripName={trips.find((t) => t.id === photo.trip_id)?.name}
                    onDelete={() => deletePhoto(photo.id)}
                  />
                ))}
              </div>
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

      {gpsPhotoOpen && (
        <GpsPhotoSheet
          open={gpsPhotoOpen}
          onClose={() => setGpsPhotoOpen(false)}
          trips={trips}
          onSave={async (data) => { await addPhoto(data); setGpsPhotoOpen(false); }}
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

function GpsPhotoCard({ photo, tripName, onDelete }: {
  photo: LocationPhoto;
  tripName?: string;
  onDelete: () => void;
}) {
  const [imageData, setImageData] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadImage() {
      if (!photo.file_path) return;
      try {
        const result = await Filesystem.readFile({ path: photo.file_path, directory: Directory.Data });
        if (!cancelled && typeof result.data === 'string') {
          const mimeType = photo.file_type || 'image/jpeg';
          setImageData(`data:${mimeType};base64,${result.data}`);
        }
      } catch {
        // file not found
      }
    }
    loadImage();
    return () => { cancelled = true; };
  }, [photo.file_path, photo.file_type]);

  const locationText = [photo.city_name, photo.country_name].filter(Boolean).join(', ');

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 group">
      <div className="aspect-square">
        {imageData ? (
          <img src={imageData} alt={photo.label ?? photo.city_name ?? 'Ortsfoto'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            <ImageIcon size={28} className="text-slate-300 dark:text-slate-600" />
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <div className="flex items-center gap-1 text-white text-xs font-medium">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{locationText || 'Unbekannter Ort'}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-white/70 text-[10px]">{formatDateShort(photo.created_at.slice(0, 10))}</span>
          {tripName && <span className="text-white/70 text-[10px] truncate ml-1">{tripName}</span>}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Löschen"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function GpsPhotoSheet({ open, onClose, trips, onSave }: {
  open: boolean;
  onClose: () => void;
  trips: { id: string; name: string }[];
  onSave: (data: {
    trip_id: string | null;
    label: string | null;
    city_name: string | null;
    country_name: string | null;
    latitude: number;
    longitude: number;
    file_path: string;
    file_name: string;
    file_type: string | null;
  }) => Promise<void>;
}) {
  const [label, setLabel] = useState('');
  const [tripId, setTripId] = useState(trips[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'found' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoInfo, setGeoInfo] = useState<{ city: string | null; country: string | null } | null>(null);
  const [capturedImage, setCapturedImage] = useState<{ data: string; name: string; type: string } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const requestGps = useCallback(async () => {
    if (!navigator.geolocation) {
      setGpsState('error');
      setError('GPS wird auf diesem Gerät nicht unterstützt.');
      return;
    }
    setGpsState('locating');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        setGpsState('found');
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const res = await fetch(
            `${supabaseUrl}/functions/v1/reverse-geocode?lat=${latitude}&lon=${longitude}`,
            { headers: { Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' } },
          );
          if (!res.ok) throw new Error('Geocoding failed');
          const data = await res.json();
          setGeoInfo({ city: data.city ?? null, country: data.country ?? null });
          if (!label) {
            const locText = [data.city, data.country].filter(Boolean).join(', ');
            setLabel(locText || 'Ortsfoto');
          }
        } catch {
          setGeoInfo({ city: null, country: null });
          if (!label) setLabel('Ortsfoto');
        }
      },
      (err) => {
        setGpsState('error');
        if (err.code === err.PERMISSION_DENIED) {
          setError('Standortzugriff verweigert. Bitte erlaube den GPS-Zugriff in den Einstellungen.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Standort konnte nicht ermittelt werden.');
        } else if (err.code === err.TIMEOUT) {
          setError('Standortermittlung hat zu lange gedauert. Versuche es erneut.');
        } else {
          setError('Standort konnte nicht abgerufen werden.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [label]);

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        setCapturedImage({ data: base64Data, name: file.name, type: file.type });
      };
      reader.onerror = () => setError('Foto konnte nicht gelesen werden.');
      reader.readAsDataURL(file);
    } catch {
      setError('Ein Fehler ist aufgetreten.');
    }
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!capturedImage || !coords) return;
    setSaving(true);
    setError(null);
    try {
      const fileName = `${Date.now()}-${capturedImage.name}`;
      const filePath = `location-photos/${tripId || 'no-trip'}/${fileName}`;
      await Filesystem.writeFile({
        path: filePath,
        data: capturedImage.data,
        directory: Directory.Data,
        recursive: true,
      });

      await onSave({
        trip_id: tripId || null,
        label: label.trim() || null,
        city_name: geoInfo?.city ?? null,
        country_name: geoInfo?.country ?? null,
        latitude: coords.lat,
        longitude: coords.lon,
        file_path: filePath,
        file_name: capturedImage.name,
        file_type: capturedImage.type,
      });
      setLabel(''); setCapturedImage(null); setCoords(null); setGeoInfo(null); setGpsState('idle');
    } catch {
      setError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-950 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[calc(80px+env(safe-area-inset-bottom))]">
      <div className="w-full md:max-w-2xl lg:max-w-3xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-95 transition-transform shrink-0"
            aria-label="Zurück"
          >
            <Plus size={20} className="rotate-45" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate flex-1">Ortsfoto speichern</h1>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {gpsState === 'idle' && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
              <MapPin size={32} className="mx-auto text-primary-500 mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Standort ermitteln</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Bestimme deinen aktuellen Standort per GPS, um das Foto mit Stadt und Land zu verknüpfen.</p>
              <button
                onClick={requestGps}
                className="h-11 px-5 rounded-full bg-primary-600 text-white text-sm font-medium active:scale-95 transition-transform inline-flex items-center gap-2"
              >
                <MapPin size={16} /> Standort ermitteln
              </button>
            </div>
          )}

          {gpsState === 'locating' && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
              <Loader2 size={28} className="mx-auto text-primary-500 animate-spin mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Standort wird ermittelt…</p>
            </div>
          )}

          {gpsState === 'found' && coords && (
            <>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={16} className="text-primary-500 shrink-0" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {geoInfo ? [geoInfo.city, geoInfo.country].filter(Boolean).join(', ') || 'Ort erkannt' : 'Ort wird ermittelt…'}
                  </p>
                </div>
                <p className="text-xs text-slate-400 ml-6 font-mono">
                  {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                </p>
              </div>

              {capturedImage ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                  <img src={`data:${capturedImage.type};base64,${capturedImage.data}`} alt="Vorschau" className="w-full max-h-64 object-cover" />
                  <button
                    onClick={() => setCapturedImage(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                    aria-label="Entfernen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full h-14 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Camera size={20} className="text-primary-500" /> Foto aufnehmen
                </button>
              )}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                className="hidden"
              />

              <label className="block">
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Bezeichnung</span>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="z. B. Sonnenuntergang am Brandenburger Tor"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Reise (optional)</span>
                <select
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                >
                  <option value="">Keiner Reise zugeordnet</option>
                  {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { onClose(); setLabel(''); setCapturedImage(null); setCoords(null); setGeoInfo(null); setGpsState('idle'); }}
                  className="flex-1 h-12 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={!capturedImage || !coords || saving}
                  className="flex-1 h-12 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {saving ? 'Speichert…' : 'Speichern'}
                </button>
              </div>
            </>
          )}

          {gpsState === 'error' && (
            <div className="rounded-2xl border border-dashed border-red-200 dark:border-red-900/50 p-6 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{error || 'Standort konnte nicht ermittelt werden.'}</p>
              <button
                onClick={requestGps}
                className="h-11 px-5 rounded-full bg-primary-600 text-white text-sm font-medium active:scale-95 transition-transform inline-flex items-center gap-2"
              >
                <MapPin size={16} /> Erneut versuchen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
