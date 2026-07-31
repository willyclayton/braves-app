/**
 * Pulls live Braves data from MLB Stats API into data/live.json
 * Run: node scripts/sync-mlb.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'live.json');
const BRAVES_ID = 144;
const SEASON = 2026;
const BASE = 'https://statsapi.mlb.com/api/v1';

const DIVISION_NAMES = {
  200: 'West',
  201: 'East',
  202: 'Central',
  203: 'West',
  204: 'East',
  205: 'Central',
};

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function abbrMap(teams) {
  return Object.fromEntries(teams.map((t) => [t.id, t.abbreviation]));
}

function rankMetric(rows, metric, reverse = true) {
  const ordered = [...rows].sort((a, b) =>
    reverse ? b[metric] - a[metric] : a[metric] - b[metric]
  );
  const idx = ordered.findIndex((r) => r.id === BRAVES_ID);
  const leader = ordered[0];
  const us = ordered[idx];
  return {
    rank: idx + 1,
    of: ordered.length,
    value: us[metric],
    leaderAbbr: leader.abbr,
    leaderValue: leader[metric],
  };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatRank(rank, of) {
  if (rank === 1) return 'Best in MLB';
  if (rank === of) return `Last in MLB`;
  return `${ordinal(rank)} in MLB`;
}

async function main() {
  console.log('Syncing MLB data…');

  const teamsRes = await get(`${BASE}/teams?sportId=1&season=${SEASON}`);
  const teams = teamsRes.teams;
  const byId = abbrMap(teams);
  const teamMeta = Object.fromEntries(
    teams.map((t) => [
      t.abbreviation,
      { id: t.id, abbr: t.abbreviation, name: t.name, leagueId: t.league.id, divisionId: t.division.id },
    ])
  );

  const scheduleRes = await get(
    `${BASE}/schedule?teamId=${BRAVES_ID}&season=${SEASON}&sportId=1&gameType=R`
  );
  const schedule = [];
  for (const day of scheduleRes.dates || []) {
    for (const g of day.games) {
      if (g.status.detailedState === 'Postponed' && g.teams.home.score == null) continue;
      const home = g.teams.home;
      const away = g.teams.away;
      const isHome = home.team.id === BRAVES_ID;
      const us = isHome ? home : away;
      const opp = isHome ? away : home;
      const final = g.status.abstractGameState === 'Final' && us.score != null;
      const live = g.status.abstractGameState === 'Live';
      schedule.push({
        id: String(g.gamePk),
        gamePk: g.gamePk,
        date: g.officialDate,
        gameDate: g.gameDate,
        time: final
          ? 'Final'
          : new Date(g.gameDate).toLocaleTimeString('en-US', {
              timeZone: 'America/New_York',
              hour: 'numeric',
              minute: '2-digit',
            }),
        opponent: opp.team.name,
        opponentAbbr: byId[opp.team.id] || opp.team.name,
        opponentId: opp.team.id,
        home: isHome,
        status: live ? 'live' : final ? 'final' : 'upcoming',
        bravesScore: us.score ?? undefined,
        oppScore: opp.score ?? undefined,
        venue: g.venue?.name || '',
        tv: undefined,
        starter: undefined,
      });
    }
  }

  // Probable starters for next few upcoming
  for (const game of schedule.filter((g) => g.status === 'upcoming').slice(0, 8)) {
    try {
      const feed = await get(`${BASE}.1/game/${game.gamePk}/feed/live`);
      const prob = feed.gameData?.probablePitchers || {};
      const pitcher = game.home ? prob.home : prob.away;
      if (pitcher?.fullName) {
        const parts = pitcher.fullName.split(' ');
        game.starter = parts[parts.length - 1];
      }
    } catch {
      /* ignore */
    }
  }

  const [hitStats, pitStats] = await Promise.all([
    get(`${BASE}/teams/stats?stats=season&group=hitting&season=${SEASON}&sportIds=1`),
    get(`${BASE}/teams/stats?stats=season&group=pitching&season=${SEASON}&sportIds=1`),
  ]);
  const hitSplits = hitStats.stats[0].splits;
  const pitSplits = pitStats.stats[0].splits;
  const rows = hitSplits.map((h) => {
    const p = pitSplits.find((x) => x.team.id === h.team.id);
    return {
      id: h.team.id,
      abbr: byId[h.team.id],
      avg: parseFloat(h.stat.avg),
      ops: parseFloat(h.stat.ops),
      hr: parseInt(h.stat.homeRuns, 10),
      era: parseFloat(p.stat.era),
    };
  });
  const atlHit = hitSplits.find((h) => h.team.id === BRAVES_ID).stat;
  const atlPit = pitSplits.find((p) => p.team.id === BRAVES_ID).stat;

  const kpiDefs = [
    { key: 'avg', label: 'AVG', value: atlHit.avg, reverse: true },
    { key: 'ops', label: 'OPS', value: atlHit.ops, reverse: true },
    { key: 'era', label: 'ERA', value: atlPit.era, reverse: false },
    { key: 'hr', label: 'HR', value: String(atlHit.homeRuns), reverse: true },
  ];
  const formatStat = (label, v) => {
    if (v == null || Number.isNaN(v)) return String(v);
    if (label === 'HR') return String(Math.round(Number(v)));
    if (label === 'AVG' || label === 'OPS') {
      const s = Number(v).toFixed(3);
      return s.replace(/^0/, '');
    }
    if (label === 'ERA') return Number(v).toFixed(2);
    return String(v);
  };
  const keyStats = kpiDefs.map((k) => {
    const r = rankMetric(rows, k.key, k.reverse);
    return {
      label: k.label,
      value: formatStat(k.label, k.value),
      detail: formatRank(r.rank, r.of),
      rank: r.rank,
      of: r.of,
      leaderAbbr: r.leaderAbbr,
      leaderValue: formatStat(k.label, r.leaderValue),
    };
  });

  const standingsRes = await get(
    `${BASE}/standings?leagueId=103,104&season=${SEASON}&standingsTypes=regularSeason,wildCard`
  );
  const divisions = [];
  const wildCards = [];
  for (const rec of standingsRes.records) {
    const rowsOut = rec.teamRecords.map((tr) => ({
      team: tr.team.name,
      abbr: byId[tr.team.id] || tr.team.name,
      teamId: tr.team.id,
      w: tr.wins,
      l: tr.losses,
      pct: tr.winningPercentage,
      gb: tr.gamesBack === '-' ? '—' : tr.gamesBack,
      wcgb: tr.wildCardGamesBack === '-' ? '—' : tr.wildCardGamesBack,
      streak: tr.streak?.streakCode || '',
      rank: Number(tr.divisionRank || tr.leagueRank || 0),
      highlight: tr.team.id === BRAVES_ID,
      leagueId: rec.league.id,
      divisionId: rec.division?.id,
    }));
    if (rec.standingsType === 'regularSeason') {
      divisions.push({
        leagueId: rec.league.id,
        league: rec.league.id === 104 ? 'NL' : 'AL',
        divisionId: rec.division?.id,
        division: DIVISION_NAMES[rec.division?.id] || 'Division',
        teams: rowsOut,
      });
    } else {
      wildCards.push({
        leagueId: rec.league.id,
        league: rec.league.id === 104 ? 'NL' : 'AL',
        teams: rowsOut,
      });
    }
  }

  // Pulse from NL East
  const nlEast = divisions.find((d) => d.league === 'NL' && d.division.includes('East'));
  const atl = nlEast?.teams.find((t) => t.highlight);
  const standingsPulse = await get(
    `${BASE}/standings?leagueId=104&season=${SEASON}&standingsTypes=regularSeason`
  );
  let pulseExtra = { lastTen: '—', home: '—', away: '—', runDiff: '—' };
  for (const rec of standingsPulse.records) {
    const tr = rec.teamRecords.find((t) => t.team.id === BRAVES_ID);
    if (!tr) continue;
    const splits = tr.records?.splitRecords || [];
    const l10 = splits.find((s) => s.type === 'lastTen');
    const home = splits.find((s) => s.type === 'home');
    const away = splits.find((s) => s.type === 'away');
    pulseExtra = {
      lastTen: l10 ? `${l10.wins}-${l10.losses}` : '—',
      home: home ? `${home.wins}-${home.losses}` : '—',
      away: away ? `${away.wins}-${away.losses}` : '—',
      runDiff: tr.runDifferential >= 0 ? `+${tr.runDifferential}` : String(tr.runDifferential),
    };
  }

  const teamPulse = {
    record: atl ? `${atl.w}-${atl.l}` : `${atlPit.wins}-${atlPit.losses}`,
    rank: atl ? `${ordinal(atl.rank)} · NL East` : 'NL East',
    streak: atl?.streak || '—',
    ...pulseExtra,
  };

  // Leaders season
  const hitLeaders = await get(
    `${BASE}/stats?stats=season&group=hitting&season=${SEASON}&teamIds=${BRAVES_ID}&sportId=1&playerPool=all&limit=8&order=desc&sortStat=ops`
  );
  const pitLeaders = await get(
    `${BASE}/stats?stats=season&group=pitching&season=${SEASON}&teamIds=${BRAVES_ID}&sportId=1&playerPool=all&limit=8&order=desc&sortStat=strikeOuts`
  );
  const leaders = [];
  // Require a meaningful sample so cup-of-coffee .1000 AVGs don't lead the hub
  const hitLeaderRows = (hitLeaders.stats[0]?.splits || []).filter(
    (sp) =>
      (sp.stat.plateAppearances || 0) >= 100 &&
      sp.position?.abbreviation !== 'P' &&
      (sp.stat.atBats || 0) >= 75
  );
  for (const sp of hitLeaderRows.slice(0, 2)) {
    const st = sp.stat;
    leaders.push({
      name: sp.player.fullName,
      stat: `${st.avg} · ${st.homeRuns} HR · ${st.rbi} RBI`,
      role: sp.position?.abbreviation || 'BAT',
    });
  }
  const pitLeaderRows = (pitLeaders.stats[0]?.splits || []).filter(
    (sp) => (sp.stat.inningsPitched || 0) >= 20 || (sp.stat.gamesStarted || 0) >= 5
  );
  for (const sp of pitLeaderRows.slice(0, 2)) {
    const st = sp.stat;
    const role = st.gamesStarted > 0 ? 'SP' : st.saves > 0 ? 'CL' : 'RP';
    leaders.push({
      name: sp.player.fullName,
      stat:
        role === 'CL'
          ? `${st.saves} SV · ${st.era} ERA`
          : `${st.wins}-${st.losses} · ${st.era} ERA · ${st.strikeOuts} K`,
      role,
    });
  }

  // Lineup: prefer next game card; else most recent final batting order
  let todayLineup = [];
  let pitchingToday = { starter: null, bullpen: [] };
  const recentFinal = [...schedule].reverse().find((g) => g.status === 'final');
  const nextUp = schedule.find((g) => g.status === 'upcoming');

  async function loadLineupFromGame(gamePk) {
    const feed = await get(`${BASE}.1/game/${gamePk}/feed/live`);
    const side =
      feed.liveData.boxscore.teams.home.team.id === BRAVES_ID ? 'home' : 'away';
    const teamBox = feed.liveData.boxscore.teams[side];
    const order = teamBox.battingOrder || [];
    return {
      feed,
      lineup: order.map((pid) => {
        const p = teamBox.players[`ID${pid}`];
        const season = p.seasonStats?.batting || {};
        return {
          id: pid,
          number: Number(p.jerseyNumber) || 0,
          name: p.person.fullName,
          pos: p.position.abbreviation,
          bats: p.person.batSide?.code,
          avg: season.avg,
          ops: season.ops,
          hr: season.homeRuns,
          rbi: season.rbi,
        };
      }),
    };
  }

  try {
    if (nextUp?.gamePk) {
      const { feed, lineup } = await loadLineupFromGame(nextUp.gamePk);
      if (lineup.length) todayLineup = lineup;
      const prob = feed.gameData?.probablePitchers || {};
      const starterP = nextUp.home ? prob.home : prob.away;
      if (starterP) {
        const pstats = await get(
          `${BASE}/people/${starterP.id}/stats?stats=season&group=pitching&season=${SEASON}`
        );
        const st = pstats.stats?.[0]?.splits?.[0]?.stat || {};
        pitchingToday.starter = {
          id: starterP.id,
          number: 0,
          name: starterP.fullName,
          pos: 'SP',
          era: st.era,
          whip: st.whip,
          so: st.strikeOuts,
        };
      }
    }
    if (!todayLineup.length && recentFinal?.gamePk) {
      const { lineup } = await loadLineupFromGame(recentFinal.gamePk);
      todayLineup = lineup;
    }
  } catch (e) {
    console.warn('lineup fetch', e.message);
  }

  // Fallback: qualified hitters only (min 50 PA-ish via AB)
  if (!todayLineup.length) {
    todayLineup = (hitLeaders.stats[0]?.splits || [])
      .filter((sp) => (sp.stat.atBats || 0) >= 50 && sp.position?.abbreviation !== 'P')
      .slice(0, 9)
      .map((sp) => ({
        id: sp.player.id,
        number: 0,
        name: sp.player.fullName,
        pos: sp.position?.abbreviation || 'DH',
        avg: sp.stat.avg,
        ops: sp.stat.ops,
        hr: sp.stat.homeRuns,
        rbi: sp.stat.rbi,
      }));
  }

  // Trends L10 / L15 / L30
  const trends = {};
  for (const n of [10, 15, 30]) {
    const res = await get(
      `${BASE}/stats?stats=lastXGames&group=hitting&season=${SEASON}&teamIds=${BRAVES_ID}&sportId=1&gamesBack=${n}&playerPool=all`
    );
    for (const sp of res.stats[0]?.splits || []) {
      const id = sp.player.id;
      trends[id] ||= { id, name: sp.player.fullName, windows: {} };
      const st = sp.stat;
      const ops = parseFloat(st.ops || '0');
      const avg = parseFloat(st.avg || '0');
      trends[id].windows[`l${n}`] = {
        g: st.gamesPlayed,
        avg: st.avg,
        ops: st.ops,
        hr: st.homeRuns,
        h: st.hits,
        ab: st.atBats,
      };
      // form from L15 primarily
      if (n === 15) {
        let form = 'neutral';
        if (ops >= 0.9 || avg >= 0.32) form = 'hot';
        else if (ops <= 0.65 || avg <= 0.2) form = 'cold';
        trends[id].form = form;
      }
    }
  }

  // Bullpen leaders
  const bullpen = (pitLeaders.stats[0]?.splits || [])
    .filter((sp) => (sp.stat.gamesStarted || 0) === 0)
    .slice(0, 3)
    .map((sp) => ({
      id: sp.player.id,
      number: 0,
      name: sp.player.fullName,
      pos: (sp.stat.saves || 0) > 0 ? 'CL' : 'RP',
      era: sp.stat.era,
      whip: sp.stat.whip,
      so: sp.stat.strikeOuts,
    }));
  pitchingToday.bullpen = bullpen;

  if (!pitchingToday.starter) {
    const sp = (pitLeaders.stats[0]?.splits || []).find((x) => (x.stat.gamesStarted || 0) > 0);
    if (sp) {
      pitchingToday.starter = {
        id: sp.player.id,
        number: 0,
        name: sp.player.fullName,
        pos: 'SP',
        era: sp.stat.era,
        whip: sp.stat.whip,
        so: sp.stat.strikeOuts,
      };
    }
  }

  const payload = {
    syncedAt: new Date().toISOString(),
    dataAsOf: new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    teamPulse,
    keyStats,
    leaders,
    todayLineup,
    pitchingToday,
    standings: nlEast?.teams || [],
    divisions,
    wildCards,
    schedule,
    trends: Object.values(trends),
    teamMeta,
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log('Wrote', OUT, 'games', schedule.length, 'syncedAt', payload.syncedAt);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
