# Decisions: UI and interaction

## Six selectable colour themes
- date: 2026-04-02 · status: superseded · commits: e7a76c8, df64fa6
- what: blue, red, purple, then teal, orange, emerald, with a sidebar switcher stored in `localStorage`
- why: not stated in repo

> Superseded 2026-10-10 (97cb86c): single Clover Kiss look. Commit message — "Restyled to match cloverkisscinema.club; replaces the six colour themes".

## Composer text inputs are white with dark text on dark cards
- date: 2026-04-02 · status: active · commit: 891698d
- what: reverted the translucent dark inputs introduced in df64fa6; kept through the 2026-10-10 restyle (`client/src/index.css` comment)
- why: commit message — better readability

## Single posts only; no multi-post threads
- date: 2026-10-11 · status: active
- what: composer has no "Add to thread", seat number or reorder/remove controls; `server/lib/validate.js` allows 1 post per save (`MAX_SEGMENTS = 1`); templates load their first post only. The `Thread` table and `sendPost` are unchanged, so existing multi-post threads still send. Opening one in the composer shows the thread header and a note; remove the extra posts to save
- why: developer request 2026-10-11 (not otherwise recorded in repo)

## Plain labels and a calmer look (supersedes the cinema vocabulary and heavy styling)
- date: 2026-10-21 · status: active
- what: nav/tabs/buttons use plain names (Posts, New post, Calendar, Templates, Approved users; Awaiting approval / Scheduled / Drafts / Posted / Failed / Sent back; Save draft). Removed the marquee dot border and animation, the "lore" stats line, tagline and "Now showing" eyebrows. System sans font; no all-caps or wide letter-spacing; Google Fonts dropped. Palette and logo kept. Site name: "Clover Kiss Cinema Post Scheduler"
- why: user request — tone down theming; buttons and labels should be self-explanatory
- live-tested: no
