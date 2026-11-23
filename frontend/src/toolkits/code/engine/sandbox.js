// Worker side of the harness: no network, no storage, then the harness globals.
const __post = self.postMessage.bind(self);
const __harness = __createHarness((m) => __post(m));
for (const name of ['postMessage', 'fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'importScripts', 'indexedDB', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker', 'close', 'onmessage', 'name', 'location', 'navigator', 'origin']) {
  for (let o = self; o; o = Object.getPrototypeOf(o)) {
    try { delete o[name]; } catch { /* not configurable */ }
  }
}
Object.assign(self, __harness.globals);
self.fetch = () => Promise.reject(new TypeError('Pas de réseau dans le bac à sable'));
self.addEventListener('unhandledrejection', (e) => { e.preventDefault(); __harness.fail(e.reason, 'promise'); });
