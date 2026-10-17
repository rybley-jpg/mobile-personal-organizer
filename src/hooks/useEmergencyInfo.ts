import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EmergencyInfo } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type EmergencyInput = Omit<EmergencyInfo, 'id' | 'updated_at'>;

export function useEmergencyInfo() {
  const { user } = useAuth();
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    if (!user) { setInfo(null); setLoading(false); return; }
    const { data, error } = await supabase
      .from('emergency_info')
      .select('*')
      .maybeSingle();
    if (!error && data) setInfo(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const saveInfo = useCallback(async (input: Partial<EmergencyInput>) => {
    if (info) {
      const { data, error } = await supabase
        .from('emergency_info')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', info.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (data) setInfo(data);
      return data;
    } else {
      const { data, error } = await supabase
        .from('emergency_info')
        .insert(input)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (data) setInfo(data);
      return data;
    }
  }, [info]);

  return { info, loading, saveInfo, refetch: fetchInfo };
}
