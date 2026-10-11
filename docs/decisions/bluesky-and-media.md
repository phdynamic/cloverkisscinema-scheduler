# Decisions: Bluesky and media

## Upload cap raised from 1MB to 5MB
- date: 2026-04-02 · status: superseded · commit: 0c00a74
- what: multer `fileSize` 5MB
- why (as stated): commit message — phone photos exceed 1MB; "Bluesky compresses at blob upload time"
- finding: wrong. The installed lexicon caps each image at 1,000,000 bytes; images of 1–5MB uploaded fine, then failed at send

> Superseded 2026-10-11 by "Images shrink in the browser; hard cap at Bluesky's 1,000,000 bytes" below.

## Links, mentions and hashtags detected at send time
- date: 2026-10-10 · status: active · commit: 97cb86c
- what: `RichText.detectFacets` before posting
- why: code comment — so they are clickable

## Image paths must resolve inside the upload dir
- date: 2026-10-10 · status: active · commit: 97cb86c
- what: `server/lib/validate.js` rejects any other path
- why: code comment — only files in that dir may ever be sent to Bluesky

## Images shrink in the browser; hard cap at Bluesky's 1,000,000 bytes
- date: 2026-10-11 · status: active
- what: browser re-encodes oversize photos to JPEG ≤950KB (≤2000px edge) before upload (`client/src/imageUtils.js`); server rejects >1,000,000 B at upload, at post save, and with a readable error at send. GIFs over 1MB are refused, not re-encoded; shrunk PNGs are flattened to white
- why: `app.bsky.embed.images` lexicon in installed `@atproto/api` 0.13.35 — `maxSize: 1000000` per image, max 4 images. Shrinking rather than reverting to a 1MB reject, because 0c00a74 recorded that phone photos exceed 1MB
- confidence: limit verified in the lexicon; live-tested: no
