# Decisions: architecture and deployment

## Single process, SQLite on a volume, in-process cron
- date: 2026-04-02 · status: active · commit: dbc5042
- what: one Express process serves the API and the built SPA from `dist/`; SQLite at `DATABASE_URL`, uploads at `UPLOAD_DIR`, both on the Railway volume at `/data`; node-cron runs inside the same process
- why: not stated in repo

## restartPolicyType must be uppercase `ON_FAILURE`
- date: 2026-04-02 · status: active · commit: c61dac8
- what: `railway.toml` uses `ON_FAILURE`
- why: commit message — Railway expects uppercase enum values

## Scheduler skips a tick while the previous one is still running
- date: 2026-10-10 · status: active · commit: 97cb86c
- what: `running` flag in `server/cron.js`
- why: code comment — a slow send must not overlap the next tick, or the same post could send twice
