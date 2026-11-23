import type { Actions } from './ts.worker';

// Calls to the TypeScript worker, as promises.
let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, { resolve(v: unknown): void; reject(e: Error): void }>();

function failAll(message: string) {
  for (const w of waiting.values()) w.reject(new Error(message));
  waiting.clear();
  worker?.terminate();
  worker = null;
}

function start(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./ts.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
    const w = waiting.get(e.data.id);
    waiting.delete(e.data.id);
    if (e.data.error !== undefined) w?.reject(new Error(e.data.error));
    else w?.resolve(e.data.result);
  };
  worker.onerror = () => failAll('TypeScript n’a pas pu se charger');
  return worker;
}

export function callTs<K extends keyof Actions>(action: K, ...args: Parameters<Actions[K]>): Promise<ReturnType<Actions[K]>> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { resolve: resolve as (v: unknown) => void, reject });
    start().postMessage({ id, action, args });
  });
}
