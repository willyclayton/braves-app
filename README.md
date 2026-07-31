# Braves

A sleek Atlanta Braves iPhone app — key stats, lineup, NL East standings, and schedule.

Optimized for every iPhone size (SE → Pro Max). Add to Home Screen on Safari for an app-like icon.

## Live

Hosted on Vercel after deploy.

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

Sample season data lives in `data/braves.ts`.

## Deploy

```bash
npm run build:web
npx vercel --prod
```
