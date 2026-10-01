// Read-only demo with no server. Answers /api requests from recorded demo
// data (scripts/capture-static-demo.mjs). Used only by npm run build:static.
if (import.meta.env.VITE_STATIC_DEMO) {
  const realFetch = window.fetch.bind(window);
  const dataPromise = import('./static-demo-data.json').then((m) => m.default);
  const key = 'common-static-demo-role';
  const role = () => {
    try {
      return sessionStorage.getItem(key) || 'guest';
    } catch {
      return 'guest';
    }
  };
  const setRole = (value) => {
    try {
      if (value) sessionStorage.setItem(key, value);
      else sessionStorage.removeItem(key);
    } catch {
      // The demo then stays signed out.
    }
  };
  // Move recorded dates forward by whole weeks so sessions stay in the
  // future and keep their weekday and time.
  const week = 7 * 24 * 60 * 60 * 1000;
  const shift = (body, offset) =>
    JSON.parse(JSON.stringify(body), (_, v) =>
      typeof v === 'string' && /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(v)
        ? new Date(Date.parse(v) + offset).toISOString()
        : v,
    );
  const reply = (status, body) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  window.fetch = async (input, init = {}) => {
    const url = new URL(
      typeof input === 'string' ? input : input.url,
      location.href,
    );
    if (!url.pathname.startsWith('/api/')) return realFetch(input, init);
    const path = url.pathname.slice(4),
      method = (init.method || 'GET').toUpperCase();
    if (path === '/demo/sign-in') {
      setRole(JSON.parse(init.body).role);
      return reply(200, { ok: true });
    }
    if (path.startsWith('/auth/sign-out')) {
      setRole(null);
      return reply(200, { success: true });
    }
    if (method !== 'GET')
      return reply(403, {
        error:
          'This is a read-only demo. Run Common yourself to try this. See the README.',
      });
    const data = await dataPromise;
    const recorded = data.roles[role()][path];
    if (!recorded) return reply(404, { error: 'Not in the demo.' });
    const offset =
      Math.ceil(Math.max(0, Date.now() - Date.parse(data.capturedAt)) / week) *
      week;
    return reply(recorded.status, shift(recorded.body, offset));
  };
}
