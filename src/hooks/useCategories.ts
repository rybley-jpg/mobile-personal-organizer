import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types';
import { useAuth } from '@/context/AuthContext';

const DEFAULT_CATEGORIES = [
  { name: 'Privat', color: '#64748b', icon: 'home' },
  { name: 'Arbeit', color: '#2563eb', icon: 'briefcase' },
  { name: 'Familie', color: '#ec4899', icon: 'heart' },
  { name: 'Reise', color: '#0ea5e9', icon: 'plane' },
  { name: 'Telefon', color: '#f59e0b', icon: 'phone' },
  { name: 'Finanzen', color: '#10b981', icon: 'wallet' },
  { name: 'Termine', color: '#06b6d4', icon: 'calendar' },
  { name: 'Einkaufen', color: '#f97316', icon: 'shopping-cart' },
  { name: 'Wichtig', color: '#ef4444', icon: 'alert-triangle' },
];

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else if (!data || data.length === 0) {
      // Seed default categories for new users
      const inserts = DEFAULT_CATEGORIES.map((c) => ({ ...c, is_default: true }));
      const { data: seeded, error: seedError } = await supabase
        .from('categories')
        .insert(inserts)
        .select();
      if (seedError) {
        setError(seedError.message);
      } else if (seeded) {
        setCategories(seeded);
        setError(null);
      }
    } else {
      setCategories(data);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(async (name: string, color: string, icon: string) => {
    const { data, error: insertError } = await supabase
      .from('categories')
      .insert({ name, color, icon })
      .select()
      .maybeSingle();

    if (insertError) throw insertError;
    if (data) setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('categories').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { categories, loading, error, addCategory, deleteCategory, refetch: fetchCategories };
}
