<p align="center">
  <img src="docs/assets/common-banner.svg" alt="Common — Get out. Do some good." width="100%" />
</p>

<p align="center">
  <strong>A few hours. A few good people. Something useful to do together.</strong>
</p>

<p align="center">
  <a href="https://github.com/b1rdmania/common/actions/workflows/ci.yml"><img src="https://github.com/b1rdmania/common/actions/workflows/ci.yml/badge.svg" alt="Build and tests" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-MIT-3548DC" alt="MIT licence" /></a>
  <img src="https://img.shields.io/badge/status-early%20V1-E2EBD4?labelColor=26342A" alt="Early V1" />
</p>

<p align="center">
  <a href="#try-it-in-two-minutes">Try it locally</a> ·
  <a href="docs/self-hosting.md">Run it in your city</a> ·
  <a href="CONTRIBUTING.md">Contribute</a> ·
  <a href="https://github.com/b1rdmania/common/issues">Ideas &amp; bugs</a>
</p>

## Less screen time. More real life.

Common makes it easier to find local volunteering that fits your week—and bring your people along.

It started with developers, founders and people working for themselves: people who spend a lot of time at a screen and would like to get out, meet someone and do something useful. A morning in a community garden. A few hours preparing food. Your old team getting back together to lend a hand.

You should be able to see what’s happening before creating an account. Hosts should be able to put a session online without learning a complicated management system.

**Browse → invite friends → request a place → host confirms → show up.**

## Try it in two minutes

You’ll need **Node.js 22.12+** and npm.

```sh
git clone https://github.com/b1rdmania/common.git
cd common
npm ci
npm run demo
```

Open **http://localhost:3000**. No credentials required for the demo.

| Try it as            | What you can do                                                  |
| -------------------- | ---------------------------------------------------------------- |
| **Alex · volunteer** | Browse, request a place, invite friends and see your plans.      |
| **Charlie · host**   | Publish a session, review requests and manage your organisation. |

Use **Switch role** at the top to try both sides. For a complete loop, request a place as Alex, accept it as Charlie, then switch back to Alex.

> All demo organisations, venues and participants are fictional. The demo runs locally with shared test accounts; keep it off the public internet. Google sign-in and outgoing email are disabled in demo mode.

## What’s here

| For volunteers                                      | For hosts                                |
| --------------------------------------------------- | ---------------------------------------- |
| Browse before signing in                            | Create an organisation profile           |
| Filter by activity, area, date and available places | Publish, edit and cancel sessions        |
| Read preparation and accessibility details          | Accept or decline volunteer requests     |
| Share a session with friends                        | See confirmed capacity and applicants    |
| Request a place and follow its status               | Invite other organisers to your team     |
| Add a session to your calendar or withdraw          | Send updates through optional SMTP email |

Friends request their own places. A request becomes a booking when the host accepts it. Capacity checks happen inside a database transaction, so the last place cannot be allocated twice.

## Small enough to understand. Yours to build on.

**React + Vite · Node + Express · SQLite · Better Auth**

One application server and one database file. Fonts are served locally. Google provides sign-in for real installations; SMTP is optional. City, name and timezone are configurable.

The code is **MIT licensed**. Run it for your neighbourhood, change the design, build an independent version, or contribute improvements here. Each installation has its own accounts and data.

- [Self-hosting guide](docs/self-hosting.md) — Google sign-in, email, deployment and backups.
- [Architecture](docs/architecture.md) — how the application fits together.
- [Verification notes](VERIFICATION.md) — what has been tested and what hasn’t.

## Help make the next version

We’re looking for people who enjoy making useful software simpler. Design, accessibility, documentation and host feedback are as welcome as code.

Good early contributions include:

- Fixing an awkward interaction you noticed while trying the demo.
- Improving keyboard navigation, mobile layouts or error messages.
- Making it easier for another community to install and run Common.
- Helping hosts describe an activity clearly and welcome first-time volunteers.

For larger features, [open an issue](https://github.com/b1rdmania/common/issues/new) first so we can agree on scope. Keep pull requests small and explain the user problem they solve. Maintainers review changes before they become part of the official project.

**The product rule: make it easier to volunteer or organise volunteering.** Keep the core focused; hour tracking, corporate reporting and social feeds are outside the current scope.

```sh
npm test                # Domain rules and an isolated HTTP integration journey
npm run build          # Production bundle
npm run format:check   # Consistent formatting
```

See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Where we are

This is an **early, working V1**, intended for testing with a small group of known hosts and volunteers. The demo works today; recruiting a real pilot is the next step.

Hosts currently register themselves and approve volunteer requests. **Platform approval of hosts, reporting and suspension are not built yet.** A Google login does not verify an organisation. Hosts arrange any role-specific checks; this version supports adults only.

Recurring sessions, direct messages, waitlists, account-deletion controls and AI-assisted listing creation are also not implemented. Real deployments need their own operator contact, privacy information and processes for handling reports and data requests. The hosting guide explains the deployment limits.

## Licence

[MIT](LICENSE) © Common contributors. Reuse, modify and run the code—including commercially—with the required licence notice. Third-party dependencies retain their own licences.

---

<p align="center"><strong>Small acts. Shared company.</strong></p>
