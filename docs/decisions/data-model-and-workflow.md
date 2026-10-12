# Decisions: data model and workflow

## `Template.threads` stored as a JSON string
- date: 2026-04-02 · status: active · commit: dbc5042
- what: `String` column; routes `JSON.parse` / `JSON.stringify`
- why: not stated in repo. Inferred, low confidence: Prisma 5's SQLite connector has no Json type

## Approval workflow and status model
- date: 2026-10-10 · status: active · commit: 97cb86c
- what: crew can't schedule directly (their save becomes `pending`); any crew edit of an approved post returns it to `pending`; statuses are free strings (`draft|pending|scheduled|sent|failed|rejected`); cron sends only `scheduled`
- why: code comments — only manager-approved posts are ever sent

## Author and approver copied onto each post
- date: 2026-10-10 · status: active · commit: 4f3933a
- what: DID, handle and display name stored on `Post` (`submittedBy*`, `reviewedBy*`); manager-scheduled posts are stamped as approved by the manager
- why: code comment — credit survives removal from the guest list or a handle change

## Crew submit without a time; the manager assigns a time or posts now
- date: 2026-10-12 · status: active · refines "Approval workflow and status model"
- what: crew composer has no time field; the server ignores any crew-supplied `scheduledAt` / `postNow`. Approving needs `{ postNow: true }` or `{ scheduledAt }` (no time → 400). The manager can also Post now or Schedule from the composer, Post now from the queue, and edit a pending or scheduled post (Save changes keeps its status). `postNow` uses the server clock. A crew edit of an approved post returns it to `pending` and clears the time. Older submissions that carry a requested time are still honoured (past → 409 `PAST_TIME`, approve with a new time or Post now)
- why: developer request 2026-10-12 — the manager may not review before a crew-chosen time (not otherwise recorded in repo)
