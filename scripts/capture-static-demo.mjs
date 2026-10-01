// Records API responses from a running local demo (npm run demo) for the
// static read-only demo build. Writes src/static-demo-data.json.
import { writeFileSync } from 'node:fs';

const base = process.env.DEMO_URL || 'http://localhost:3000';
const roles = { guest: null, volunteer: 'volunteer', host: 'host' };

async function get(path, cookie) {
  const response = await fetch(`${base}/api${path}`, {
    headers: cookie ? { cookie } : {},
  });
  return { status: response.status, body: await response.json() };
}

const data = { capturedAt: new Date().toISOString(), roles: {} };
for (const [name, role] of Object.entries(roles)) {
  let cookie = '';
  if (role) {
    const response = await fetch(`${base}/api/demo/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: base },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) throw new Error(`Sign-in as ${role} failed`);
    cookie = response.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
  }
  const responses = {};
  for (const path of ['/config', '/me', '/sessions', '/plans', '/host'])
    responses[path] = await get(path, cookie);
  for (const s of responses['/sessions'].body)
    responses[`/sessions/${s.id}`] = await get(`/sessions/${s.id}`, cookie);
  data.roles[name] = responses;
}
writeFileSync('src/static-demo-data.json', JSON.stringify(data, null, 1));
console.log(`Recorded ${Object.keys(data.roles.host).length} paths per role.`);
