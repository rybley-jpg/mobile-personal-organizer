import { useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Minus } from 'lucide-react';
import { ConfirmDialog, shouldSkipDeleteConfirm } from '@/components/ConfirmDialog';

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;

export function useDeleteRequest(label: string, onDelete: () => void) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestDelete = () => {
    if (shouldSkipDeleteConfirm()) {
      onDelete();
      return;
    }
    setConfirmOpen(true);
  };

  const confirmDialog = (
    <ConfirmDialog
      open={confirmOpen}
      title={`${label} löschen?`}
      message={`"${label}" wird endgültig entfernt.`}
      onConfirm={() => {
        setConfirmOpen(false);
        onDelete();
      }}
      onCancel={() => setConfirmOpen(false)}
    />
  );

  return { requestDelete, confirmDialog };
}

interface RemovableItemProps {
  children: ReactNode;
  onDelete: () => void;
  label: string;
}

export function RemovableItem({ children, onDelete, label }: RemovableItemProps) {
  const { requestDelete, confirmDialog } = useDeleteRequest(label, onDelete);
  const timerRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    originRef.current = { x: e.clientX, y: e.clientY };
    suppressClickRef.current = false;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      suppressClickRef.current = true;
      navigator.vibrate?.(25);
      requestDelete();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = originRef.current;
    if (!origin || timerRef.current === null) return;
    if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > MOVE_TOLERANCE_PX) clearTimer();
  };

  const handleClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <>
    <div
      className="relative select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onPointerLeave={clearTimer}
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={handleClickCapture}
    >
      <button
        type="button"
        onClick={requestDelete}
        aria-label={`${label} entfernen`}
        className="absolute -left-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-md ring-2 ring-white transition-transform active:scale-90 dark:ring-slate-900"
      >
        <Minus size={14} strokeWidth={3} />
      </button>
      {children}
    </div>
    {confirmDialog}
    </>
  );
}
