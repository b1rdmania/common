<p align="center">
  <img src="docs/assets/common-banner.svg" alt="Common" width="100%" />
</p>

Common is a volunteer sign-up app for one organisation or local network. Hosts post dated sessions. Volunteers request a place. Hosts accept or decline.

**[Try the read-only demo](https://fern-mortar-2sza.here.now/)**. Switch between a volunteer and a host.

The project is parked. The code works and is MIT licensed. If you run volunteers, fork it and use it.

| Find something to do                                                                               | Review requests                                                                                    |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ![Opportunity cards showing activities, dates and available places](docs/assets/opportunities.png) | ![Host dashboard showing volunteer requests and approval controls](docs/assets/host-dashboard.png) |

## What it does

- Public listings with dates, places and location.
- Google sign-in. Volunteers request a place with a short note.
- Host teams: owners invite organisers. Hosts accept, decline or change a decision.
- Capacity checks. No overbooking.
- Calendar export and optional email updates.
- Host sign-up limited to an email allowlist.

It does not do hour tracking, employer reporting, payments, recurring sessions or messaging.

## Run it

Try it with fictional data. You do not need credentials.

```sh
npm ci
npm run demo
```

### To run it for real

You need someone who can deploy a Node app. You also need:

1. Google OAuth credentials. Sign-in is Google only.
2. A random `BETTER_AUTH_SECRET`.
3. Your email in `HOST_EMAILS`. Without it, nobody can create an organisation.
4. One server with a persistent disk. Docker and Fly.io configs are included.

SMTP email is optional. See [docs/self-hosting.md](docs/self-hosting.md) for each step.

`npm run build:static` builds the read-only demo as static files.

Stack: React, Vite, Express, Better Auth, SQLite. See [docs/architecture.md](docs/architecture.md).

## What we learned

We parked Common after we spoke with someone who ran a similar platform in San Francisco. Read this before you build a public volunteering platform:

1. Host organisations need a lot of help to write listings. Many do not answer volunteer questions, for example "Do I bring gloves?".
2. It is hard to get volunteers unless you serve a group that already exists and shares a cause.
3. Most people do not volunteer a second time. Growth goes up and then down.

[GoodGym](https://www.goodgym.org) already does this well in the UK, with a fitness angle.

The app fits better as a tool for one organisation that already has volunteers.

## Status

Not maintained. Real Google OAuth, SMTP delivery and a public HTTPS deploy have not had a full end-to-end test. Test them before you invite people. Issues and pull requests are welcome, but replies can be slow.

[MIT](LICENSE)
