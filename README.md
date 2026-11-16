# make.fun — live bounties frontend

[![make.fun bounty](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/Khamami13/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/Khamami13/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A fast, read-only frontend for [make.fun](https://make.fun): a board of the live
bounties, a page per bounty with its live pot and rewards table, its leaderboard,
and any account's public profile — all from make.fun's public API, with no
sign-in, no build step and no third-party code.

## Surfaces

- **Bounty board** (`#/`): every bounty with its live pot, entry fee, countdown
  to the deadline and entry count. Filter Open/All, sort by deadline, reward or
  entries, and search by title or category. A bounty counts as open by its
  deadline, not its status alone.
- **Bounty page** (`#/bounty/<slug>`): summary, sponsor, live pot, entry fee,
  deadline, entry count, the rewards table for all 20 places with live amounts,
  and the full rules and description.
- **Leaderboard** (`#/bounty/<slug>/leaderboard`): ranked entries with judge win
  rate, validity and artifact size; each entrant links to their profile.
- **Public profile** (`#/profile/<handle>`): account info, wallet, competition
  record and every entry with its placement and prize.

Every page is reachable by its own URL (hash routes) and by links. API answers
are cached in memory and revalidated with ETag, and countdowns tick in place
without rebuilding the page.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. Node 22 or later, nothing to install.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library (`vendor/makefun-frontend.ts`,
unchanged from the kit).

## Layout

- `app/` — the frontend: `index.html`, `main.js` (router), `api.js` (cached
  API client), `views.js` (the four surfaces), `format.js`, `style.css`.
- `screenshots/` — three screenshots of the app running on live data
  (see `shots.json`).
- `main.ts` — the entry program, `serve.ts` — the local static server,
  `vendor/` — the kit's dossier library.
