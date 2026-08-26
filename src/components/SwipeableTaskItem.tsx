import { useRef, useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { TaskItem } from '@/components/TaskItem';

interface SwipeableTaskItemProps {
  task: Task;
  showTrip?: boolean;
  onToggle?: (id: string) => void;
  onClick?: (task: Task) => void;
  onSwipeDelete?: (task: Task) => void;
}

export function SwipeableTaskItem({
  task,
  showTrip,
  onToggle,
  onClick,
  onSwipeDelete,
}: SwipeableTaskItemProps) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const DELETE_THRESHOLD = 80;

  useEffect(() => {
    if (!dragging) {
      if (Math.abs(dragX) >= DELETE_THRESHOLD) {
        setConfirming(true);
        setDragX(0);
      } else {
        setDragX(0);
      }
    }
  }, [dragging, dragX]);

  const handleStart = (clientX: number) => {
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!dragging) return;
    currentXRef.current = clientX;
    const delta = clientX - startXRef.current;
    if (delta < 0) {
      setDragX(Math.max(delta, -120));
    } else {
      setDragX(0);
    }
  };

  const handleEnd = () => {
    setDragging(false);
  };

  return (
    <>
      <div ref={containerRef} className="relative overflow-hidden rounded-2xl">
        {/* Delete background */}
        <div className="absolute inset-0 bg-red-500 flex items-center justify-end px-4 rounded-2xl">
          <Trash2 size={20} className="text-white" />
        </div>

        {/* Swipeable content */}
        <div
          style={{
            transform: `translateX(${dragX}px)`,
            transition: dragging ? 'none' : 'transform 0.3s ease',
          }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
          className="relative bg-transparent"
        >
          <TaskItem
            task={task}
            showTrip={showTrip}
            onToggle={onToggle}
            onClick={onClick}
          />
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={() => setConfirming(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-5 animate-slide-up">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Aufgabe löschen?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">"{task.title}" wird endgültig entfernt.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onSwipeDelete?.(task);
                }}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
