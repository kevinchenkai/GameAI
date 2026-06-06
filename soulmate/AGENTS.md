# SoulMate Agent Instructions

This file defines the hard project boundaries for future Codex/agent work on SoulMate. Follow it before making code, deployment, or server changes.

## Project Scope

- Local project path: `/Users/kk/Work/GameAI/soulmate/`
- Production URL: `https://g.ismayday.mobi/soulmate/`
- Production deploy path: `/www/wwwroot/g.ismayday.mobi/soulmate/`
- Parent site URL: `https://g.ismayday.mobi/`
- Parent site path: `/www/wwwroot/g.ismayday.mobi/`

SoulMate is a subproject under `/soulmate/`. The parent directory is the GameAI homepage. Do not modify, overwrite, delete, or sync files in the parent site unless the user explicitly asks for GameAI homepage work.

## Server Access

- SSH host: `ubuntu@211.159.177.55`
- Use SSH only for SoulMate deployment, API health checks, log inspection, and directory verification unless the user explicitly asks for broader GameAI server work.
- Do not write secrets, private keys, `.env` contents, `ADMIN_TOKEN`, DeepSeek keys, or database contents into this file or user-facing output.
- If a command needs to inspect server secrets, keep output redacted and do not print secret values.

## Deployment Rules

- Use `./deploy.sh` from `/Users/kk/Work/GameAI/soulmate/` for production deploys.
- `deploy.sh` must sync only to `$REMOTE_APP_DIR`, which defaults to `/www/wwwroot/g.ismayday.mobi/soulmate`.
- The rsync source should be `"$LOCAL_DIR/"` and the destination should be `"$REMOTE_HOST:$REMOTE_APP_DIR/"`.
- Never rsync SoulMate files to `$REMOTE_ROOT` (`/www/wwwroot/g.ismayday.mobi`).
- Never run `rsync --delete` against `$REMOTE_ROOT`.
- Do not copy SoulMate `index.html`, `app.js`, `settings.html`, `settings.js`, `styles.css`, or `images/` into the parent site root.
- Do not remove or alter parent-site files such as:
  - `/www/wwwroot/g.ismayday.mobi/index.html`
  - `/www/wwwroot/g.ismayday.mobi/.htaccess`
  - `/www/wwwroot/g.ismayday.mobi/404.html`
  - `/www/wwwroot/g.ismayday.mobi/star_fighter/`
  - `/www/wwwroot/g.ismayday.mobi/tavern/`
  - `/www/wwwroot/g.ismayday.mobi/version/`

If a deployment appears to require touching the parent root, stop and ask the user first.

## Production Data Protection

Never overwrite or delete production secrets or SQLite data.

`deploy.sh` must exclude:

- `.env`
- `api/data/`
- `*.sqlite`
- `*.sqlite-wal`
- `*.sqlite-shm`
- `.checks/`
- `node_modules/`
- `.git/`

The server-side DeepSeek config lives in `/www/wwwroot/g.ismayday.mobi/soulmate/api/.env`. Do not print secrets. Do not replace this file from local code.

SQLite data lives under `/www/wwwroot/g.ismayday.mobi/soulmate/api/data/`. Do not remove it during deploys.

## URL And Asset Rules

SoulMate pages are served from `/soulmate/`, so frontend asset paths should remain relative:

- `styles.css?v=...`
- `app.js?v=...`
- `settings.html`
- `settings.js?v=...`
- `images/...`

Do not change these to root paths like `/images/...`, `/app.js`, or `/styles.css`, because those would point at the GameAI homepage root.

When JS/CSS/assets change, update:

- `ASSET_VERSION` in `app.js`
- query parameters in `index.html`
- query parameters in `settings.html`

## API Rules

The frontend may call root API paths because Nginx exposes API routes globally:

- `/api/chat`
- `/api/uid/move`
- `/api/uid/reset`
- `/api/health`

Do not change these to `/soulmate/api/...` unless the server routing is intentionally redesigned.

## UID And Memory Rules

- Each client terminal has exactly one bound UID stored as `localStorage["soulmate.uid"]`.
- First load must generate a valid UID if none exists.
- Manual UID setting is a UID move, not account switching.
- Resetting current UID data must keep the UID itself and clear only that UID's private local/server data.
- UID format: 3-32 chars, lowercase letters, numbers, underscores, or hyphens; must start with a letter.
- `uid` is the player data boundary.
- `sessionId` may mirror `uid`, but must not replace `uid` for isolation.
- `/api/chat` must receive and persist `uid`.
- Memory retrieval may use global memories plus the current UID's memories only.
- Do not let one UID retrieve another UID's private memories.
- `memories.uid = NULL` and `corrections.uid = NULL` mean global rules.

## Prompt And Persona Rules

DeepSeek prompts and local fallback replies should preserve the current relationship profile:

- She is the user's real girlfriend, not an AI.
- They became a couple in junior year of university and have been stable for 6 years.
- They live together near Beijing Zhichun Road and have lived together for 1 year.
- The user works at ByteDance Seed.
- She works at Tencent as an AI product manager.
- They have a cat named Kangkang.
- She likes creative work, fitness discipline, food, travel, movies, and can be independent/strong but occasionally emo.
- Replies should usually follow `(action) reply content`.
- Keep replies concise, oral, warm, and realistic.
- Avoid hallucinated location drift. During normal work hours, both are usually at work; when at home, they are at the shared home.

## Frontend Verification

Before deploy after frontend changes, run:

```bash
node --check app.js
node --check settings.js
```

If layout or interaction changed, also verify manually or with Playwright:

- `index.html` loads.
- A UID is generated on first load.
- The settings button opens `settings.html`.
- Saving UID calls `/api/uid/move` before updating local `soulmate.uid`.
- Mobile-first layout still works at narrow widths.

## API Verification

Before deploy after API changes, run:

```bash
for f in api/src/*.js; do node --check "$f" || exit 1; done
```

For UID/memory changes, test at least:

- `/api/health` returns `db: "ok"`.
- `/api/chat` rejects missing or invalid `uid`.
- `/api/chat` persists `chat_messages.uid`.
- `/api/context/preview?uid=...` only returns global plus same-UID memories.
- `/api/uid/move` migrates data in a transaction.
- `/api/uid/move` returns `409` if target UID already has data.
- `/api/uid/reset` deletes only current-UID private data and keeps global memories intact.
- `/api/memory` without admin token returns `401`.

## Post-Deploy Checklist

After running `./deploy.sh`, verify:

```text
https://g.ismayday.mobi/                  -> GameAI homepage
https://g.ismayday.mobi/soulmate/         -> SoulMate game
https://g.ismayday.mobi/soulmate/settings.html
https://g.ismayday.mobi/soulmate/app.js?v=...
https://g.ismayday.mobi/soulmate/settings.js?v=...
https://g.ismayday.mobi/soulmate/styles.css?v=...
https://g.ismayday.mobi/soulmate/images/settings-gear.svg?v=...
https://g.ismayday.mobi/api/health
```

Also verify on the server:

```bash
sudo find /www/wwwroot/g.ismayday.mobi -maxdepth 1 \
  \( -name "app.js" -o -name "settings.html" -o -name "settings.js" -o -name "styles.css" -o -name "images" \) -print
```

The command above should print nothing. If it prints files, SoulMate assets have leaked into the GameAI homepage root and must be cleaned carefully.

## Documentation

When changing behavior, update the relevant docs:

- `prompt.txt` for product/prompt requirements and traceability.
- `README.md` for user-facing project summary.
- `api/README.md` for backend/API usage.
- `docs/soulmate_v2_design.md` for memory/UID architecture.

Keep docs aligned with code before deployment.
