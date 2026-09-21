import Database from 'better-sqlite3';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { once } from 'node:events';

test(
  'HTTP journey enforces authentication, ownership and lifecycle rules',
  { timeout: 25000 },
  async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'common-test-'));
    const listener = createServer();
    listener.listen(0, '127.0.0.1');
    await once(listener, 'listening');
    const port = listener.address().port;
    await new Promise((resolve) => listener.close(resolve));
    const origin = `http://localhost:${port}`;
    const server = spawn(process.execPath, ['server/index.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DEMO_MODE: 'true',
        PORT: String(port),
        APP_URL: origin,
        DATABASE_PATH: join(directory, 'test.sqlite'),
        BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: '',
        SMTP_HOST: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    t.after(async () => {
      if (server.exitCode === null) {
        const exited = once(server, 'exit');
        server.kill('SIGTERM');
        await exited;
      }
      await rm(directory, { recursive: true, force: true });
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Test server did not start')),
        15000,
      );
      server.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('Common is ready')) {
          clearTimeout(timer);
          resolve();
        }
      });
      server.once('error', reject);
      server.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Test server exited: ${code}`));
      });
    });
    async function request(
      path,
      { cookie = '', method = 'GET', body, requestOrigin = origin } = {},
    ) {
      const response = await fetch(`${origin}/api${path}`, {
        method,
        headers: {
          Origin: requestOrigin,
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return {
        status: response.status,
        data: await response.json(),
        cookie: response.headers
          .getSetCookie()
          .map((c) => c.split(';')[0])
          .join('; '),
      };
    }
    assert.equal((await request('/host')).status, 401);
    assert.equal(
      (
        await request('/demo/sign-in', {
          method: 'POST',
          body: { role: 'host' },
          requestOrigin: 'https://elsewhere.example',
        })
      ).status,
      403,
    );
    const host = await request('/demo/sign-in', {
      method: 'POST',
      body: { role: 'host' },
    });
    const volunteer = await request('/demo/sign-in', {
      method: 'POST',
      body: { role: 'volunteer' },
    });
    assert.equal(host.status, 200);
    assert.equal(volunteer.status, 200);
    assert.equal(
      (
        await request('/organisations', {
          cookie: volunteer.cookie,
          method: 'POST',
          body: {
            name: 'Unapproved',
            description: 'This should never become a host.',
          },
        })
      ).status,
      403,
    );
    assert.equal(
      (await request('/me', { cookie: volunteer.cookie })).data
        .canCreateOrganisation,
      false,
    );
    const org = await request('/organisations', {
      cookie: host.cookie,
      method: 'POST',
      body: {
        name: 'HTTP Test Community',
        description:
          'A fictional community organisation for integration tests.',
        website: '',
      },
    });
    assert.equal(org.status, 201);
    const editOrg = {
      name: 'Updated community',
      description: 'A corrected description for the test community.',
      website: '',
    };
    assert.equal(
      (
        await request(`/host/organisations/${org.data.id}`, {
          cookie: volunteer.cookie,
          method: 'PUT',
          body: editOrg,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(`/host/organisations/${org.data.id}`, {
          cookie: host.cookie,
          method: 'PUT',
          body: editOrg,
        })
      ).status,
      200,
    );
    const input = {
      organisation_id: org.data.id,
      title: 'Test community garden session',
      description: 'Help plant seeds at our fictional test community garden.',
      category: 'Outdoors',
      area: 'Hackney',
      address: 'Fictional public garden',
      requirements: 'Wear sturdy shoes.',
      accessibility: 'Step-free access.',
      starts_at: new Date(Date.now() + 86400000).toISOString(),
      ends_at: new Date(Date.now() + 90000000).toISOString(),
      capacity: 1,
    };
    assert.equal(
      (
        await request('/host/sessions', {
          cookie: volunteer.cookie,
          method: 'POST',
          body: input,
        })
      ).status,
      403,
    );
    const created = await request('/host/sessions', {
      cookie: host.cookie,
      method: 'POST',
      body: input,
    });
    assert.equal(created.status, 201);
    const path = `/sessions/${created.data.id}`;
    assert.equal(
      (await request(`${path}/calendar`, { cookie: volunteer.cookie })).status,
      403,
    );
    const listing = await request(path);
    assert.equal(listing.status, 200);
    assert.equal(JSON.stringify(listing.data).includes('@'), false);
    assert.equal(
      (
        await request(`${path}/apply`, {
          cookie: volunteer.cookie,
          method: 'POST',
          body: { note: 'Hello', acknowledged: false },
        })
      ).status,
      400,
    );
    const applied = await request(`${path}/apply`, {
      cookie: volunteer.cookie,
      method: 'POST',
      body: { note: 'Looking forward to it.', acknowledged: true },
    });
    assert.equal(applied.status, 201);
    assert.equal(
      (
        await request(`${path}/apply`, {
          cookie: volunteer.cookie,
          method: 'POST',
          body: { note: 'Again', acknowledged: true },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request(`/host/applications/${applied.data.id}/decision`, {
          cookie: volunteer.cookie,
          method: 'POST',
          body: { status: 'accepted', expected_status: 'pending' },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(`/host/applications/${applied.data.id}/decision`, {
          cookie: host.cookie,
          method: 'POST',
          body: { status: 'accepted', expected_status: 'pending' },
        })
      ).status,
      200,
    );
    const calendar = await fetch(`${origin}/api${path}/calendar`, {
      headers: { Cookie: volunteer.cookie },
    });
    assert.equal(calendar.status, 200);
    assert.match(await calendar.text(), /BEGIN:VCALENDAR/);
    const decisionPath = `/host/applications/${applied.data.id}/decision`;
    assert.equal(
      (
        await request(decisionPath, {
          cookie: host.cookie,
          method: 'POST',
          body: { status: 'declined', expected_status: 'accepted' },
        })
      ).status,
      200,
    );
    assert.equal(
      (await request(`${path}/calendar`, { cookie: volunteer.cookie })).status,
      403,
    );
    assert.equal(
      (
        await request(decisionPath, {
          cookie: host.cookie,
          method: 'POST',
          body: { status: 'accepted', expected_status: 'declined' },
        })
      ).status,
      200,
    );
    assert.equal((await request(path)).data.places_left, 0);
    assert.equal(
      (await request('/plans', { cookie: volunteer.cookie })).data[0].status,
      'accepted',
    );
    assert.equal(
      (await request('/plans', { cookie: host.cookie })).data.length,
      0,
    );
    assert.equal(
      (
        await request(`/host/sessions/${created.data.id}`, {
          cookie: host.cookie,
          method: 'PUT',
          body: { ...input, title: 'Updated garden session' },
        })
      ).status,
      200,
    );
    assert.equal((await request(path)).data.title, 'Updated garden session');
    assert.equal(
      (
        await request(`/applications/${applied.data.id}/withdraw`, {
          cookie: volunteer.cookie,
          method: 'POST',
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request(decisionPath, {
          cookie: host.cookie,
          method: 'POST',
          body: { status: 'accepted', expected_status: 'pending' },
        })
      ).status,
      409,
    );
    assert.equal((await request(path)).data.places_left, 1);
    assert.equal(
      (
        await request(`/host/sessions/${created.data.id}/cancel`, {
          cookie: host.cookie,
          method: 'POST',
        })
      ).status,
      200,
    );
    assert.equal(
      (await request('/sessions')).data.some((s) => s.id === created.data.id),
      false,
    );
    const invitation = await request(
      `/host/organisations/${org.data.id}/invites`,
      {
        cookie: host.cookie,
        method: 'POST',
        body: { email: 'alex@common.example' },
      },
    );
    assert.equal(invitation.status, 201);
    const token = new URL(invitation.data.url).pathname.split('/').pop();
    assert.equal(
      (
        await request(`/team-invites/${token}/accept`, {
          cookie: host.cookie,
          method: 'POST',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(`/team-invites/${token}/accept`, {
          cookie: volunteer.cookie,
          method: 'POST',
        })
      ).status,
      200,
    );
    assert.equal(
      (await request('/me', { cookie: volunteer.cookie })).data.organisations[0]
        .role,
      'organiser',
    );
    assert.equal(
      (
        await request(`/host/organisations/${org.data.id}/invites`, {
          cookie: volunteer.cookie,
          method: 'POST',
          body: { email: 'someone@example.org' },
        })
      ).status,
      403,
    );
    const db = new Database(join(directory, 'test.sqlite'), { readonly: true });
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM mail_outbox').get().n,
      0,
    );
    db.close();
  },
);
