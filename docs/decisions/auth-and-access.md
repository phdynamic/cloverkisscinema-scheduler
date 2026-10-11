# Decisions: auth and access

## HTTP basic auth via env vars
- date: 2026-04-02 · status: superseded · commits: dbc5042, 65e90c4
- what: `express-basic-auth` with `BASIC_AUTH_USER` / `BASIC_AUTH_PASS`
- why: not stated in repo

> Superseded 2026-10-10 by "Bluesky OAuth sign-in plus a guest list" below.

## Bluesky OAuth sign-in plus a guest list
- date: 2026-10-10 · status: active · commit: 97cb86c
- what: atproto OAuth client (`server/lib/oauth.js`); only people in the `User` table can log in; manager is `ADMIN_HANDLE`/`ADMIN_DID`
- why: commit message — only approved people can log in

## OAuth verifies identity only; tokens are discarded after login
- date: 2026-10-10 · status: active · commit: 97cb86c
- what: `session.signOut()` right after the callback
- why: code comment — only identity was needed, don't hold Bluesky tokens

## One posting account, credentials from env
- date: 2026-10-10 · status: active · commit: 97cb86c
- what: `CKC_HANDLE` / `CKC_APP_PASSWORD`; `Account.appPassword` is the placeholder `(env)`; passwords stored by the old multi-account version are scrubbed
- why: not stated beyond "never stored here" (code comment) — low confidence

## Dev login bypass works only on localhost
- date: 2026-10-10 · status: active · commit: 97cb86c
- what: `DEV_BYPASS_ROLE` is ignored unless `BASE_URL` starts with `http://localhost`
- why: code comment — it can never be live in production
