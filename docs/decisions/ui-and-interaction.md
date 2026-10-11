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
