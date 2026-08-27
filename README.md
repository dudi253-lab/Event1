# Digi v0.9 Clean

Clean-room production candidate. The historical repository is preserved separately in `../digi-audit`.

## Architecture

- Next.js route handlers are the only application gateway to privileged data.
- Browser receives only the Supabase URL and publishable key. `SUPABASE_SECRET_KEY` is server-only.
- All buckets are private. Guests receive one-time signed upload tokens; media URLs expire after 60–300 seconds.
- One event credential row, one scrypt PIN verifier, one hashed session table, one atomic PIN rotation function.
- Every staff request validates cookie, event, role, expiry, membership and credential version.
- Public tables have RLS enabled and all `anon`/`authenticated` table grants are revoked.

## Audit summary of v0.2–v0.8.5

- Root source and ZIP artifacts diverged; version labels did not identify deployable source.
- Multiple login, validation and PIN-writer RPC generations used inconsistent grants and credential sources.
- Direct `photos` insertion and `/api/complete-upload` coexisted, causing regression and orphan risks.
- Storage had an unnecessary pending-object SELECT policy.
- Sensitive tokens could be supplied in query strings.
- Event end rules differed between ticket, completion and RLS paths.
- No complete, destructive-cleanup E2E certification existed.
- CSS and SQL accumulated compatibility layers and obsolete fallbacks.

## Removed from v0.9

All versioned RPC fallbacks, legacy SQL migrations, public pending access, query-string session tokens, public buckets, direct browser row insertion, duplicate upload completion routes and historical ZIP artifacts. They remain available in the untouched backup only.

## Setup

1. Create a fresh Supabase project and rotate any previously exposed keys.
2. Copy `.env.example` to `.env.local` and fill every value. Use a direct/session-pooler Postgres URL for `DATABASE_URL`.
3. Run `npm install` and `npm run setup`. The command applies `schema.sql` and creates a certification admin/event.
4. Run `npm run dev`.

## Certification

With the app running and all environment variables set, run `npm run certify`. It creates two isolated events, uploads real PNG objects, verifies pending visibility, moderator isolation, approval, album visibility, double-approval safety, admin login, PIN rotation/session invalidation, event independence and upload blocking after end. It then deletes test rows and objects. Success ends with `✅ Digi Production Certification Passed`.

## Vercel

Import this directory as the project root. Set Node 22 and the five Supabase/admin variables from `.env.example` (plus `CERTIFY_BASE_URL` only for certification). Never create a `NEXT_PUBLIC_` secret. Run certification against a preview deployment and its isolated Supabase staging project before promoting the exact commit to production.

## Known risks

- Live Supabase certification and iPhone/Safari HEIC testing require external environments and have not run locally.
- Four-digit PINs remain low entropy; the server enforces five attempts per event/IP fingerprint per 15 minutes, but distributed abuse should additionally use Vercel Firewall/edge rate limiting.
- Signed URLs cannot be revoked before their short expiry.
- Event creation/branding/access-point management UI is intentionally smaller than the critical v0.9 flow and needs product expansion after certification.
- Image decoding/compression and sticker editing were not carried over; correctness and privacy took precedence.

## Rollback

Do not mutate the old Supabase project. Deploy v0.9 against a new project. Keep the previous Vercel deployment and `../digi-audit` unchanged. Rollback is a Vercel promotion to the previous deployment plus restoration of its prior environment-variable set. Database rollback is project switching, not reverse-running `schema.sql`; export v0.9 data before decommissioning it.
