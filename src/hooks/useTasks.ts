import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Task } from '@/types';
import { useAuth } from '@/context/AuthContext';

export type TaskInput = Omit<Task, 'id' | 'created_at' | 'updated_at'>;

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTasks(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async (input: Partial<TaskInput> & { title: string }) => {
    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert(input)
      .select()
      .maybeSingle();

    if (insertError) throw insertError;
    if (data) setTasks((prev) => [...prev, data]);
    return data;
  }, []);

  const updateTask = useCallback(async (id: string, patch: Partial<TaskInput>) => {
    const { data, error: updateError } = await supabase
      .from('tasks')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;
    if (data) setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTaskStatus = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const nextStatus = task.status === 'offen' ? 'erledigt' : 'offen';
      await updateTask(id, { status: nextStatus });
    },
    [tasks, updateTask]
  );

  return { tasks, loading, error, addTask, updateTask, deleteTask, toggleTaskStatus, refetch: fetchTasks };
}
