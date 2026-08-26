import { Priority, ReminderOffset, Task } from '@/types';

const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function combineDateTime(dateISO: string | null, time: string | null): Date | null {
  if (!dateISO) return null;
  const date = parseISODate(dateISO);
  if (time) {
    const [h, min] = time.split(':').map(Number);
    date.setHours(h, min, 0, 0);
  } else {
    date.setHours(23, 59, 0, 0);
  }
  return date;
}

export function isOverdue(task: Task): boolean {
  if (task.status === 'erledigt' || !task.due_date) return false;
  const due = combineDateTime(task.due_date, task.due_time);
  if (!due) return false;
  return due.getTime() < Date.now();
}

export function isDueToday(task: Task): boolean {
  return task.due_date === todayISO();
}

export function formatDateLong(iso: string): string {
  const date = parseISODate(iso);
  return `${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDateShort(iso: string): string {
  const date = parseISODate(iso);
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

export function formatWeekdayDate(iso: string): string {
  const date = parseISODate(iso);
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`;
}

export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatRelativeDate(iso: string): string {
  const today = todayISO();
  const diffDays = Math.round(
    (parseISODate(iso).getTime() - parseISODate(today).getTime()) / 86400000
  );
  if (diffDays === 0) return 'Heute';
  if (diffDays === 1) return 'Morgen';
  if (diffDays === -1) return 'Gestern';
  if (diffDays > 1 && diffDays < 7) return formatWeekdayDate(iso);
  return formatDateShort(iso);
}

const PRIORITY_WEIGHT: Record<Priority, number> = { hoch: 0, normal: 1, niedrig: 2 };

export const PRIORITY_COLORS: Record<Priority, string> = {
  niedrig: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  normal: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
  hoch: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    const aTime = a.due_date ? combineDateTime(a.due_date, a.due_time)!.getTime() : Infinity;
    const bTime = b.due_date ? combineDateTime(b.due_date, b.due_time)!.getTime() : Infinity;
    if (aTime !== bTime) return aTime - bTime;

    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });
}

export function computeReminderAt(task: Task): Date | null {
  if (task.reminder_offset === 'none' || !task.due_date) return null;
  const due = combineDateTime(task.due_date, task.due_time);
  if (!due) return null;

  const offsetMinutes: Record<ReminderOffset, number> = {
    none: 0,
    at_time: 0,
    '15m': 15,
    '1h': 60,
    '2h': 120,
    '1d': 60 * 24,
    '3d': 60 * 24 * 3,
    '7d': 60 * 24 * 7,
  };

  return new Date(due.getTime() - offsetMinutes[task.reminder_offset] * 60000);
}

export function formatReminderCountdown(remindAt: Date): string {
  const diffMs = remindAt.getTime() - Date.now();
  if (diffMs <= 0) return 'Jetzt';
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `In ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `In ${hours} Std.`;
  const days = Math.round(hours / 24);
  return `In ${days} Tag${days === 1 ? '' : 'en'}`;
}
