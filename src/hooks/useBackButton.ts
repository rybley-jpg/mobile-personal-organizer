import { useEffect, useRef } from 'react';

interface OverlayEntry {
  depth: number;
}

function readDepth(state: unknown): number {
  const depth = (state as { overlayDepth?: unknown } | null)?.overlayDepth;
  return typeof depth === 'number' ? depth : 0;
}

export function useBackButton(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const entryRef = useRef<OverlayEntry | null>(null);
  const pendingBackRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    if (pendingBackRef.current !== null) {
      window.clearTimeout(pendingBackRef.current);
      pendingBackRef.current = null;
    }

    if (!entryRef.current) {
      const depth = readDepth(window.history.state) + 1;
      window.history.pushState({ overlayDepth: depth }, '');
      entryRef.current = { depth };
    }
    const { depth } = entryRef.current;

    const handlePop = (event: PopStateEvent) => {
      if (readDepth(event.state) >= depth) return;
      entryRef.current = null;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePop);
    return () => {
      window.removeEventListener('popstate', handlePop);
      if (!entryRef.current) return;
      pendingBackRef.current = window.setTimeout(() => {
        pendingBackRef.current = null;
        if (!entryRef.current) return;
        entryRef.current = null;
        window.history.back();
      }, 0);
    };
  }, [open]);
}
