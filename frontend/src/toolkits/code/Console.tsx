import { useEffect, useRef } from 'react';
import type { LogLine } from './engine/run';

const colors = { log: 'text-neutral-100', warn: 'text-amber-300', error: 'text-red-400' };

// What the program printed.
export function Console({ logs, empty, className = '' }: { logs: LogLine[]; empty?: string; className?: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = end.current?.parentElement;
    if (box) box.scrollTop = box.scrollHeight;
  }, [logs]);
  return (
    <div role="log" className={`overflow-auto bg-neutral-900 px-4 py-3 font-mono text-[13px] leading-relaxed ${className}`}>
      {logs.length === 0 && empty && <div className="text-neutral-500">{empty}</div>}
      {logs.map((l, i) => (
        <div key={i} className={`flex gap-3 whitespace-pre-wrap break-words ${colors[l.level]}`}>
          <span className="min-w-0 flex-1">{l.text || ' '}</span>
          {l.test !== null && logs[i - 1]?.test !== l.test && <span className="shrink-0 text-xs text-neutral-500">test {l.test + 1}</span>}
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}
