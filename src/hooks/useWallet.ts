import { useCallback, useEffect, useState } from 'react';
import { Filesystem } from '@capacitor/filesystem';
import { supabase } from '@/lib/supabase';
import { WalletDocument } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type WalletDocumentInput = {
  label: string;
  doc_type: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
};

export function useWallet(tripId: string | null) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<WalletDocument[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!tripId || !user) {
      setDocuments([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('wallet_documents')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setDocuments(data);
    }
    setLoading(false);
  }, [tripId, user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const addDocument = useCallback(
    async (input: WalletDocumentInput) => {
      if (!tripId) return null;
      const { data, error } = await supabase
        .from('wallet_documents')
        .insert({ ...input, trip_id: tripId })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) setDocuments((prev) => [...prev, data]);
      return data;
    },
    [tripId],
  );

  const deleteDocument = useCallback(async (id: string) => {
    const doc = (await supabase.from('wallet_documents').select('*').eq('id', id).maybeSingle())
      .data as WalletDocument | null;

    if (doc?.file_path) {
      try {
        await Filesystem.deleteFile({ path: doc.file_path });
      } catch {
        // File may already be gone; continue to DB deletion.
      }
    }

    const { error } = await supabase.from('wallet_documents').delete().eq('id', id);
    if (error) throw error;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { documents, loading, addDocument, deleteDocument, refetch: fetchDocuments };
}
