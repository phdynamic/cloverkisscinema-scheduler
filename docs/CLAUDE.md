# Clover Kiss Cinema Post Scheduler — agent entry point

Read this first. Documentation rules for agents: [`comments.md`](../comments.md) (repo root).

## Reading order
1. This file
2. [STATUS.md](STATUS.md) — what exists right now
3. [NEXT-SESSION.txt](NEXT-SESSION.txt) — where work was left off
4. Decisions / build log only as needed (routing below)

## Routing table
| Need | Go to |
|---|---|
| What's built / tested / not | [STATUS.md](STATUS.md) |
| Where we left off | [NEXT-SESSION.txt](NEXT-SESSION.txt) |
| Live checks still owed | [TESTING-OWED.md](TESTING-OWED.md) |
| Why a choice was made | [DECISIONS.md](DECISIONS.md) |
| When something happened | [BUILD-LOG.md](BUILD-LOG.md) |
| Recurring technical lessons | [standing-rules.md](standing-rules.md) |

## Concept
Self-hosted Bluesky post scheduler for @cloverkisscinema.club. Approved crew sign in with Bluesky and submit posts; the manager approves them; the scheduler posts them.
Repo `github.com/phdynamic/cloverkisscinema-scheduler` (renamed from `skyqueue` on 2026-10-11; npm package name is still `skyqueue`); deploys to Railway at `scheduler.cloverkisscinema.club`.

## Architecture notes (rarely change)
- One Node process: Express API + built Vite/React SPA (`dist/`) + node-cron sender. Entry `server/index.js`.
- DB: SQLite via Prisma (`prisma/schema.prisma`, migrations applied on start by `railway.toml`).
- Storage: Railway volume at `/data` → DB `/data/db/skyqueue.db`, uploads `/data/uploads`.
- Auth: Bluesky OAuth (`server/lib/oauth.js`, `routes/auth.js`); DB-backed session cookie; guest list = `User` table; manager = `ADMIN_HANDLE`/`ADMIN_DID`.
- Posting: one account from env (`CKC_HANDLE`, `CKC_APP_PASSWORD`) via `@atproto/api` (`server/lib/atproto.js`).
- Post states: `draft → pending → scheduled → sent | failed`, plus `rejected`. Cron sends only `scheduled`.
- Timing: crew never choose a time; the manager approves with Post now or an assigned time (or posts/schedules directly).
- Frontend: `client/src/` (components per page; `labels.js` holds the theatre-flavoured names).
- Env vars: see `.env.example`.
