import { Check, Calendar, Clock, AlertCircle, Plane } from 'lucide-react';
import { Task } from '@/types';
import { useOrganizer } from '@/context/OrganizerContext';
import { CategoryIcon, getCategoryById } from '@/components/CategoryIcon';
import { formatRelativeDate, formatTime, isOverdue, PRIORITY_COLORS } from '@/lib/dateUtils';

interface TaskItemProps {
  task: Task;
  onToggle?: (id: string) => void;
  onClick?: (task: Task) => void;
  showCategory?: boolean;
  showTrip?: boolean;
  compact?: boolean;
}

export function TaskItem({ task, onToggle, onClick, showCategory = true, showTrip = false, compact = false }: TaskItemProps) {
  const { categoriesApi, tripsApi } = useOrganizer();
  const category = getCategoryById(categoriesApi.categories, task.category_id);
  const trip = showTrip && task.trip_id ? tripsApi.trips.find((t) => t.id === task.trip_id) : null;
  const overdue = isOverdue(task);
  const done = task.status === 'erledigt';
  const priorityColor = PRIORITY_COLORS[task.priority];

  return (
    <div
      className={`group flex items-start gap-3 rounded-2xl border p-3.5 transition-colors cursor-pointer ${
        done
          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800'
          : overdue
          ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
      }`}
      onClick={() => onClick?.(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(task.id);
        }}
        className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
          done
            ? 'bg-primary-600 border-primary-600 text-white'
            : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-primary-500'
        }`}
        aria-label={done ? 'Als offen markieren' : 'Als erledigt markieren'}
      >
        <Check size={14} strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${done ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
            {task.title}
          </p>
          {task.priority === 'hoch' && !done && (
            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${priorityColor}`}>
              Hoch
            </span>
          )}
        </div>

        {!compact && task.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {showCategory && category && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <CategoryIcon icon={category.icon} color={category.color} size={11} />
              {category.name}
            </span>
          )}
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 text-[11px] ${overdue && !done ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
              {overdue && !done ? <AlertCircle size={11} /> : <Calendar size={11} />}
              {formatRelativeDate(task.due_date)}
            </span>
          )}
          {task.due_time && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Clock size={11} />
              {formatTime(task.due_time)}
            </span>
          )}
          {trip && (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400">
              <Plane size={11} />
              {trip.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
