import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function useTaskCategories(taskId: string | null) {
  const { user } = useAuth();
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const fetchCategories = useCallback(async () => {
    if (!taskId || !user) {
      setCategoryIds([]);
      return;
    }
    const { data, error } = await supabase
      .from('task_categories')
      .select('category_id')
      .eq('task_id', taskId);

    if (!error && data) {
      setCategoryIds(data.map((r: { category_id: string }) => r.category_id));
    }
  }, [taskId, user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const setCategories = useCallback(async (taskId: string, catIds: string[]) => {
    // Remove all existing, then insert new ones
    await supabase.from('task_categories').delete().eq('task_id', taskId);
    if (catIds.length > 0) {
      const rows = catIds.map((category_id) => ({ task_id: taskId, category_id }));
      await supabase.from('task_categories').insert(rows);
    }
    setCategoryIds(catIds);
  }, []);

  return { categoryIds, setCategories, refetch: fetchCategories };
}
