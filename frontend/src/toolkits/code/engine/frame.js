// Frame side of the harness (web exercises): no network, storage in memory.
const __post = parent.postMessage.bind(parent);
const __harness = __createHarness((m) => __post(m, '*'));
for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'WebTransport', 'EventSource', 'indexedDB', 'caches', 'BroadcastChannel', 'Worker', 'SharedWorker', 'open']) {
  for (let o = window; o; o = Object.getPrototypeOf(o)) {
    try { delete o[name]; } catch { /* not configurable */ }
  }
}
class __Storage {
  #items = new Map();
  get length() { return this.#items.size; }
  key(i) { return [...this.#items.keys()][i] ?? null; }
  getItem(k) { return this.#items.get(String(k)) ?? null; }
  setItem(k, v) { this.#items.set(String(k), String(v)); }
  removeItem(k) { this.#items.delete(String(k)); }
  clear() { this.#items.clear(); }
}
Object.defineProperty(window, 'localStorage', { value: new __Storage(), configurable: true });
Object.defineProperty(window, 'sessionStorage', { value: new __Storage(), configurable: true });
Object.assign(window, __harness.globals, __createDomTools(window.__externals || {}));
window.fetch = () => Promise.reject(new TypeError('Pas de réseau dans le bac à sable'));
addEventListener('unhandledrejection', (e) => { e.preventDefault(); __harness.fail(e.reason, 'promise'); });
addEventListener('error', (e) => { e.preventDefault(); __harness.fail(e.error || new Error(e.message), 'event'); });
// A link or form must not leave the page.
addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) e.preventDefault(); });
// Not while testing: a test may check that the student does it.
if (!__testing) addEventListener('submit', (e) => e.preventDefault());
