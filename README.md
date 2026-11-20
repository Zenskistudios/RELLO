# Rello

Rello is a social-first Nigerian network for neighbourhood updates, conversations, local stories and community reports. It pairs a conversational feed with short-form video discovery and an interactive map.

## Run locally

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API runs on `http://localhost:3001`. For a built version, run `npm run build` followed by `npm start`; the API serves the built application from `dist/`.

Set `SESSION_SECRET` to a long, unique secret before exposing the API beyond local development. Without it, the API generates an in-memory secret on startup, so existing sessions must sign in again after a restart.

## What works

- Email/password sign-up and sign-in; passwords are salted and hashed.
- Persistent SQLite accounts, public/follower/private post visibility, editable profiles and follow relationships.
- Text posts and photo/video uploads, with a 50 MB limit and media-type validation.
- Likes, replies, reposts, link sharing, bookmarks, incident follows, notifications, hashtags and mentions.
- For You, Following, Nearby and Trending feeds, account search, saved posts, and a vertical video discovery feed using uploaded videos.
- A map of geotagged civic reports and organisation announcements, with category, time and verification filters.
- Community-report moderation controls: block, mute and report.
- Verified organisation accounts are distinguished from citizens. Public-safety announcements are rejected unless the account is both an organisation and verified. New accounts are citizens and are never implicitly verified.

## Local data and trusted organisations

The SQLite database is created at `data/rello.sqlite`; uploaded files are stored in `uploads/`. Both directories are ignored by Git. Back them up together. This local setup uses filesystem storage and SQLite, so it is intended for development and a single-host deployment, not a horizontally scaled production service.

Institutional verification must be granted by a trusted operator; it is not provided by ordinary sign-up. For local testing, an operator can promote an organisation account in the database only after checking its authority. A post reporting an incident starts as **unverified** and is not an official confirmation.

The map uses OpenStreetMap tiles and attribution. Location is only attached when a poster chooses to type a place or explicitly shares browser location.

## Progressive web app

Rello includes a web app manifest, standalone display mode, branded 192 px and 512 px icons, app shortcuts and a service worker. Run a production build before testing installation:

```powershell
npm run build
npm start
```

Open `http://localhost:3001` in Chrome or Edge and use **Install Rello** from the browser menu. The install button also appears inside the app when the browser exposes an install prompt. Rello caches the app shell and static assets; `/api/` and `/uploads/` requests remain network-first, and offline navigation displays an offline screen when no cached page is available.
