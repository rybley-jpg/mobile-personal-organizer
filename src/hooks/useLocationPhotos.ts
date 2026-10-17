import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LocationPhoto } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type LocationPhotoInput = Omit<LocationPhoto, 'id' | 'user_id' | 'created_at'>;

export function useLocationPhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<LocationPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPhotos = useCallback(async () => {
    if (!user) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('location_photos')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPhotos(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const addPhoto = useCallback(async (input: LocationPhotoInput) => {
    const { data, error } = await supabase
      .from('location_photos')
      .insert(input)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) setPhotos((prev) => [data, ...prev]);
    return data;
  }, []);

  const deletePhoto = useCallback(async (id: string) => {
    const { error } = await supabase.from('location_photos').delete().eq('id', id);
    if (error) throw error;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    photos,
    loading,
    addPhoto,
    deletePhoto,
    refetch: fetchPhotos,
  };
}
