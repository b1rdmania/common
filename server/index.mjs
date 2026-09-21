import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { betterAuth } from 'better-auth';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { getMigrations } from 'better-auth/db/migration';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { openStore, Problem } from './store.mjs';
import { hostRegistrationAllowed } from './host-policy.mjs';
import { calendar } from './calendar.mjs';
import { seedDemo, demoAccounts, demoPassword } from './seed.mjs';

const production = process.argv.includes('--production');
const port = Number(process.env.PORT || 3000);
const origin = new URL(process.env.APP_URL || `http://localhost:${port}`)
  .origin;
const demo = process.env.DEMO_MODE === 'true';
if (demo && !['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Demo mode is only allowed on a local origin.');
if (
  !process.env.BETTER_AUTH_SECRET ||
  process.env.BETTER_AUTH_SECRET.length < 32
)
  throw new Error(
    'Set BETTER_AUTH_SECRET to at least 32 random characters, or use npm run demo.',
  );
const google =
  !demo &&
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const emailEnabled = !demo && !!process.env.SMTP_HOST;
const hostEmails = demo
  ? demoAccounts.host.email
  : process.env.HOST_EMAILS || '';
const canCreateOrganisation = (user) =>
  hostRegistrationAllowed(user, hostEmails);
const store = openStore(process.env.DATABASE_PATH || './data/common.sqlite', {
  emailEnabled,
});
const auth = betterAuth({
  appName: process.env.APP_NAME || 'Common',
  baseURL: origin,
  secret: process.env.BETTER_AUTH_SECRET,
  database: store.db,
  trustedOrigins: [origin],
  emailAndPassword: { enabled: demo },
  socialProviders: google
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},
  rateLimit: { enabled: true, window: 60, max: 40 },
});
const migrations = await getMigrations(auth.options);
await migrations.runMigrations();
if (demo) await seedDemo(store, auth);
const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: production
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
            connectSrc: ["'self'"],
            upgradeInsecureRequests: origin.startsWith('https:') ? [] : null,
          },
        }
      : false,
    strictTransportSecurity: origin.startsWith('https:') ? undefined : false,
  }),
);
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 180,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json({ limit: '32kb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    req.get('origin') !== origin
  )
    return res
      .status(403)
      .json({ error: 'This request must come from this website.' });
  next();
});
const mustSignIn = async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) throw new Problem(401, 'Sign in to continue.');
  req.user = session.user;
  next();
};
const categories = [
  'Food & community',
  'Outdoors',
  'Practical help',
  'Mentoring',
  'Other',
];
const text = (min, max) => z.string().trim().min(min).max(max);
const organisationSchema = z.object({
  name: text(2, 100),
  description: text(20, 2000),
  website: z
    .union([z.literal(''), z.url().refine((v) => /^https?:\/\//.test(v))])
    .default(''),
});
const sessionSchema = z.object({
  organisation_id: z.string().uuid(),
  title: text(5, 120),
  description: text(30, 5000),
  category: z.enum(categories),
  area: text(2, 100),
  address: text(5, 250),
  requirements: text(5, 2000),
  accessibility: text(0, 2000).default(''),
  starts_at: z.iso.datetime(),
  ends_at: z.iso.datetime(),
  capacity: z.number().int().min(1).max(100),
});
const userEmail = (userId) =>
  store.db.prepare('SELECT email FROM user WHERE id=?').get(userId)?.email;
const notifyHosts = (s, subject, body) => {
  for (const m of store.db
    .prepare('SELECT user_id FROM memberships WHERE organisation_id=?')
    .all(s.organisation_id)) {
    const email = userEmail(m.user_id);
    if (email) store.queueEmail(email, subject, body + `\n\n${origin}/host`);
  }
};
app.get('/api/config', (req, res) =>
  res.json({
    name: process.env.APP_NAME || 'Common',
    city: process.env.APP_CITY || 'East London',
    timezone: process.env.APP_TIMEZONE || 'Europe/London',
    demo,
    google,
    email: !demo && !!process.env.SMTP_HOST,
    categories,
  }),
);
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/sessions', (req, res) => res.json(store.list()));
app.get('/api/sessions/:id', (req, res) =>
  res.json(store.session(req.params.id)),
);
app.get('/api/sessions/:id/calendar', mustSignIn, (req, res) => {
  const s = store.session(req.params.id);
  const host = store
    .organisations(req.user.id)
    .some((o) => o.id === s.organisation_id);
  const accepted = store.db
    .prepare(
      "SELECT id FROM applications WHERE session_id=? AND user_id=? AND status='accepted'",
    )
    .get(s.id, req.user.id);
  if (s.status !== 'published' || (!host && !accepted))
    throw new Problem(
      403,
      'Calendar export is available to confirmed volunteers and hosts of open sessions.',
    );
  res
    .type('text/calendar')
    .attachment('volunteering.ics')
    .send(calendar(s, origin));
});
app.post('/api/demo/sign-in', async (req, res) => {
  if (!demo) throw new Problem(404, 'Not found.');
  const role = z.enum(['volunteer', 'host']).parse(req.body.role);
  const response = await auth.api.signInEmail({
    body: { email: demoAccounts[role].email, password: demoPassword },
    headers: fromNodeHeaders(req.headers),
    asResponse: true,
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.status(response.status).json(await response.json());
});
app.get('/api/me', async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  res.json(
    session
      ? {
          user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
          },
          canCreateOrganisation: canCreateOrganisation(session.user),
          organisations: store.organisations(session.user.id),
        }
      : null,
  );
});
app.get('/api/plans', mustSignIn, (req, res) => {
  res.json(
    store.db
      .prepare(
        'SELECT * FROM applications WHERE user_id=? ORDER BY created_at DESC',
      )
      .all(req.user.id)
      .map((a) => ({ ...a, session: store.session(a.session_id) })),
  );
});
app.post('/api/sessions/:id/apply', mustSignIn, (req, res) => {
  const input = z
    .object({ note: text(0, 1500), acknowledged: z.literal(true) })
    .parse(req.body);
  const appId = store.apply(req.user.id, req.params.id, input.note);
  const s = store.session(req.params.id);
  notifyHosts(
    s,
    `New request: ${s.title}`,
    `${req.user.name} has requested a place. Sign in to review it.`,
  );
  res.status(201).json({ id: appId });
});
app.post('/api/applications/:id/withdraw', mustSignIn, (req, res) => {
  const a = store.withdraw(req.user.id, req.params.id);
  const s = store.session(a.session_id);
  notifyHosts(
    s,
    `${a.status === 'accepted' ? 'Place released' : 'Request withdrawn'}: ${s.title}`,
    `${req.user.name} has withdrawn their request.`,
  );
  res.json({ ok: true });
});
app.post('/api/organisations', mustSignIn, (req, res) => {
  if (!canCreateOrganisation(req.user))
    throw new Problem(
      403,
      'Host registration is by invitation during the pilot. Contact the site organiser to approve your sign-in email.',
    );
  res.status(201).json({
    id: store.createOrganisation(
      req.user.id,
      organisationSchema.parse(req.body),
    ),
  });
});
app.put('/api/host/organisations/:id', mustSignIn, (req, res) => {
  store.updateOrganisation(
    req.user.id,
    req.params.id,
    organisationSchema.parse(req.body),
  );
  res.json({ ok: true });
});
app.get('/api/host', mustSignIn, (req, res) => {
  const organisations = store.organisations(req.user.id);
  const ids = new Set(organisations.map((o) => o.id));
  const sessions = store.db
    .prepare(
      'SELECT s.id FROM sessions s JOIN opportunities o ON o.id=s.opportunity_id JOIN memberships m ON m.organisation_id=o.organisation_id WHERE m.user_id=? ORDER BY s.starts_at',
    )
    .all(req.user.id)
    .map((s) => store.session(s.id))
    .sort((a, b) => {
      const upcoming = (s) =>
        s.status === 'published' && s.starts_at > new Date().toISOString();
      return (
        Number(upcoming(b)) - Number(upcoming(a)) ||
        (upcoming(a)
          ? a.starts_at.localeCompare(b.starts_at)
          : b.starts_at.localeCompare(a.starts_at))
      );
    });
  const applications = store.db
    .prepare(
      `SELECT a.*,u.name,u.email,o.organisation_id,o.title FROM applications a
    JOIN user u ON u.id=a.user_id JOIN sessions s ON s.id=a.session_id JOIN opportunities o ON o.id=s.opportunity_id
    JOIN memberships m ON m.organisation_id=o.organisation_id WHERE m.user_id=? ORDER BY a.created_at DESC`,
    )
    .all(req.user.id);
  const members = store.db
    .prepare(
      `SELECT m.organisation_id,m.user_id,m.role,u.name,u.email FROM memberships m JOIN user u ON u.id=m.user_id`,
    )
    .all()
    .filter((m) => ids.has(m.organisation_id));
  res.json({ organisations, sessions, applications, members });
});
app.post('/api/host/sessions', mustSignIn, (req, res) =>
  res.status(201).json({
    id: store.createSession(req.user.id, sessionSchema.parse(req.body)),
  }),
);
app.put('/api/host/sessions/:id', mustSignIn, (req, res) => {
  store.updateSession(
    req.user.id,
    req.params.id,
    sessionSchema.parse(req.body),
  );
  const s = store.session(req.params.id);
  for (const a of store.db
    .prepare(
      "SELECT user_id FROM applications WHERE session_id=? AND status IN ('pending','accepted')",
    )
    .all(s.id)) {
    const email = userEmail(a.user_id);
    if (email)
      store.queueEmail(
        email,
        `Session updated: ${s.title}`,
        `${s.organisation_name} has changed the session details. Please check the latest time, location and preparation before attending.\n\n${origin}/opportunities/${s.id}`,
      );
  }
  res.json({ id: s.id });
});
app.post('/api/host/applications/:id/decision', mustSignIn, (req, res) => {
  const { status, expected_status } = z
    .object({
      status: z.enum(['accepted', 'declined']),
      expected_status: z.enum(['pending', 'accepted', 'declined']),
    })
    .parse(req.body);
  const a = store.decide(req.user.id, req.params.id, status, expected_status),
    s = store.session(a.session_id),
    email = userEmail(a.user_id);
  if (email)
    store.queueEmail(
      email,
      `${status === 'accepted' ? 'Your place is confirmed' : 'An update on your request'}: ${s.title}`,
      `${s.organisation_name} ${status === 'accepted' ? 'has confirmed your place.' : a.previous_status === 'accepted' ? 'has cancelled your confirmed place. Please do not attend unless the host confirms a new place.' : 'couldn’t offer you a place this time.'}\n\nView your plan: ${origin}/plans`,
    );
  res.json({ ok: true });
});
app.post('/api/host/sessions/:id/cancel', mustSignIn, (req, res) => {
  store.cancelSession(req.user.id, req.params.id);
  const s = store.session(req.params.id);
  for (const a of store.db
    .prepare(
      "SELECT user_id FROM applications WHERE session_id=? AND status IN ('pending','accepted')",
    )
    .all(s.id)) {
    const email = userEmail(a.user_id);
    if (email)
      store.queueEmail(
        email,
        `Session cancelled: ${s.title}`,
        `${s.organisation_name} has cancelled this session.\n\n${origin}/plans`,
      );
  }
  res.json({ ok: true });
});
app.post('/api/host/organisations/:id/invites', mustSignIn, (req, res) => {
  const { email } = z.object({ email: z.email() }).parse(req.body);
  const token = store.invite(req.user.id, req.params.id, email),
    url = `${origin}/join-team/${token}`;
  store.queueEmail(
    email,
    'You have been invited to help host on Common',
    `Sign in with this email address to join the organisation team. This link expires in seven days.\n\n${url}`,
  );
  res.status(201).json({ url });
});
app.post('/api/team-invites/:token/accept', mustSignIn, (req, res) =>
  res.json({ id: store.acceptInvite(req.user, req.params.token) }),
);
app.delete(
  '/api/host/organisations/:orgId/members/:userId',
  mustSignIn,
  (req, res) => {
    store.requireMember(req.params.orgId, req.user.id, true);
    const member = store.db
      .prepare(
        'SELECT role FROM memberships WHERE organisation_id=? AND user_id=?',
      )
      .get(req.params.orgId, req.params.userId);
    if (!member || member.role === 'owner')
      throw new Problem(400, 'Only organiser access can be removed here.');
    store.db
      .prepare('DELETE FROM memberships WHERE organisation_id=? AND user_id=?')
      .run(req.params.orgId, req.params.userId);
    res.json({ ok: true });
  },
);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, req, res, next) => {
  if (err instanceof z.ZodError)
    return res.status(400).json({
      error: err.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    });
  if (err instanceof Problem)
    return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'Invalid request.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});
let vite;
if (production) {
  if (!existsSync(resolve('dist/index.html')))
    throw new Error('Run npm run build before starting production.');
  app.use(express.static(resolve('dist')));
  app.get('/{*splat}', (req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: process.env.NODE_ENV === 'test' ? false : undefined,
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
const transport =
  !demo && process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      })
    : null;
let sending = false;
const mailTimer = setInterval(async () => {
  if (!transport || sending) return;
  sending = true;
  try {
    for (const m of store.db
      .prepare(
        'SELECT * FROM mail_outbox WHERE sent_at IS NULL AND attempts<5 ORDER BY created_at LIMIT 10',
      )
      .all()) {
      store.db
        .prepare('UPDATE mail_outbox SET attempts=attempts+1 WHERE id=?')
        .run(m.id);
      try {
        await transport.sendMail({
          from: process.env.MAIL_FROM || 'Common <hello@example.org>',
          to: m.recipient,
          subject: m.subject,
          text: m.body,
        });
        store.db
          .prepare('UPDATE mail_outbox SET sent_at=? WHERE id=?')
          .run(new Date().toISOString(), m.id);
      } catch {
        console.error(
          `Email delivery failed for outbox item ${m.id}; will retry (maximum 5 attempts).`,
        );
      }
    }
  } finally {
    sending = false;
  }
}, 15000);
mailTimer.unref();
const server = app.listen(
  port,
  demo ? '127.0.0.1' : process.env.HOST || '127.0.0.1',
  () =>
    console.log(
      `Common is ready at ${origin}${demo ? ' (fictional local demo)' : ''}`,
    ),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    clearInterval(mailTimer);
    server.close();
    if (vite) await vite.close();
    store.db.close();
    process.exit(0);
  });
