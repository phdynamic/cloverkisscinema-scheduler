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
- changed: repo renamed skyqueue → cloverkisscinema-scheduler (developer-confirmed); Railway repointed; npm package name unchanged
- fixed: images 1–5MB passed upload then failed at send; Bluesky caps images at 1,000,000 B (lexicon, @atproto/api 0.13.35)
- changed: browser shrinks images to ≤950KB JPEG before upload (client/src/imageUtils.js); server cap 1,000,000 B (uploads.js), save-time check (validate.js), readable send-time error (atproto.js)
- fixed: multer limit off-by-one — exactly 1,000,000 B was rejected
- why: supersedes the 5MB decision (decisions/bluesky-and-media.md)
- tested: ad-hoc server checks (8) + real-browser checks (7) pass; earlier ad-hoc suites (35, 13) re-run pass; scripts not kept in repo
- merged: PR #4 (247a5ed)
- live-tested: no
- unverified: Bluesky accepting a shrunk image on a real post; GIFs >1MB refused; shrunk PNGs lose transparency

## 2026-10-11 — single-post composer
- removed: "Add to thread", seat number and reorder/remove controls from the composer (Composer.jsx)
- changed: server allows 1 post per save (validate.js MAX_SEGMENTS 25→1); templates load first post only
- kept: Thread table + sendPost; legacy multi-post threads still send and can be trimmed in the composer
- why: developer request (decisions/ui-and-interaction.md)
- tested: ad-hoc server (5) + real-browser (8) checks pass; earlier ad-hoc suites (35, 13, 8) re-run pass; scripts not kept in repo
- live-tested: no
- unverified: whether any legacy multi-post threads exist in production

## 2026-10-12 — manager-assigned timing
- removed: time picker from the crew composer; crew-supplied time/postNow now ignored server-side
- changed: approve takes `{ postNow }` or `{ scheduledAt }` (Queue dialog: Post now / Schedule for, next full hour prefilled); manager composer gets Post now + Save changes (status kept); queue "Post now" and composer use server clock (`postNow`)
- changed: crew edit of an approved post → pending, time cleared
- kept: older submissions with a requested time still approve (past → 409 PAST_TIME)
- why: decisions/data-model-and-workflow.md
- tested: ad-hoc server + browser (26 new); earlier suites (35, 13, 8, 13) re-run pass after 3 intentional expectation changes (crew submit needs no time; approvals need an explicit time; past-time case built in DB); scripts not kept in repo
- live-tested: no
- unverified: crew + manager flow in production; Post now delay (sender runs each minute)

## 2026-10-15 — DM the manager on new submissions
- added: `server/lib/notify.js`; called from `routes/posts.js` after create/PUT when a crew post lands in `pending`
- why: decisions/bluesky-and-media.md
- tested: module loads; failure path returns without throwing; real DM not sent
- live-tested: no

## 2026-10-15 — premiered previews in full
- changed: Premiered cards in `Queue.jsx` show the whole text (line breaks kept) and all images as thumbnails; other tabs keep the 100-char preview
- tested: client builds; not viewed in a browser
- live-tested: no

## 2026-10-21 — plain labels, calmer styling
- changed: renamed themed labels app-wide (client, OAuth client name shown on Bluesky's consent screen, server log, error strings, DM text); CSS simplified
- why: decisions/ui-and-interaction.md
- tested: client builds; login and queue screenshots checked; other pages not re-screenshotted
- live-tested: no

## 2026-10-24 — link to the main site
- added: "Clover Kiss Cinema website ↗" (https://cloverkisscinema.club, new tab, `noopener noreferrer`) at the right of the nav and under the sign-in card
- tested: client builds
- live-tested: no

## 2026-10-24 — full text and images in every post view
- changed: new `PostPreview` component used by Posts (all tabs), Calendar day list and the approve dialog: whole text (line breaks kept, every segment of a legacy thread) plus all images; CSS line-clamp removed. Templates list, template picker and the manager DM no longer truncate
- supersedes: 2026-10-15 "premiered previews in full" (now applies to every status)
- tested: ad-hoc browser run — Pending tab, Scheduled tab, approve dialog and Calendar day list each show the end of a ~260-char two-paragraph post and its image; client builds. Not checked: Templates pages with long text, DM
- live-tested: no
