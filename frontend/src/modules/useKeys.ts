import { useEffect, useRef } from 'react';

// Keyboard shortcuts for activities (digits, Enter, Space). Ignored while
// typing in a field so typed answers stay possible.
export function useKeys(handler: (e: KeyboardEvent) => boolean | void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) && e.key !== 'Enter') return;
      if (ref.current(e)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
