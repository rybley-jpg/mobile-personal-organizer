import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PacklistItem } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type PacklistInput = Omit<PacklistItem, 'id' | 'created_at'>;

export function usePacklist(tripId?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<PacklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    let query = supabase.from('packlist_items').select('*').order('sort_index', { ascending: true });
    if (tripId) query = query.eq('trip_id', tripId);
    const { data, error } = await query;
    if (!error && data) setItems(data);
    setLoading(false);
  }, [user, tripId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = useCallback(async (input: Partial<PacklistInput> & { label: string }) => {
    const { data, error } = await supabase.from('packlist_items').insert(input).select().maybeSingle();
    if (error) throw error;
    if (data) setItems((prev) => [...prev, data]);
    return data;
  }, []);

  const updateItem = useCallback(async (id: string, patch: Partial<PacklistInput>) => {
    const { data, error } = await supabase.from('packlist_items').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (data) setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
    return data;
  }, []);

  const toggleItem = useCallback(async (id: string, checked: boolean) => {
    await updateItem(id, { checked: !checked });
  }, [updateItem]);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('packlist_items').delete().eq('id', id);
    if (error) throw error;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, addItem, updateItem, toggleItem, deleteItem, refetch: fetchItems };
}
