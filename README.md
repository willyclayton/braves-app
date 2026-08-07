# Braves

A sleek Atlanta Braves iPhone app — key stats, lineup, NL East standings, and schedule.

Optimized for every iPhone size (SE → Pro Max). Add to Home Screen on Safari for an app-like icon.

## Live

**https://braves-app.vercel.app**

## Open on your iPhone

1. Open the Vercel URL in Safari
2. Share → **Add to Home Screen**
3. Launch from your home screen

### Local / Expo Go

```bash
npm install
npm start
```

Scan the QR code with Expo Go, or run `npm run web`.

## Tabs

- **Home** — next game, team pulse, leaders
- **Lineup** — batting order + starter / bullpen
- **Standings** — NL East race
- **Schedule** — recent results + upcoming games

Sample season data lives in `data/live.json` (imported via `data/braves.ts`).

## Daily stats

A GitHub Action runs `npm run sync` every morning at **7:07 AM Eastern**, commits refreshed `data/live.json`, and Vercel redeploys from `main`. You can also trigger **Daily stats update** manually from the Actions tab, or run locally:

```bash
npm run sync
```

## Deploy

```bash
npm run build:web
npx vercel --prod
```
