# Braves

A sleek Atlanta Braves iPhone app — key stats, lineup, NL East standings, and schedule. Nothing extra.

## Open on your iPhone

### Option A — Expo Go (best)

1. Install **Expo Go** from the App Store
2. On this machine:

```bash
cd braves-app
npm start
```

3. Scan the QR code with your iPhone camera

### Option B — Web preview

```bash
cd braves-app
npm run web
```

Then open the local URL in Safari and use **Share → Add to Home Screen** for an app-like icon.

## Tabs

- **Home** — next game, team pulse, leaders
- **Lineup** — batting order + starter / bullpen
- **Standings** — NL East race
- **Schedule** — recent results + upcoming games

Sample season data is bundled so the UI works offline; swap `data/braves.ts` for live feeds when you’re ready.
