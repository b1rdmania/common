# V1 verification

Checked locally on 17 September 2026 with Node.js 22.12.0.

- `npm test`: 10 tests passed, including an isolated HTTP integration journey using real cookie authentication and a temporary SQLite database.
- `npm run build`: production bundle built successfully.
- `npm run format:check`: passed.
- Browser: public discovery and category filtering; volunteer demo sign-in; request submission; host acceptance; confirmed capacity; My plans after a server restart; friend invitation copy; host session creation, editing and cancellation; sign-out.
- Layout: inspected at 1440px desktop and 390px mobile widths. No horizontal document overflow at 390px. Checked the mobile invitation dialog.
- Production smoke test: loaded the built app, signed in and verified an existing confirmation. Preview runs locally with fictional data.

Google OAuth with real credentials, external SMTP delivery and deployment behind a public HTTPS proxy were not exercised. No external messages were sent. Demo mode disables Google OAuth and SMTP delivery, even when those environment variables are present.
