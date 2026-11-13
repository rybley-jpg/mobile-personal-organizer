import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ExpenseCategory } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useExpenseCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) { setCategories([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('expense_categories')
      .select('id, name, created_at')
      .order('name', { ascending: true });
    if (!error && data) setCategories(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const addCategory = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({ name })
      .select('id, name, created_at')
      .maybeSingle();
    if (error) {
      if (error.code === '23505') throw new Error('Diese Kategorie gibt es schon.');
      throw new Error('Die Kategorie konnte nicht gespeichert werden.');
    }
    if (data) setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('expense_categories').delete().eq('id', id);
    if (error) throw new Error('Die Kategorie konnte nicht gelöscht werden.');
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { categories, loading, addCategory, deleteCategory };
}
