# Run Common for your community

Requires Node.js 22.12 or later. From the repository directory:

```sh
npm ci
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `BETTER_AUTH_SECRET`, then configure:

| Setting                                     | Purpose                                                           |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `APP_NAME` / `APP_CITY`                     | Your community name and city                                      |
| `APP_URL`                                   | Exact site origin, including the development port                 |
| `APP_TIMEZONE`                              | IANA timezone used to display session dates, e.g. `Europe/London` |
| `DATABASE_PATH`                             | Persistent SQLite file; defaults to `./data/common.sqlite`        |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Your Google OAuth web application credentials                     |
| `SMTP_*` / `MAIL_FROM`                      | Optional SMTP delivery settings                                   |
| `HOST` / `PORT`                             | Listening address and port                                        |

In your Google OAuth web application, add the authorised redirect URI:

```text
https://YOUR-DOMAIN/api/auth/callback/google
```

For local development use `http://localhost:3000/api/auth/callback/google` and set `APP_URL=http://localhost:3000`. Configure the Google consent screen and allowed test users as appropriate for your Google project. No password-based registration is enabled outside demo mode.

```sh
npm run dev
```

For a production build:

```sh
npm run build
npm start
```

Serve it behind HTTPS, set `APP_URL` to that exact HTTPS origin, and persist the `data` directory. Keep a stable `BETTER_AUTH_SECRET` across restarts. With one trusted reverse proxy, set `TRUST_PROXY=true`; do not enable this when clients can reach the Node process directly and forge forwarding headers. By default the server listens only on `127.0.0.1`. Set `HOST` explicitly if your hosting environment requires another address.

This version is designed for **one Node process with a local persistent SQLite disk**. It is not designed for a stateless serverless function, a network-mounted SQLite file or multiple application replicas. There is no external database or paid platform requirement.

To back up, stop the app and copy the whole `data` directory to a protected backup location. Restore with the app stopped. Treat the database, `.env` and backups as private: they contain account data, session tokens and volunteer contact details. Do not commit them.

### Approved hosts

Set `HOST_EMAILS` to the comma-separated Google email addresses of known hosts, then restart the server. An empty setting blocks all new organisation registration. Matching is case-insensitive and requires a verified email; wildcards are not supported. Existing organisation members keep access, and owners can invite organisers without adding them to this list. Removing an email blocks new organisation creation but does not revoke existing memberships. Demo mode permits only the fictional host account to create organisations.

### Email

Without SMTP, requests and decisions still work and are visible in **My plans** and **Your host space**. The UI makes the absence of email clear. With SMTP configured, a worker tries queued messages every 15 seconds, up to five delivery attempts. A queued message is not proof of delivery. There is no email-queue admin screen in V1. With email disabled, new notifications are not queued. Older versions may have left unsent messages: these will still be attempted when SMTP is connected, so use a fresh database for a real launch after testing. Test real request, decision, correction and cancellation emails before you invite users.

## Try the local demo

Run `npm run demo` to explore with fictional accounts and opportunities, without Google credentials. Demo mode uses a separate database and disables Google OAuth and SMTP delivery.

## Docker

```sh
docker build -t common .
docker run -p 3000:3000 -v common-data:/data --env-file .env common
```

The image listens on `0.0.0.0:3000` and stores the database in `/data`. Mount a volume there. Set `APP_URL` to the public origin.

## Fly.io

```sh
cp fly.example.toml fly.toml   # set app and primary_region
fly launch --no-deploy --copy-config
fly volumes create data --size 1
fly secrets set BETTER_AUTH_SECRET=... APP_URL=https://YOUR-APP.fly.dev \
  GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... HOST_EMAILS=you@example.org
fly deploy
```

Run one machine only. SQLite lives on the volume, so a second machine would have its own separate database.

## Branding

Set `APP_NAME` and `APP_CITY`. Colours are CSS variables at the top of `src/styles.css`. Demo text and illustrations are in `src/demo-content.js` and `src/illustrations.js`.

## Deployment status

Real Google OAuth, external SMTP delivery and deployment behind a public HTTPS proxy have not had a full end-to-end test. Test them before you invite users.

## Static read-only demo

`npm run build:static` writes a static copy of the UI to `dist-static/`. It needs no server. It reads recorded data from `src/static-demo-data.json` and refuses all writes. To record new data, start `npm run demo`, then run `node scripts/capture-static-demo.mjs` in a second terminal.

## Reset the local demo

Stop the app and remove only `data/demo.sqlite`, `data/demo.sqlite-wal` and `data/demo.sqlite-shm`, then run `npm run demo` again. These are fictional demo records; a normal installation uses a separate database.
