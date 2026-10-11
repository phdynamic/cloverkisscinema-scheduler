# Build log: 2026-10 — Clover Kiss Cinema rebuild

## 2026-10-10 — backfill (written 2026-10-11 from git history)
- built: CKC-exclusive rebuild (97cb86c, 35 files): Bluesky OAuth, User/Session/OAuth tables, guest list, manager/crew roles, approval flow, single env account, restyle, server validation, facets, cron overlap guard; migration auth_and_approval
- removed: Accounts route/UI, basic auth, 6 themes
- added: logo.png (f6c7cf2, developer upload)
- built: author/approver snapshots, by-author filter (4f3933a); migration post_author_credit w/ back-fill
- merged: PR #2 (8f6132f), PR #3 (6f836cc)
- added: comments.md (91b71c4, developer upload); on branch only, not main
- live-tested: not recorded in repo

## 2026-10-11 — docs structure + image-limit fix
- added: docs/ per comments.md, backfilled from git history; root CLAUDE.md pointer to docs/CLAUDE.md (approved deviation)
- fixed: images 1–5MB passed upload then failed at send; Bluesky caps images at 1,000,000 B (lexicon, @atproto/api 0.13.35)
- changed: browser shrinks images to ≤950KB JPEG before upload (client/src/imageUtils.js); server cap 1,000,000 B (uploads.js), save-time check (validate.js), readable send-time error (atproto.js)
- fixed: multer limit off-by-one — exactly 1,000,000 B was rejected
- why: supersedes the 5MB decision (decisions/bluesky-and-media.md)
- tested: ad-hoc server checks (8) + real-browser checks (7) pass; earlier ad-hoc suites (35, 13) re-run pass; scripts not kept in repo
- live-tested: no
- unverified: Bluesky accepting a shrunk image on a real post; GIFs >1MB refused; shrunk PNGs lose transparency
