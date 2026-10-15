# Testing owed

Running backlog of live checks owed in production. Each item: how to test, what should happen.

- **Real post send.** Sign in as manager → The Booth → text + 1 small image → Schedule 2 min ahead (needs `CKC_APP_PASSWORD` set). Expect: post appears on @cloverkisscinema.club; card moves to Premiered.
- **Large phone photo.** Add a ≥3MB photo in The Booth, schedule and let it send. Expect: thumbnail appears, stored file ≤1MB, post goes out, orientation correct. Also try a >1MB GIF: expect a clear refusal message.
- **Crew loop.** Manager adds a crew handle (Manager's Office); crew signs in and submits a post (no time field); manager approves with Post now, then again with an assigned time. Expect: both send at the right moment; Premiered cards show correct "by" and "approved by".
- **Production migration.** Check the latest deploy log for `All migrations have been successfully applied` (post_author_credit). Expect: cards show author/approver and the "Show posts by" filter appears.
- **Manager DM.** Make sure the `CKC_APP_PASSWORD` app password was created with "Allow access to your direct messages". Crew submits a post. Expect: DM from @cloverkisscinema.club to the manager with preview + link. A draft sends none. If nothing arrives, check the deploy log for "Could not DM the manager".
