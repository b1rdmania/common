import test from 'node:test';
import assert from 'node:assert/strict';
import { hostRegistrationAllowed } from '../server/host-policy.mjs';
test('host registration fails closed and requires an exact verified email', () => {
  const user = { email: 'Host@Example.org', emailVerified: true };
  assert.equal(hostRegistrationAllowed(user), false);
  assert.equal(hostRegistrationAllowed(user, ' , '), false);
  assert.equal(hostRegistrationAllowed(user, '*'), false);
  assert.equal(hostRegistrationAllowed(user, 'other@example.org'), false);
  assert.equal(
    hostRegistrationAllowed(user, ' HOST@example.org , next@example.org '),
    true,
  );
  assert.equal(
    hostRegistrationAllowed(
      { ...user, emailVerified: false },
      'host@example.org',
    ),
    false,
  );
});
