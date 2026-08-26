import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FlightNotification } from '@/types';
import { useAuth } from '@/context/AuthContext';

export function useFlightNotifications(segmentId: string | null) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<FlightNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!segmentId || !user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('flight_notifications')
      .select('*')
      .eq('segment_id', segmentId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  }, [segmentId, user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!segmentId) return;
    const { error } = await supabase
      .from('flight_notifications')
      .update({ is_read: true })
      .eq('segment_id', segmentId)
      .eq('is_read', false);

    if (error) throw error;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [segmentId]);

  const deleteNotification = useCallback(async (id: string) => {
    const { error } = await supabase.from('flight_notifications').delete().eq('id', id);
    if (error) throw error;
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAllRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
