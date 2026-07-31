import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapBatters, mapPitchers } from '../../lib/boxscore';

const BRAVES_ID = 144;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pk = req.query.pk;
  if (!pk || Array.isArray(pk)) {
    res.status(400).json({ error: 'Missing game pk' });
    return;
  }

  try {
    const feedRes = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${pk}/feed/live`);
    if (!feedRes.ok) {
      res.status(feedRes.status).json({ error: 'Game not found' });
      return;
    }
    const feed = await feedRes.json();
    const home = feed.liveData.boxscore.teams.home;
    const away = feed.liveData.boxscore.teams.away;
    const linescore = feed.liveData.linescore;
    const gd = feed.gameData;

    const mapSide = (side: typeof home, which: 'home' | 'away') => ({
      teamId: side.team.id,
      abbr: gd.teams[which].abbreviation,
      name: side.team.name,
      batters: mapBatters(side),
      pitchers: mapPitchers(side),
    });

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
    res.status(200).json({
      gamePk: Number(pk),
      status: gd.status.detailedState,
      date: gd.datetime.officialDate,
      venue: gd.venue.name,
      home: mapSide(home, 'home'),
      away: mapSide(away, 'away'),
      score: {
        home: linescore.teams.home.runs ?? 0,
        away: linescore.teams.away.runs ?? 0,
        homeHits: linescore.teams.home.hits ?? 0,
        awayHits: linescore.teams.away.hits ?? 0,
        homeErrors: linescore.teams.home.errors ?? 0,
        awayErrors: linescore.teams.away.errors ?? 0,
      },
      innings: (linescore.innings || []).map((inn: any, i: number) => ({
        num: i + 1,
        home: inn.home?.runs ?? 'X',
        away: inn.away?.runs ?? 'X',
      })),
      bravesSide: home.team.id === BRAVES_ID ? 'home' : 'away',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed' });
  }
}
