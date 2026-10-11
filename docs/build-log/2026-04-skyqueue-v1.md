# Build log: 2026-04 — SkyQueue v1

## 2026-04-02 — backfill (written 2026-10-11 from git history)
Commits span 09:51–11:39 UTC; PR #1 merged to main 2026-10-10 (7f030e4).
- built: initial SkyQueue (dbc5042): API for accounts/posts/templates/uploads, cron sender, atproto posting w/ threads+images, Prisma/SQLite, React UI, basic auth, railway.toml
- fix: restartPolicyType → ON_FAILURE (c61dac8)
- fix: trim BASIC_AUTH_USER/PASS, log auth user (65e90c4)
- built: 3 gradient themes + switcher (e7a76c8); +3 themes, dark segments (df64fa6)
- changed: white inputs (891698d); lighter segments (f9359fd)
- changed: upload cap 1→5MB; multer errors → JSON (0c00a74)
- live-tested: not recorded in repo
- unverified: 5MB cap vs Bluesky per-image limit
  > Wrong — see 2026-10-11 entry in build-log/2026-10-clover-kiss-booth.md
