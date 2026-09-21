import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../server/store.mjs';
import { calendar } from '../server/calendar.mjs';

function setup(t, capacity = 1) {
  const store = openStore(':memory:');
  t.after(() => store.db.close());
  const org = store.createOrganisation('host', {
    name: 'Test host',
    description: 'A community organisation for tests.',
  });
  const input = {
    organisation_id: org,
    title: 'Help in the garden',
    description: 'A practical community garden session.',
    category: 'Outdoors',
    area: 'Hackney',
    address: 'Test public venue',
    requirements: 'Sturdy shoes and an induction.',
    accessibility: 'Step-free.',
    capacity,
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 90000000).toISOString(),
  };
  const session = store.createSession('host', input);
  return { store, org, session, input };
}
test('host approval consumes capacity; pending requests do not', (t) => {
  const { store, session } = setup(t);
  const a = store.apply('one', session, ''),
    b = store.apply('two', session, '');
  assert.equal(store.session(session).places_left, 1);
  store.decide('host', a, 'accepted');
  assert.equal(store.session(session).places_left, 0);
  assert.throws(() => store.decide('host', b, 'accepted'), /no places left/);
  assert.equal(
    store.db.prepare('SELECT status FROM applications WHERE id=?').get(b)
      .status,
    'pending',
  );
});
test('an outsider cannot create sessions or approve someone else’s requests', (t) => {
  const { store, session, input } = setup(t);
  const a = store.apply('one', session, '');
  assert.throws(() => store.createSession('outsider', input), /permission/);
  assert.throws(() => store.decide('outsider', a, 'accepted'), /permission/);
  assert.throws(() => store.cancelSession('outsider', session), /permission/);
  assert.equal(store.session(session).places_left, 1);
});
test('withdrawal releases the confirmed place and allows a fresh request', (t) => {
  const { store, session } = setup(t);
  const a = store.apply('one', session, '');
  store.decide('host', a, 'accepted');
  assert.throws(() => store.withdraw('other', a), /not found/);
  store.withdraw('one', a);
  assert.equal(store.session(session).places_left, 1);
  assert.equal(store.apply('one', session, 'Trying again'), a);
});
test('duplicate applications and repeated decisions are rejected', (t) => {
  const { store, session } = setup(t);
  const a = store.apply('one', session, '');
  assert.throws(() => store.apply('one', session, ''), /already/);
  store.decide('host', a, 'declined');
  assert.throws(() => store.decide('host', a, 'declined'), /already/);
});
test('cancellation closes discovery and requests without erasing history', (t) => {
  const { store, session } = setup(t);
  const a = store.apply('one', session, '');
  store.cancelSession('host', session);
  assert.equal(store.list().length, 0);
  assert.throws(() => store.apply('two', session, ''), /no longer/);
  assert.throws(() => store.decide('host', a, 'accepted'), /cancelled/);
  assert.equal(
    store.db.prepare('SELECT COUNT(*) AS n FROM applications').get().n,
    1,
  );
});
test('invitations require the target verified email, expire, and are single-use', (t) => {
  const { store, org } = setup(t);
  const token = store.invite('host', org, 'organiser@example.org');
  assert.throws(
    () =>
      store.acceptInvite(
        { id: 'bad', email: 'other@example.org', emailVerified: true },
        token,
      ),
    /verified/,
  );
  assert.throws(
    () =>
      store.acceptInvite(
        { id: 'new', email: 'organiser@example.org', emailVerified: false },
        token,
      ),
    /verified/,
  );
  const user = {
    id: 'new',
    email: 'organiser@example.org',
    emailVerified: true,
  };
  store.acceptInvite(user, token);
  assert.equal(store.requireMember(org, 'new').role, 'organiser');
  assert.throws(() => store.acceptInvite(user, token), /already/);
  assert.throws(
    () => store.invite('new', org, 'someone@example.org'),
    /permission/,
  );
  const expired = store.invite('host', org, 'next@example.org');
  store.db.prepare("UPDATE team_invites SET expires_at='2000-01-01'").run();
  assert.throws(
    () =>
      store.acceptInvite(
        { id: 'next', email: 'next@example.org', emailVerified: true },
        expired,
      ),
    /expired/,
  );
});
test('sessions require sensible future start/end dates', (t) => {
  const { store, input } = setup(t);
  assert.throws(
    () =>
      store.createSession('host', {
        ...input,
        starts_at: '2000-01-01',
        ends_at: '2000-01-02',
      }),
    /future/,
  );
  assert.throws(
    () => store.createSession('host', { ...input, ends_at: input.starts_at }),
    /future/,
  );
});
test('calendar text is escaped, folded and keeps timestamps in UTC', (t) => {
  const { store, session } = setup(t);
  const s = store.session(session);
  const ics = calendar(
    {
      ...s,
      title: 'Garden, books; help\nNEWLINE',
      requirements: 'é'.repeat(90),
    },
    'https://example.org',
  );
  assert.match(ics, /SUMMARY:Garden\\, books\\; help\\nNEWLINE/);
  assert.match(ics, /DTSTART:\d{8}T\d{6}Z/);
  for (const line of ics.split('\r\n'))
    assert.ok(Buffer.byteLength(line) <= 75);
  assert.match(ics, /does not reserve a place/);
});

test('editing keeps applications and cannot reduce capacity below confirmed places', (t) => {
  const { store, session, input } = setup(t, 2);
  const a = store.apply('one', session, ''),
    b = store.apply('two', session, '');
  store.decide('host', a, 'accepted');
  store.decide('host', b, 'accepted');
  assert.throws(
    () => store.updateSession('outsider', session, input),
    /permission/,
  );
  assert.throws(
    () => store.updateSession('host', session, { ...input, capacity: 1 }),
    /confirmed/,
  );
  assert.throws(
    () =>
      store.updateSession('host', session, {
        ...input,
        organisation_id: 'another',
      }),
    /another organisation/,
  );
  store.updateSession('host', session, {
    ...input,
    title: 'A new garden session',
    capacity: 3,
  });
  assert.equal(store.session(session).title, 'A new garden session');
  assert.equal(store.session(session).places_left, 1);
  assert.equal(
    store.db
      .prepare('SELECT COUNT(*) AS n FROM applications WHERE session_id=?')
      .get(session).n,
    2,
  );
  store.cancelSession('host', session);
  assert.throws(() => store.updateSession('host', session, input), /upcoming/);
});

test('decision corrections preserve capacity and never revive withdrawals', (t) => {
  const { store, session } = setup(t);
  const a = store.apply('one', session, 'Need step-free access');
  const b = store.apply('two', session, '');
  store.decide('host', a, 'declined');
  store.decide('host', b, 'accepted');
  assert.throws(() => store.decide('host', a, 'accepted'), /no places/);
  store.decide('host', b, 'declined');
  store.decide('host', a, 'accepted');
  assert.equal(store.session(session).places_left, 0);
  assert.equal(
    store.db.prepare('SELECT note FROM applications WHERE id=?').get(a).note,
    'Need step-free access',
  );
  store.withdraw('one', a);
  assert.throws(() => store.decide('host', a, 'accepted'), /already/);
  assert.throws(() => store.decide('host', a, 'declined'), /already/);
});

test('only owners can edit organisation details', (t) => {
  const { store, org, session } = setup(t);
  store.db
    .prepare("INSERT INTO memberships VALUES(?,?,'organiser')")
    .run(org, 'helper');
  const input = {
    name: 'Updated garden',
    description: 'A corrected description for our garden.',
    website: '',
  };
  for (const user of ['outsider', 'helper'])
    assert.throws(
      () => store.updateOrganisation(user, org, input),
      /permission/,
    );
  store.updateOrganisation('host', org, input);
  assert.equal(store.session(session).organisation_name, input.name);
});

test('disabled email does not build a backlog; enabled email queues for delivery', (t) => {
  for (const enabled of [false, true]) {
    const store = openStore(':memory:', { emailEnabled: enabled });
    t.after(() => store.db.close());
    store.queueEmail('test@example.org', 'Decision', 'Confirmed');
    assert.equal(
      store.db.prepare('SELECT COUNT(*) AS n FROM mail_outbox').get().n,
      enabled ? 1 : 0,
    );
  }
});

test('a stale host screen cannot reverse a newer decision', (t) => {
  const { store, session } = setup(t);
  const a = store.apply('one', session, '');
  store.decide('host', a, 'accepted', 'pending');
  assert.throws(
    () => store.decide('host', a, 'declined', 'pending'),
    /Refresh/,
  );
  assert.equal(store.session(session).places_left, 0);
  store.decide('host', a, 'declined', 'accepted');
  assert.equal(store.session(session).places_left, 1);
});
