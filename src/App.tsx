import { useState, useEffect, useMemo } from 'react';
import { Home, CheckSquare, Plane, Users, LayoutGrid, Plus } from 'lucide-react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { OrganizerProvider, useOrganizer } from '@/context/OrganizerContext';
import { Login } from '@/screens/Login';
import { Dashboard } from '@/screens/Dashboard';
import { Tasks } from '@/screens/Tasks';
import { Trips } from '@/screens/Trips';
import { Contacts } from '@/screens/Contacts';
import { More } from '@/screens/More';
import { Search } from '@/screens/Search';
import { TaskEditor } from '@/components/TaskEditor';

type Tab = 'heute' | 'aufgaben' | 'reisen' | 'kontakte' | 'mehr';

const TABS: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'heute', label: 'Heute', icon: Home },
  { key: 'aufgaben', label: 'Aufgaben', icon: CheckSquare },
  { key: 'reisen', label: 'Reisen', icon: Plane },
  { key: 'kontakte', label: 'Kontakte', icon: Users },
  { key: 'mehr', label: 'Mehr', icon: LayoutGrid },
];

function AppShell() {
  const { user, loading } = useAuth();
  const { bgEnabled } = useTheme();
  const { tripsApi } = useOrganizer();
  const [tab, setTab] = useState<Tab>('heute');
  const [searchOpen, setSearchOpen] = useState(false);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const nextTripDestination = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = tripsApi.trips.find((t) => t.destination);
    return upcoming?.destination ?? null;
  }, [tripsApi.trips]);

  useEffect(() => {
    const checkOverlay = () => {
      const overlays = document.querySelectorAll('[role="dialog"]');
      setSheetOpen(overlays.length > 0);
    };
    checkOverlay();
    const observer = new MutationObserver(checkOverlay);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-3xl bg-primary-600 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const fabVisible = !searchOpen && !sheetOpen && (tab === 'heute' || tab === 'aufgaben');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full mx-auto relative">
      {bgEnabled && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center">
          <CountrySilhouette destination={nextTripDestination} />
        </div>
      )}
      <main className="min-h-screen w-full md:max-w-2xl md:mx-auto lg:max-w-3xl pt-[env(safe-area-inset-top)] pb-[calc(80px+env(safe-area-inset-bottom))] relative z-10">
        {tab === 'heute' && <Dashboard onNavigate={(t) => setTab(t as Tab)} />}
        {tab === 'aufgaben' && <Tasks onOpenSearch={() => setSearchOpen(true)} />}
        {tab === 'reisen' && <Trips />}
        {tab === 'kontakte' && <Contacts onOpenSearch={() => setSearchOpen(true)} />}
        {tab === 'mehr' && <More />}
      </main>

      {fabVisible && (
        <button
          onClick={() => setTaskEditorOpen(true)}
          className="fixed left-1/2 -translate-x-1/2 z-20 w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl shadow-primary-600/40 flex items-center justify-center active:scale-90 transition-all duration-200 bottom-[calc(80px+env(safe-area-inset-bottom))]"
          aria-label="Neue Aufgabe"
        >
          <Plus size={24} />
        </button>
      )}

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-2xl lg:max-w-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 z-30">
        <div className="grid grid-cols-5 px-2 pt-1.5 pb-[env(safe-area-inset-bottom)]">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex flex-col items-center gap-0.5 py-1.5 relative"
              >
                <Icon
                  size={22}
                  className={active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className={`text-[10px] font-medium ${active ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {searchOpen && <Search onClose={() => setSearchOpen(false)} onNavigate={(t) => setTab(t as Tab)} />}
      <TaskEditor open={taskEditorOpen} onClose={() => setTaskEditorOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrganizerProvider>
          <AppShell />
        </OrganizerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function CountrySilhouette({ destination }: { destination: string | null }) {
  const label = destination ?? 'Deutschland';
  return (
    <div className="flex flex-col items-center opacity-[0.06] dark:opacity-[0.04]">
      <svg viewBox="0 0 200 200" className="w-[80vw] max-w-[500px] h-auto">
        <path
          d="M100 20 C130 20, 160 35, 170 60 C180 85, 175 120, 165 140 C155 160, 130 180, 100 180 C70 180, 45 160, 35 140 C25 120, 20 85, 30 60 C40 35, 70 20, 100 20 Z"
          fill="currentColor"
          className="text-primary-600"
        />
      </svg>
      <p className="text-7xl font-bold text-primary-600 mt-4 tracking-tight">{label}</p>
    </div>
  );
}
