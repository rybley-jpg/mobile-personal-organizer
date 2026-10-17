import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { JournalEntry } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type JournalInput = Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>;

export function useJournal(tripId?: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    let query = supabase.from('journal_entries').select('*').order('entry_date', { ascending: false });
    if (tripId) query = query.eq('trip_id', tripId);
    const { data, error } = await query;
    if (!error && data) setEntries(data);
    setLoading(false);
  }, [user, tripId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const addEntry = useCallback(async (input: Partial<JournalInput> & { entry_date: string }) => {
    const { data, error } = await supabase.from('journal_entries').insert(input).select().maybeSingle();
    if (error) throw error;
    if (data) setEntries((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateEntry = useCallback(async (id: string, patch: Partial<JournalInput>) => {
    const { data, error } = await supabase.from('journal_entries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (data) setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id);
    if (error) throw error;
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { entries, loading, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
}
