import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TravelExpense } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type ExpenseInput = Omit<TravelExpense, 'id' | 'created_at'>;

export function useExpenses(tripId?: string) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<TravelExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (!user) { setExpenses([]); setLoading(false); return; }
    let query = supabase.from('travel_expenses').select('*').order('expense_date', { ascending: false });
    if (tripId) query = query.eq('trip_id', tripId);
    const { data, error } = await query;
    if (!error && data) setExpenses(data);
    setLoading(false);
  }, [user, tripId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const addExpense = useCallback(async (input: Partial<ExpenseInput> & { label: string; amount: number; expense_date: string }) => {
    const { data, error } = await supabase.from('travel_expenses').insert(input).select().maybeSingle();
    if (error) throw error;
    if (data) setExpenses((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateExpense = useCallback(async (id: string, patch: Partial<ExpenseInput>) => {
    const { data, error } = await supabase.from('travel_expenses').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (data) setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('travel_expenses').delete().eq('id', id);
    if (error) throw error;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenses, loading, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses };
}
