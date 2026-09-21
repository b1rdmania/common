// An empty allowlist closes registration. Existing teams keep their access.
export function hostRegistrationAllowed(user, emails = '') {
  return Boolean(
    user?.emailVerified &&
    new Set(
      emails
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ).has(user.email.toLowerCase()),
  );
}
