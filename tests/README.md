# Verification

`npm test` runs Node's test runner with the repository's TypeScript compiler.
No test framework dependency is required. Also run `npm run lint`,
`npx tsc --noEmit` and `npm run build`.

## Browser checks

Build the app, then serve it with `npm run start -- --port 3005` in another terminal.
Create `output/playwright/` for screenshots. The checks use fresh, named
Playwright CLI browsers. They clear or replace guest data in that test browser,
so use an isolated CLI session and stay signed out.

```powershell
New-Item -ItemType Directory -Path output/playwright -Force
npx --yes --package @playwright/cli playwright-cli -s=klack-qa open http://localhost:3005
npx --yes --package @playwright/cli playwright-cli -s=klack-qa run-code --filename tests/browser/solo-check.js
```

Run the remaining checks with the same `run-code --filename` command:

| File | Browser session and coverage |
| --- | --- |
| `solo-check.js` | `klack-qa`, first. Corrected mistakes, repair, Tab/Enter, saved drill history, rename/edit and comparisons. |
| `daily-check.js` | `klack-qa`, after solo. All five rounds, new targets, reload/resume, completion. Uses an accelerated browser clock. |
| `responsive-check.js` | `klack-qa`, after solo. 390px layout, focus position, reduced motion, light theme, progress filter and history dialog. |
| `targets-check.js` | Any session. Creates a separate context to check capitals, punctuation, pairs, retirement, legacy and all-history views. |
| `input-check.js` | A fresh `klack-perf` session. Physical-to-touch input, pause/resume and Shift+Tab. |
| `large-history-check.js` | `klack-perf`. Seeds 500 detailed results, then checks persistence, retention and restart. |
| `restart-check.js` | `klack-perf`. Measures 20 timed-text restarts from keydown to the next animation frame after text replacement. Use a real clock. |
| `race-check.js` | A fresh `klack-race` session. Needs the configured Supabase Realtime connection. Two isolated guests complete two real 30-second races, cancel/request/accept a rematch, verify input and disconnect. No account rows are written. |
| `room-guards-check.js` | Any session. Checks a third racer, the host leaving before start, and an empty room over real Realtime. |
| `drill-trend-check.js` | Any session. Creates a separate context and completes two saved-drill runs to verify the displayed speed change and history. |

Open each fresh named session using the `open` command above. Close it afterward
with `playwright-cli -s=SESSION close`. The browser files are standalone async
functions, the input format expected by `playwright-cli run-code --filename`.
Screenshots are saved under the ignored `output/playwright/` directory.

For a live-site check, open that site's URL in a fresh isolated CLI session.
Each check uses the origin of the open page. Create `output/playwright/live/`
for live screenshots. Guest fixtures stay in the isolated browser; the checks
do not sign in or alter an existing account's history.

## Database checks

Use a new disposable PostgreSQL cluster. `database-bootstrap.sql` supplies minimal
Supabase roles and auth stubs for this local check. It must never run on Supabase.

1. Apply `database-bootstrap.sql` as the local cluster owner.
2. Apply the pre-feature base schema, then `20261025054548_training_details.sql` twice
   to check an upgrade and repeatability. A fresh install can use the current
   `supabase/migrations/0001_init.sql` instead.
3. Run `training-database.sql` with `psql -v ON_ERROR_STOP=1` against that disposable
   database. It verifies metadata, upserts, old-client preservation, atomic failure,
   account isolation and anonymous access denial.
4. Stop and remove the disposable cluster.

These checks do not establish that the production migration is applied, or that
authenticated cross-device sync works against the production deployment.

`live-database-rollback.sql` is an operator-only check for an existing installation.
It checks the real RPC and RLS inside a transaction, then rolls back all test writes.
Its final row must report `PASS` and zero remaining test rows.
