import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trip, TripSegment } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type TripInput = Omit<Trip, 'id' | 'created_at' | 'updated_at'>;
export type TripSegmentInput = Omit<TripSegment, 'id' | 'created_at'>;

export function useTrips() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [segments, setSegments] = useState<TripSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      setSegments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [tripsRes, segmentsRes] = await Promise.all([
      supabase.from('trips').select('*').order('created_at', { ascending: true }),
      supabase.from('trip_segments').select('*').order('order_index', { ascending: true }),
    ]);

    if (tripsRes.error) {
      setError(tripsRes.error.message);
    } else if (segmentsRes.error) {
      setError(segmentsRes.error.message);
    } else {
      setTrips(tripsRes.data ?? []);
      setSegments(segmentsRes.data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const addTrip = useCallback(async (input: Partial<TripInput> & { name: string }) => {
    const { data, error: insertError } = await supabase.from('trips').insert(input).select().maybeSingle();
    if (insertError) throw insertError;
    if (data) setTrips((prev) => [...prev, data]);
    return data;
  }, []);

  const updateTrip = useCallback(async (id: string, patch: Partial<TripInput>) => {
    const { data, error: updateError } = await supabase
      .from('trips')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    if (data) setTrips((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  }, []);

  const deleteTrip = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('trips').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setSegments((prev) => prev.filter((s) => s.trip_id !== id));
  }, []);

  const addSegment = useCallback(async (input: Partial<TripSegmentInput> & { trip_id: string; segment_type: string; order_index: number }) => {
    const { data, error: insertError } = await supabase.from('trip_segments').insert(input).select().maybeSingle();
    if (insertError) throw insertError;
    if (data) setSegments((prev) => [...prev, data]);
    return data;
  }, []);

  const updateSegment = useCallback(async (id: string, patch: Partial<TripSegmentInput>) => {
    const { data, error: updateError } = await supabase
      .from('trip_segments')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    if (data) setSegments((prev) => prev.map((s) => (s.id === id ? data : s)));
    return data;
  }, []);

  const deleteSegment = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('trip_segments').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    trips,
    segments,
    loading,
    error,
    addTrip,
    updateTrip,
    deleteTrip,
    addSegment,
    updateSegment,
    deleteSegment,
    refetch: fetchTrips,
  };
}
