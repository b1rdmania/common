import Database from 'better-sqlite3';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export class Problem extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const id = () => randomUUID();
const hash = (value) => createHash('sha256').update(value).digest('hex');

export function openStore(path, { emailEnabled = false } = {}) {
  if (path !== ':memory:')
    mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS organisations (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      website TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS memberships (
      organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','organiser')),
      PRIMARY KEY(organisation_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS opportunities (
      id TEXT PRIMARY KEY, organisation_id TEXT NOT NULL REFERENCES organisations(id),
      title TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL,
      area TEXT NOT NULL, address TEXT NOT NULL, requirements TEXT NOT NULL,
      accessibility TEXT NOT NULL DEFAULT '', minimum_age INTEGER NOT NULL DEFAULT 18
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
      starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, capacity INTEGER NOT NULL CHECK(capacity BETWEEN 1 AND 100),
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','cancelled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), user_id TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','accepted','declined','withdrawn')),
      decided_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(session_id,user_id)
    );
    CREATE INDEX IF NOT EXISTS applications_session_status ON applications(session_id,status);
    CREATE INDEX IF NOT EXISTS applications_user ON applications(user_id);
    CREATE TABLE IF NOT EXISTS team_invites (
      token_hash TEXT PRIMARY KEY, organisation_id TEXT NOT NULL REFERENCES organisations(id),
      email TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT
    );
    CREATE TABLE IF NOT EXISTS mail_outbox (
      id TEXT PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, sent_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const select = `SELECT s.*, o.title, o.description, o.category, o.area, o.address,
    o.requirements, o.accessibility, o.minimum_age, o.organisation_id,
    g.name AS organisation_name, g.description AS organisation_description, g.website AS organisation_website,
    (SELECT COUNT(*) FROM applications a WHERE a.session_id=s.id AND a.status='accepted') AS accepted_count
    FROM sessions s JOIN opportunities o ON o.id=s.opportunity_id JOIN organisations g ON g.id=o.organisation_id`;
  const session = (sessionId) => {
    const value = db.prepare(`${select} WHERE s.id=?`).get(sessionId);
    if (!value) throw new Problem(404, 'This session could not be found.');
    return { ...value, places_left: value.capacity - value.accepted_count };
  };
  const requireMember = (orgId, userId, owner = false) => {
    const member = db
      .prepare(
        'SELECT * FROM memberships WHERE organisation_id=? AND user_id=?',
      )
      .get(orgId, userId);
    if (!member || (owner && member.role !== 'owner'))
      throw new Problem(
        403,
        'You do not have permission to manage this organisation.',
      );
    return member;
  };
  return {
    db,
    session,
    requireMember,
    list() {
      return db
        .prepare(
          `${select} WHERE s.status='published' AND s.starts_at>? ORDER BY s.starts_at`,
        )
        .all(new Date().toISOString())
        .map((s) => ({ ...s, places_left: s.capacity - s.accepted_count }));
    },
    organisations(userId) {
      return db
        .prepare(
          `SELECT g.*,m.role FROM organisations g JOIN memberships m ON m.organisation_id=g.id WHERE m.user_id=? ORDER BY g.name`,
        )
        .all(userId);
    },
    createOrganisation(userId, input) {
      return db.transaction(() => {
        const orgId = id();
        db.prepare(
          'INSERT INTO organisations(id,name,description,website) VALUES(?,?,?,?)',
        ).run(orgId, input.name, input.description, input.website || '');
        db.prepare('INSERT INTO memberships VALUES(?,?,?)').run(
          orgId,
          userId,
          'owner',
        );
        return orgId;
      })();
    },
    updateOrganisation(userId, orgId, input) {
      requireMember(orgId, userId, true);
      db.prepare(
        'UPDATE organisations SET name=?,description=?,website=? WHERE id=?',
      ).run(input.name, input.description, input.website || '', orgId);
    },
    createSession(userId, input) {
      requireMember(input.organisation_id, userId);
      const start = new Date(input.starts_at),
        end = new Date(input.ends_at);
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        start <= new Date() ||
        end <= start ||
        end - start > 86400000
      )
        throw new Problem(
          400,
          'Choose a future session with an end time after its start (up to 24 hours).',
        );
      return db.transaction(() => {
        const opportunityId = id(),
          sessionId = id();
        db.prepare(
          `INSERT INTO opportunities(id,organisation_id,title,description,category,area,address,requirements,accessibility,minimum_age)
          VALUES(?,?,?,?,?,?,?,?,?,?)`,
        ).run(
          opportunityId,
          input.organisation_id,
          input.title,
          input.description,
          input.category,
          input.area,
          input.address,
          input.requirements,
          input.accessibility || '',
          18,
        );
        db.prepare(
          'INSERT INTO sessions(id,opportunity_id,starts_at,ends_at,capacity) VALUES(?,?,?,?,?)',
        ).run(
          sessionId,
          opportunityId,
          start.toISOString(),
          end.toISOString(),
          input.capacity,
        );
        return sessionId;
      })();
    },
    updateSession(userId, sessionId, input) {
      return db
        .transaction(() => {
          const s = session(sessionId);
          requireMember(s.organisation_id, userId);
          if (input.organisation_id !== s.organisation_id)
            throw new Problem(
              400,
              'A session cannot move to another organisation.',
            );
          if (
            s.status !== 'published' ||
            s.starts_at <= new Date().toISOString()
          )
            throw new Problem(
              409,
              'Only upcoming, open sessions can be edited.',
            );
          const start = new Date(input.starts_at),
            end = new Date(input.ends_at);
          if (
            !Number.isFinite(start.getTime()) ||
            !Number.isFinite(end.getTime()) ||
            start <= new Date() ||
            end <= start ||
            end - start > 86400000
          )
            throw new Problem(
              400,
              'Choose a future session with an end time after its start (up to 24 hours).',
            );
          if (input.capacity < s.accepted_count)
            throw new Problem(
              409,
              'Capacity cannot be lower than the number of confirmed volunteers.',
            );
          db.prepare(
            'UPDATE opportunities SET title=?,description=?,category=?,area=?,address=?,requirements=?,accessibility=? WHERE id=?',
          ).run(
            input.title,
            input.description,
            input.category,
            input.area,
            input.address,
            input.requirements,
            input.accessibility || '',
            s.opportunity_id,
          );
          db.prepare(
            'UPDATE sessions SET starts_at=?,ends_at=?,capacity=? WHERE id=?',
          ).run(
            start.toISOString(),
            end.toISOString(),
            input.capacity,
            sessionId,
          );
          return sessionId;
        })
        .immediate();
    },
    apply(userId, sessionId, note) {
      return db
        .transaction(() => {
          const s = session(sessionId);
          if (
            s.status !== 'published' ||
            s.starts_at <= new Date().toISOString()
          )
            throw new Problem(
              409,
              'This session is no longer accepting requests.',
            );
          if (s.places_left <= 0)
            throw new Problem(
              409,
              'This session is full. Please choose another date.',
            );
          const previous = db
            .prepare(
              'SELECT * FROM applications WHERE session_id=? AND user_id=?',
            )
            .get(sessionId, userId);
          if (previous && previous.status !== 'withdrawn')
            throw new Problem(
              409,
              'You already have a request for this session. Check My plans.',
            );
          const now = new Date().toISOString();
          if (previous) {
            db.prepare(
              "UPDATE applications SET status='pending',note=?,decided_by=NULL,updated_at=? WHERE id=?",
            ).run(note, now, previous.id);
            return previous.id;
          }
          const appId = id();
          db.prepare(
            'INSERT INTO applications(id,session_id,user_id,note,created_at,updated_at) VALUES(?,?,?,?,?,?)',
          ).run(appId, sessionId, userId, note, now, now);
          return appId;
        })
        .immediate();
    },
    decide(userId, appId, status, expectedStatus) {
      if (!['accepted', 'declined'].includes(status))
        throw new Problem(400, 'Invalid decision.');
      return db
        .transaction(() => {
          const application = db
            .prepare('SELECT * FROM applications WHERE id=?')
            .get(appId);
          if (!application) throw new Problem(404, 'Request not found.');
          const s = session(application.session_id);
          requireMember(s.organisation_id, userId);
          if (expectedStatus && application.status !== expectedStatus)
            throw new Problem(
              409,
              'This decision changed. Refresh the host space before trying again.',
            );
          if (
            s.status !== 'published' ||
            s.starts_at <= new Date().toISOString()
          )
            throw new Problem(409, 'This session has ended or been cancelled.');
          if (
            application.status === 'withdrawn' ||
            application.status === status
          )
            throw new Problem(409, 'This request has already been updated.');
          if (status === 'accepted' && s.places_left <= 0)
            throw new Problem(409, 'There are no places left.');
          db.prepare(
            'UPDATE applications SET status=?,decided_by=?,updated_at=? WHERE id=?',
          ).run(status, userId, new Date().toISOString(), appId);
          return {
            ...application,
            previous_status: application.status,
            status,
          };
        })
        .immediate();
    },
    withdraw(userId, appId) {
      return db.transaction(() => {
        const a = db
          .prepare('SELECT * FROM applications WHERE id=? AND user_id=?')
          .get(appId, userId);
        if (!a) throw new Problem(404, 'Request not found.');
        if (!['pending', 'accepted'].includes(a.status))
          throw new Problem(409, 'This request is no longer active.');
        if (session(a.session_id).starts_at <= new Date().toISOString())
          throw new Problem(409, 'This session has already started.');
        db.prepare(
          "UPDATE applications SET status='withdrawn',updated_at=? WHERE id=?",
        ).run(new Date().toISOString(), appId);
        return a;
      })();
    },
    cancelSession(userId, sessionId) {
      const s = session(sessionId);
      requireMember(s.organisation_id, userId);
      if (s.status === 'cancelled')
        throw new Problem(409, 'This session is already cancelled.');
      if (s.starts_at <= new Date().toISOString())
        throw new Problem(409, 'This session has already started.');
      db.prepare("UPDATE sessions SET status='cancelled' WHERE id=?").run(
        sessionId,
      );
    },
    invite(userId, orgId, email) {
      requireMember(orgId, userId, true);
      const token = randomBytes(32).toString('hex');
      db.prepare(
        'INSERT INTO team_invites(token_hash,organisation_id,email,expires_at) VALUES(?,?,?,?)',
      ).run(
        hash(token),
        orgId,
        email.toLowerCase(),
        new Date(Date.now() + 7 * 86400000).toISOString(),
      );
      return token;
    },
    acceptInvite(user, token) {
      return db
        .transaction(() => {
          const invite = db
            .prepare('SELECT * FROM team_invites WHERE token_hash=?')
            .get(hash(token));
          if (
            !invite ||
            invite.used_at ||
            invite.expires_at < new Date().toISOString()
          )
            throw new Problem(
              404,
              'This invitation has expired or has already been used.',
            );
          if (invite.email !== user.email.toLowerCase() || !user.emailVerified)
            throw new Problem(
              403,
              'Sign in with the verified Google email address this invitation was sent to.',
            );
          db.prepare(
            "INSERT OR IGNORE INTO memberships VALUES(?,?,'organiser')",
          ).run(invite.organisation_id, user.id);
          db.prepare(
            'UPDATE team_invites SET used_at=? WHERE token_hash=?',
          ).run(new Date().toISOString(), hash(token));
          return invite.organisation_id;
        })
        .immediate();
    },
    queueEmail(recipient, subject, body) {
      if (!emailEnabled) return;
      db.prepare(
        'INSERT INTO mail_outbox(id,recipient,subject,body) VALUES(?,?,?,?)',
      ).run(id(), recipient, subject, body);
    },
  };
}
