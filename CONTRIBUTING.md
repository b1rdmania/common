# Contributing to Common

Keep the basic journey short: browse, invite, request, get a host decision.

Run `npm ci` and `npm run demo` to work locally without Google credentials. All demo content is fictional. Run `npm test`, `npm run build` and `npm run format:check` before submitting a change.

Prefer small contributions with a concrete user need. Avoid introducing another hosted service or package when the existing stack can do the job simply. Keep deployments independent and configurable. Do not add hour tracking, mandatory payments or employer administration to the core journey.

For changes to booking, permissions or invitation rules, add a test that demonstrates the behaviour and its failure cases. Check UI changes at both a narrow mobile width and a desktop width. Preserve keyboard access and visible form labels.

Never include real volunteer details, database files, `.env` files or credentials in contributions. If reporting a vulnerability, contact the operator or repository maintainer privately rather than posting credentials or personal data in an issue.

Contributions are distributed under the project's MIT licence. Only contribute work you have the right to license that way. Imported directory data has its own usage terms; an open-source importer does not automatically make every source's data reusable.
