# Architecture

One repository, one server, one database:

```text
src/                 React UI and CSS
server/index.mjs     Express routes, Better Auth, SMTP worker
server/store.mjs     SQLite schema and domain rules
server/calendar.mjs Calendar export
server/seed.mjs     Fictional local demo
scripts/demo.mjs    Isolated demo launcher
tests/              Domain and integration tests
```

React + Vite renders the interface. Express owns the API. Better Auth manages Google OAuth and cookie sessions. Better SQLite3 stores organisations, team memberships, opportunities, dated sessions, applications and invitation tokens. Nodemailer delivers optional transactional emails. Fonts ship with the app; there is no analytics script or external image service.

Each published listing currently has one dated session. The separate opportunity/session tables leave room for recurring sessions later without requiring that feature now. Each deployment has its own accounts and data; there is no federation or shared central directory.

API writes validate input and origin. Host actions check organisation membership on the server. Team invitations are stored as hashes, expire after seven days, and can only be redeemed by the invited verified email address. Names and email addresses are visible only to the relevant host team after an application, not in the public listings.
