import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    const mapSide = (side: typeof home) => {
      const batters = (side.battingOrder || []).map((pid: number) => {
        const p = side.players[`ID${pid}`];
        const b = p.stats?.batting || {};
        return {
          id: pid,
          name: p.person.fullName,
          number: p.jerseyNumber,
          pos: p.position?.abbreviation,
          ab: b.atBats,
          r: b.runs,
          h: b.hits,
          rbi: b.rbi,
          bb: b.baseOnBalls,
          so: b.strikeOuts,
          hr: b.homeRuns,
          avg: p.seasonStats?.batting?.avg,
        };
      });
      const pitchers = (side.pitchers || []).map((pid: number) => {
        const p = side.players[`ID${pid}`];
        const pit = p.stats?.pitching || {};
        return {
          id: pid,
          name: p.person.fullName,
          number: p.jerseyNumber,
          ip: pit.inningsPitched,
          h: pit.hits,
          r: pit.runs,
          er: pit.earnedRuns,
          bb: pit.baseOnBalls,
          so: pit.strikeOuts,
          decision: pit.note || '',
        };
      });
      return {
        teamId: side.team.id,
        abbr: gd.teams[side.team.id === home.team.id ? 'home' : 'away'].abbreviation,
        name: side.team.name,
        batters,
        pitchers,
      };
    };

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json({
      gamePk: Number(pk),
      status: gd.status.detailedState,
      date: gd.datetime.officialDate,
      venue: gd.venue.name,
      home: mapSide(home),
      away: mapSide(away),
      score: {
        home: linescore.teams.home.runs,
        away: linescore.teams.away.runs,
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
