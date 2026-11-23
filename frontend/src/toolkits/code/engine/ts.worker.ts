import { check, compile, hover, prepare, type File } from './compile';

// TypeScript is heavy: it lives in its own worker, loaded on first use.
const actions = { check, compile, hover };

export type Actions = typeof actions;

self.onmessage = async (e: MessageEvent<{ id: number; action: keyof Actions; args: unknown[] }>) => {
  const { id, action, args } = e.data;
  try {
    await prepare(args[0] as File[]);
    self.postMessage({ id, result: (actions[action] as (...a: unknown[]) => unknown)(...args) });
  } catch (err) {
    self.postMessage({ id, error: String((err as Error)?.message ?? err) });
  }
};
