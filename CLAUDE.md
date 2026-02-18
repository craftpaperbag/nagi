# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start Next.js dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint (flat config, next/core-web-vitals + typescript)
```

No test framework is configured. No Prettier config exists.

## Environment Variables

Required in `.env.local`:
```
REDIS_URL          # Upstash Redis connection
VERCEL_OIDC_TOKEN  # Vercel authentication
RESEND_API_KEY     # Transactional email (Magic Link auth)
```

Optional: `SHORTCUT_URL`, `RUN_SHORTCUT_URL`, `NEXT_PUBLIC_BASE_URL`

## Architecture

**nagi** is a Japanese digital well-being app that passively tracks smartphone usage via iOS Shortcuts and visualizes time as "Stone" (screen time, grey/static) vs "Wave" (free time, animated/pastel). Deployed on Vercel with Upstash Redis as the sole data store.

### Tech Stack
- **Next.js 16 (App Router)** with TypeScript (strict), React 19, Tailwind CSS v4
- **Upstash Redis** for all persistence (sessions, users, logs, app sets)
- **Resend** for Magic Link transactional email
- **iOS Shortcuts** as the data collection client (POST to `/api/log` with Bearer token)

### Key Patterns
- **Single-page dashboard**: All UI lives on `/` (`app/page.tsx`). URL query params (`?date=`, `?settings=`, `?large=`) drive view state.
- **Server Components + Server Actions**: `page.tsx` is a Server Component that fetches directly from Redis. Mutations (`toggleTargetApp`, `addDummyLog`, `deleteLog`, `updateSetupStatus`) are Server Actions defined in `page.tsx`.
- **Client Components** (`components/`) receive data as props from the server. Interactivity uses `useState` locally.
- **TransitionContext** (`components/TransitionContext.tsx`): Shared React Context wrapping `useTransition()` to coordinate loading overlays across components during Server Action calls.
- **Path alias**: `@/*` maps to project root.

### Data Flow
1. iOS Shortcut sends `POST /api/log` with Bearer token → authenticated via `api_token:{token}` Redis lookup
2. Logs stored as Redis Lists: `logs:{user_id}:{YYYY-MM-DD}` containing `{ts, app, is_dummy}` JSON
3. `apps:{user_id}` Redis Set tracks all app names seen
4. Dashboard renders timeline by iterating logs chronologically, inheriting state from previous day's last log

### Redis Key Schema
- `auth_token:{uuid}` → email (TTL 600s)
- `user:email:{email}` → user_id
- `user:{user_id}` → JSON user profile (includes `api_token`, `target_apps[]`)
- `session:{session_id}` → user_id (TTL 30 days)
- `api_token:{api_token}` → user_id
- `logs:{user_id}:{YYYY-MM-DD}` → List of log entries
- `apps:{user_id}` → Set of app names

### Auth
Custom Magic Link (passwordless): email → UUID token in Redis (TTL 600s) → email via Resend → callback validates token → session UUID in HttpOnly cookie (30d). Rate limited in production (5 req/hr per IP via `@upstash/ratelimit`, skipped in dev).

### Timeline Visualization
`components/VisualTimeline.tsx` renders SVG with animated wave background and grey stone overlays. Segments are merged when adjacent and same type. All times use JST (Asia/Tokyo).

## CORE.md Constitution (Highest Priority)

CORE.md defines absolute design constraints that override all other considerations:

- **No Gamification**: No badges, streaks, scores, rankings
- **No Notifications**: App must never push-notify users
- **No Guilt**: No warnings, no red danger signals, no "you used too much" messaging
- **No Social**: No sharing, likes, or social features
- **Minimal UI**: Small text, large whitespace, monochrome base, no decorative icons
- **All UI text in Japanese**
- **Zero Friction**: Minimize cognitive load at every step; the ideal state is the user forgetting the app exists

## Development Notes

Dev-only features are guarded by environment checks. `is_dummy` flag marks test data (shown in dev, filtered in production). Test log ingestion:

```bash
curl -X POST http://localhost:3000/api/log \
    -H "Authorization: Bearer YOUR_API_KEY_HERE" \
    -H "Content-Type: application/json" \
    -d '{"app": "Instagram"}'
```
