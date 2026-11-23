// What the tests of web exercises use to act on the page, React or not.
function __createDomTools(externals) {
  const React = externals.react;
  let roots = [];
  // React applies its updates before the test goes on.
  async function act(fn) {
    if (!React) return fn();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      let r;
      await React.act(async () => { r = await fn(); });
      return r;
    } finally {
      globalThis.IS_REACT_ACT_ENVIRONMENT = false;
    }
  }
  const find = (x) => {
    const el = typeof x === 'string' ? document.querySelector(x) : x;
    if (!el) throw new Error(`Élément introuvable : ${x}`);
    return el;
  };
  // Renders a React element alone on the page, and gives its container.
  async function mount(element) {
    await act(() => { for (const r of roots) r.unmount(); });
    roots = [];
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root');
    const root = externals['react-dom/client'].createRoot(container);
    roots.push(root);
    container.$update = (next) => act(() => root.render(next));
    container.$unmount = () => act(() => root.unmount());
    await act(() => root.render(element));
    return container;
  }

  return {
    $mount: mount,
    // Message of the error a React element throws when rendered, or null.
    async $error(element) {
      try {
        await mount(element);
        return null;
      } catch (e) {
        return e.message;
      }
    },
    $act: act,
    $click: (x) => act(() => find(x).click()),
    $type: (x, text) => act(() => {
      const el = find(x);
      const proto = Object.getPrototypeOf(el);
      const own = Object.getOwnPropertyDescriptor(proto, 'value');
      own.set.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      if (el.tagName === 'SELECT') el.dispatchEvent(new Event('change', { bubbles: true }));
    }),
    $key: (x, key, init = {}) => act(() => find(x).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }))),
    $fire: (x, event) => act(() => find(x).dispatchEvent(typeof event === 'string' ? new Event(event, { bubbles: true, cancelable: true }) : event)),
    $submit: (x) => act(() => find(x).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))),
    $text: (x) => find(x).textContent.trim(),
    $texts: (selector, root = document) => [...root.querySelectorAll(selector)].map((e) => e.textContent.trim()),
    // Until f stops throwing.
    async $until(f, ms = 1000) {
      const end = Date.now() + ms;
      for (;;) {
        try {
          return await f();
        } catch (e) {
          if (Date.now() > end) throw e;
          await act(() => new Promise((r) => setTimeout(r, 10)));
        }
      }
    },
  };
}
