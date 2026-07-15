# PhysioCenter — Patient Session Tracking with NFC Card

Tracks therapy session credits per patient at a physiotherapy center, deducted via card scans at reception, with WhatsApp notifications and admin reporting. Multi-branch from day one. No NFC hardware or WhatsApp account required to run — see [Current operating mode](#current-operating-mode-no-hardware-yet) below.

## Project layout

```
server/          Express + TypeScript + SQLite API (cloud-hosted)
web/             React + Vite + Tailwind admin/kiosk app (cloud-hosted)
scanner-agent/   Node.js service for a reception PC + NFC reader (installs later, once hardware exists)
```

## Prerequisites

- Node.js 20+ and npm

## Setup

```bash
npm install   # installs all three workspaces
```

### 1. Server

```bash
cd server
cp .env.example .env
# Edit .env: set JWT_SECRET to a long random string, and SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run migrate       # creates the SQLite DB and applies schema + seed data
npm run seed:admin    # creates your first admin login
npm run dev           # starts the API on http://localhost:4000
```

### 2. Web app

```bash
cd web
cp .env.example .env   # defaults point at the server above
npm run dev             # starts the admin app on http://localhost:5173
```

Log in with the admin email/password from `server/.env`.

### 3. Scanner-agent (only needed once NFC hardware is purchased)

```bash
cd scanner-agent
cp .env.example .env
# Paste the device token from the web app's Devices page (super-admin only) into DEVICE_TOKEN
npm run dev
```

## Current operating mode (no hardware yet)

The center doesn't have NFC cards, a reader, or a WhatsApp account yet, so the system is built to be fully usable without them:

- **Cards**: issuing a card generates a short printable code (e.g. `PH-7K2Q9X`) instead of reading a real NFC chip. Write it on a physical card by hand; it works identically to a real NFC UID once a reader exists.
- **Scanning**: on the Kiosk page, reception types or pastes the patient's card code instead of tapping. This is the real production flow today, not a placeholder — it calls the exact same confirmation pipeline a real scanner-agent tap will use later.
- **WhatsApp**: the active provider is `stub`, which logs the message to the server console and records it in `whatsapp_message_log` instead of sending it. Swap `whatsapp_provider` in Settings once a real WhatsApp API account exists — no other code changes needed (see `server/src/modules/whatsapp/`).

## Scan confirmation flow

1. Card code entered (Kiosk) or tapped (scanner-agent, later) → `POST /scans/manual` or `/scans/ingest`.
2. Server checks: card assigned to a patient → patient active → scanning branch matches patient's home branch (or the patient is flagged `allow_any_branch_scan`) → not scanned again within the cooldown window → patient has sessions remaining. Any failure blocks the scan with a specific reason; no session is deducted.
3. If all checks pass, a *pending* scan is created and pushed live (Socket.IO) to the Kiosk screen for that branch.
4. Reception confirms or cancels. Confirming deducts one session, sends the patient a WhatsApp confirmation, and — only when exactly 1 or 0 sessions remain afterward — alerts the admin's WhatsApp number (set in Settings).
5. An unconfirmed pending scan auto-expires after a configurable timeout (Settings).

## Multi-branch

One branch is seeded by default (`Main Branch`). Add more from the **Branches** page (super-admin only). Each patient has a home branch; toggle `allow_any_branch_scan` on a patient's detail page to let them scan at other branches too. The branch selector in the top-right (super-admin view) filters patients, reports, activity log, and the Kiosk itself.

## Deploying a free demo (GitHub Pages + Render)

The frontend deploys to **GitHub Pages** (static hosting, free) and the backend deploys to **Render's free web service** (runs the Node API + SQLite + Socket.IO). This is meant for showing a client a live link, not for permanent production use — see the caveats below.

**Free-tier caveats:** Render's free web service spins down after ~15 min idle (first request after that takes 30-60s to wake up), and has no persistent disk, so the SQLite database resets to the seeded defaults on every redeploy or restart. Fine for a walkthrough demo; upgrade Render to a paid plan with a disk (see `render.yaml`) if the client needs data to persist across days.

### 1. Push to GitHub

```bash
git remote add origin https://github.com/<your-username>/physiocenter.git
git branch -M main
git push -u origin main
```

(Create the empty repo named `physiocenter` on github.com first — don't initialize it with a README/license, this project already has its own.)

### 2. Deploy the backend to Render

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint** → connect your `physiocenter` GitHub repo. Render detects `render.yaml` automatically.
2. When prompted, fill in:
   - `SEED_ADMIN_PASSWORD` — the password for your admin login on the deployed demo.
   - `CORS_ORIGIN` — `https://<your-username>.github.io` (no trailing path, no trailing slash).
3. Deploy. Once live, copy the service URL Render shows you (something like `https://physiocenter-server.onrender.com`).

### 3. Point the frontend at the backend

In your GitHub repo: **Settings → Secrets and variables → Actions → Variables** → add two **repository variables**:

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://physiocenter-server.onrender.com/api/v1` |
| `VITE_SOCKET_URL` | `https://physiocenter-server.onrender.com` |

(use your actual Render URL from step 2)

### 4. Enable GitHub Pages

**Settings → Pages → Source: GitHub Actions**. Then go to the **Actions** tab and re-run the "Deploy web app to GitHub Pages" workflow (it also runs automatically on every push to `main` that touches `web/`).

Your demo will be live at `https://<your-username>.github.io/physiocenter/`. Log in with the admin email/password you set in step 2 (default email is `admin@physiocenter.local` unless you changed `SEED_ADMIN_EMAIL`).

## Useful scripts

| Command | Where | What |
|---|---|---|
| `npm run migrate` | server | Apply DB migrations |
| `npm run seed:admin` | server | Create/verify the first admin login |
| `npm run dev` | server / web / scanner-agent | Start in watch mode |
| `npm run build` | server / web / scanner-agent | Production build |
