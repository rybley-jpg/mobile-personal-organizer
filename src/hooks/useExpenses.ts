import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TravelExpense } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { convertToEur, loadEurRates } from '@/lib/expenseRates';

export interface ExpenseDraft {
  trip_id: string;
  label: string;
  amount: number;
  currency: string;
  expense_date: string;
  category: string | null;
  notes: string | null;
}

export function useExpenses() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<TravelExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const ratesChecked = useRef(false);

  const fetchExpenses = useCallback(async () => {
    if (!user) { setExpenses([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('travel_expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (!error && data) setExpenses(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const updateExpense = useCallback(async (id: string, patch: Partial<Omit<TravelExpense, 'id' | 'created_at'>>) => {
    const { data, error } = await supabase.from('travel_expenses').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    if (data) setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
    return data;
  }, []);

  const addExpense = useCallback(async (draft: ExpenseDraft) => {
    const rates = draft.currency === 'EUR' ? null : await loadEurRates();
    const conversion = convertToEur(draft.amount, draft.currency, rates);
    const { data, error } = await supabase
      .from('travel_expenses')
      .insert({
        ...draft,
        amount_eur: conversion.amountEur,
        exchange_rate: conversion.exchangeRate,
        rate_date: conversion.rateDate,
        rate_status: conversion.status,
      })
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) setExpenses((prev) => [data, ...prev]);
    return data;
  }, []);

  const refreshMissingRates = useCallback(async () => {
    const pending = expenses.filter((e) => e.currency !== 'EUR' && e.rate_status !== 'ok');
    if (pending.length === 0) return;
    const rates = await loadEurRates();
    if (!rates) return;
    for (const e of pending) {
      const conversion = convertToEur(e.amount, e.currency, rates);
      if (conversion.status === 'missing' || conversion.status === e.rate_status) continue;
      await updateExpense(e.id, {
        amount_eur: conversion.amountEur,
        exchange_rate: conversion.exchangeRate,
        rate_date: conversion.rateDate,
        rate_status: conversion.status,
      });
    }
  }, [expenses, updateExpense]);

  useEffect(() => {
    if (loading || ratesChecked.current) return;
    ratesChecked.current = true;
    refreshMissingRates().catch(() => undefined);
  }, [loading, refreshMissingRates]);

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from('travel_expenses').delete().eq('id', id);
    if (error) throw error;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenses, loading, addExpense, deleteExpense };
}
