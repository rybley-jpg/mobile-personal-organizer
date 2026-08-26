import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TaskChecklistItem } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useChecklist(taskId: string | null) {
  const { user } = useAuth();
  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!taskId || !user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('task_checklist')
      .select('*')
      .eq('task_id', taskId)
      .order('order_index', { ascending: true });

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  }, [taskId, user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (text: string) => {
    if (!taskId || !text.trim()) return;
    const orderIndex = items.length;
    const { data, error } = await supabase
      .from('task_checklist')
      .insert({ task_id: taskId, text: text.trim(), order_index: orderIndex })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (data) setItems((prev) => [...prev, data]);
    return data;
  }, [taskId, items.length]);

  const toggleItem = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const { error } = await supabase
      .from('task_checklist')
      .update({ checked: !item.checked })
      .eq('id', id);

    if (error) throw error;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  }, [items]);

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from('task_checklist').delete().eq('id', id);
    if (error) throw error;
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateText = useCallback(async (id: string, text: string) => {
    const { error } = await supabase
      .from('task_checklist')
      .update({ text })
      .eq('id', id);
    if (error) throw error;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, text } : i)));
  }, []);

  return { items, loading, addItem, toggleItem, deleteItem, updateText, refetch: fetchItems };
}
