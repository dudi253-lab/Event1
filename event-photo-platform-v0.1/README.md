# Moments — Event Photo Platform (Starter v0.1)

Responsive Hebrew/RTL starter for a multi-event shared photo platform.

## Included in v0.1

- Guest interface: QR/NFC landing, mock photo selection/upload flow, success screen, public album.
- Photo moderator interface: mobile-first approval queue with approve / reject / private / undo demo.
- Company admin interface: event dashboard plus dynamic event name and cover-image editor with live preview.
- Multi-event mock data model.
- Supabase starter SQL schema.
- `.env.example` for future Supabase connection.
- Responsive design for mobile and desktop.

## Routes

- `/` — interface selector
- `/e/demo-event` — guest experience
- `/moderator` — photo moderator
- `/admin` — company back office

## Run locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Supabase

This Starter uses mock data intentionally. The next development milestone connects the UI to Supabase Database + Storage.

A starter schema is located at:

`supabase/schema.sql`

Do **not** commit real service role keys. Use `.env.local` locally and environment variables in Vercel.

## Architecture principle

The app is designed as a multi-event commercial platform from day one. Branding, admins, moderators, photos, access points and settings are event-scoped rather than hardcoded to one wedding.
