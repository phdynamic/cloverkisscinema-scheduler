# Status

Snapshot as of 2026-10-11 (`main` at `247a5ed`).

## Built
- Express API + built React SPA in one process; SQLite via Prisma (9 models, 3 migrations)
- node-cron sender: every minute, sends only status `scheduled`
- Bluesky OAuth sign-in; DB-backed sessions; guest list (User table); manager via ADMIN_HANDLE/ADMIN_DID
- Post flow: draft → pending → scheduled → sent/failed; rejected-with-note; author/approver snapshots
- Posting: single posts (no threads in composer or API), ≤4 images/post, alt text, auto link/mention facets; single account from env; existing multi-post threads still send
- Images: browser shrinks to ≤950KB JPEG before upload; server cap 1,000,000 B; checked again at save and at send
- UI: Login, Queue (6 status tabs, by-author filter), Composer, Calendar, Templates, Manager's Office
- Deploy: railway.toml (nixpacks; `prisma migrate deploy` on start); /healthz

## Tested
- Automated tests in repo: none. CI: none.
- Test evidence recorded in repo: none.
- Image shrink + 1MB limit: ad-hoc checks run 2026-10-11, scripts not kept
- Live: real post send from the CKC account: not confirmed

## Not built / not present
- No code for: failure notifications, video, analytics, bulk delete, template editing, multi-post threads (removed 2026-10-11)
- No README, no tests, no backup of /data
- Vestige: Account table kept (appPassword placeholder "(env)"), no route or UI
- Image shrink limits: GIFs over 1MB are refused (not re-encoded); shrunk PNGs lose transparency (flattened to white)

## Known risks
- logo.png is 933KB, loaded in every page header
- package name still `skyqueue`
- Whether the PR #3 migration ran in production: not recorded in repo
