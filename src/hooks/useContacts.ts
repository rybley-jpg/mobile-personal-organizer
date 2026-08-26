import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Contact } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type ContactInput = Omit<Contact, 'id' | 'created_at' | 'updated_at'>;

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase.from('contacts').select('*').order('name', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setContacts(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = useCallback(async (input: Partial<ContactInput> & { name: string }) => {
    const { data, error: insertError } = await supabase.from('contacts').insert(input).select().maybeSingle();
    if (insertError) throw insertError;
    if (data) setContacts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  }, []);

  const updateContact = useCallback(async (id: string, patch: Partial<ContactInput>) => {
    const { data, error: updateError } = await supabase
      .from('contacts')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    if (data) setContacts((prev) => prev.map((c) => (c.id === id ? data : c)).sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('contacts').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { contacts, loading, error, addContact, updateContact, deleteContact, refetch: fetchContacts };
}
