import { createContext, ReactNode, useContext } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useTasks } from '@/hooks/useTasks';
import { useTrips } from '@/hooks/useTrips';
import { useContacts } from '@/hooks/useContacts';

interface OrganizerData {
  categoriesApi: ReturnType<typeof useCategories>;
  tasksApi: ReturnType<typeof useTasks>;
  tripsApi: ReturnType<typeof useTrips>;
  contactsApi: ReturnType<typeof useContacts>;
}

const OrganizerContext = createContext<OrganizerData | null>(null);

export function OrganizerProvider({ children }: { children: ReactNode }) {
  const categoriesApi = useCategories();
  const tasksApi = useTasks();
  const tripsApi = useTrips();
  const contactsApi = useContacts();

  return (
    <OrganizerContext.Provider value={{ categoriesApi, tasksApi, tripsApi, contactsApi }}>
      {children}
    </OrganizerContext.Provider>
  );
}

export function useOrganizer() {
  const ctx = useContext(OrganizerContext);
  if (!ctx) throw new Error('useOrganizer must be used within OrganizerProvider');
  return ctx;
}
