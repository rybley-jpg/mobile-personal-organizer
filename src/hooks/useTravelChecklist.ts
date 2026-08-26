import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TravelChecklistItem } from '@/types';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_ITEMS = [
  'Personalausweis',
  'Reisepass',
  'Visum',
  'Medikamentenplan',
  'Arztadressen',
  'Kreditkarte',
  'Impfbuch',
  'Führerschein',
  'Reiseversicherung',
];

export function useTravelChecklist(tripId: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<TravelChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!tripId || !user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('travel_checklists')
      .select('*')
      .eq('trip_id', tripId)
      .order('sort_index', { ascending: true });

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }, [tripId, user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(
    async (label: string) => {
      if (!tripId || !label.trim()) return;
      const sortIndex = items.length;
      const { data, error } = await supabase
        .from('travel_checklists')
        .insert({
          trip_id: tripId,
          label: label.trim(),
          checked: false,
          is_custom: true,
          sort_index: sortIndex,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      if (data) setItems((prev) => [...prev, data]);
    },
    [tripId, items.length],
  );

  const toggleItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      const { error } = await supabase
        .from('travel_checklists')
        .update({ checked: !item.checked })
        .eq('id', id);

      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
    },
    [items],
  );

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('travel_checklists').delete().eq('id', id);
    if (error) throw error;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const seedDefaultItems = useCallback(async () => {
    if (!tripId) return;
    const { count, error: countError } = await supabase
      .from('travel_checklists')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    if (countError) throw countError;
    if (count && count > 0) return;

    const rows = DEFAULT_ITEMS.map((label, index) => ({
      trip_id: tripId,
      label,
      checked: false,
      is_custom: false,
      sort_index: index,
    }));

    const { data, error } = await supabase
      .from('travel_checklists')
      .insert(rows)
      .select()
      .order('sort_index', { ascending: true });

    if (error) throw error;
    if (data) setItems(data);
  }, [tripId]);

  return { items, loading, addItem, toggleItem, deleteItem, seedDefaultItems, refetch: fetchItems };
}
