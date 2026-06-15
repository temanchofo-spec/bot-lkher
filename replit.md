# NERO Bot V2.5

A Facebook Messenger bot built on Node.js with uptime monitoring.

## Project Overview

NERO Bot V2.5 is a multi-feature Facebook Messenger bot that supports custom commands, event handling, SQLite/MongoDB databases, and an uptime monitoring server. Core bot files (`index.js`, `Nerov2.js`, `SYSTEM/login/login.js`) are obfuscated.

## Architecture

- **`preload.js`** — Runs before the bot (`node -r ./preload.js index.js`). Does two things:
  1. Immediately opens a minimal HTTP server on port 5000 so Replit's health check passes instantly.
  2. Patches `https.request` and intercepts `follow-redirects` to mock a 200 response for the deleted GitHub resource (`ntkhang03/resources-Nero-NEROBOT`) that the obfuscated login code fetches.
- **`node_modules/follow-redirects/index.js`** — Patched at `_performRequest` to serve a mock 200 HTML response for any URL containing `resources-Nero-NEROBOT` or `ntkhang03/resources` (the resource was deleted from GitHub, causing a 404 crash).
- **`index.js`** — Obfuscated bot entry point.
- **`Nerov2.js`** — Obfuscated bot engine.
- **`dashboard/app.js`** — Uptime monitoring server (started by the bot after FB login, port 5001).
- **`config.json`** — Main bot configuration.
- **`account.txt`** — Facebook appstate/cookie for bot login.
- **`SYSTEM/`** — Bot core: commands (`cmds/`), event handlers (`events/`), login logic (`login/`).
- **`API-Nero/`** — Custom Facebook Chat API wrapper.
- **`DB-NERO/`** — Database abstraction layer (SQLite via Sequelize, MongoDB via Mongoose).

## Running the Project

Workflow: `node -r ./preload.js index.js` on port 5000.

To configure the bot:
1. Get your Facebook account's appstate/cookie (browser extension like c3c-fbstate).
2. Paste the appstate JSON into `account.txt`.
3. Set `adminBot` in `config.json` to your Facebook UID.
4. Start the workflow.

## Key Configuration (`config.json`)

- `facebookAccount.email` / `password` — Optional, for auto cookie refresh.
- `adminBot` — Array of Facebook UIDs with admin access.
- `prefix` — Bot command prefix (default: `/`).
- `database.type` — `"sqlite"` (default) or `"mongodb"`.
- `serverUptime.port` — Bot's own uptime server port (set to **5001** to avoid conflict with preload's port-5000 server).

## Important Notes / Fixes Applied

1. **Port 5000 health check**: `preload.js` opens port 5000 immediately at startup. The bot's own uptime server uses port 5001.
2. **Deleted GitHub resource**: `node_modules/follow-redirects/index.js` is patched to mock URLs containing `resources-Nero-NEROBOT`. If you run `npm install`, this patch will be wiped — re-apply by editing `_performRequest` in that file to add the mock block.
3. **Linux-compatible scripts**: `package.json` scripts were changed from Windows-style `set NODE_ENV=` to Linux syntax.
4. **System deps**: util-linux, cairo, pango, libjpeg, giflib, pkg-config, pixman (required by `canvas` package).

## Dependencies

- Node.js 20
- System: util-linux, cairo, pango, libjpeg, giflib, pkg-config, pixman
- npm packages: express, sequelize, sqlite3, mongoose, axios, canvas, socket.io, and many others (installed with `--legacy-peer-deps`).

## Workflow

- **Start application**: `node -r ./preload.js index.js` → port 5000
