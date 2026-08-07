/**
 * Pulls Braves data from MLB Stats API into data/live.json
 * Player-first: hitters/pitchers with L5/L10/L20/L30 + recent game logs.
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
const WINDOWS = [5, 10, 20, 30];
const LOG_GAMES = 30;

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

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formHit(w) {
  if (!w) return 'neutral';
  const ab = Number(w.ab) || 0;
  const g = Number(w.g) || 0;
  if (ab < 6 && g < 3) return 'neutral';
  const ops = parseFloat(w.ops);
  const avg = parseFloat(w.avg);
  if ((!Number.isNaN(ops) && ops >= 0.9) || (!Number.isNaN(avg) && avg >= 0.32)) return 'hot';
  if ((!Number.isNaN(ops) && ops <= 0.65) || (!Number.isNaN(avg) && avg <= 0.2)) return 'cold';
  return 'neutral';
}

function formPitch(w) {
  if (!w) return 'neutral';
  const ip = parseFloat(w.ip) || 0;
  const g = Number(w.g) || 0;
  if (ip < 3 && g < 2) return 'neutral';
  const era = parseFloat(w.era);
  const whip = parseFloat(w.whip);
  if ((!Number.isNaN(era) && era <= 2.5) || (!Number.isNaN(whip) && whip <= 1.0)) return 'hot';
  if ((!Number.isNaN(era) && era >= 5.0) || (!Number.isNaN(whip) && whip >= 1.55)) return 'cold';
  return 'neutral';
}

function hitWindow(st) {
  return {
    g: st.gamesPlayed || 0,
    avg: st.avg || '.000',
    ops: st.ops || '.000',
    obp: st.obp || '.000',
    slg: st.slg || '.000',
    hr: st.homeRuns || 0,
    h: st.hits || 0,
    ab: st.atBats || 0,
    r: st.runs || 0,
    rbi: st.rbi || 0,
    bb: st.baseOnBalls || 0,
    so: st.strikeOuts || 0,
    sb: st.stolenBases || 0,
  };
}

function pitWindow(st) {
  return {
    g: st.gamesPlayed || 0,
    gs: st.gamesStarted || 0,
    ip: st.inningsPitched || '0.0',
    era: st.era || '—',
    whip: st.whip || '—',
    so: st.strikeOuts || 0,
    bb: st.baseOnBalls || 0,
    h: st.hits || 0,
    er: st.earnedRuns || 0,
    w: st.wins || 0,
    l: st.losses || 0,
    sv: st.saves || 0,
  };
}

async function loadWindows(group) {
  const byId = {};
  for (const n of WINDOWS) {
    const res = await get(
      `${BASE}/stats?stats=lastXGames&group=${group}&season=${SEASON}&teamIds=${BRAVES_ID}&sportId=1&gamesBack=${n}&playerPool=all`
    );
    for (const sp of res.stats?.[0]?.splits || []) {
      const id = sp.player.id;
      byId[id] ||= {
        id,
        name: sp.player.fullName,
        pos: sp.position?.abbreviation || (group === 'pitching' ? 'P' : 'DH'),
        windows: {},
      };
      byId[id].windows[`l${n}`] =
        group === 'hitting' ? hitWindow(sp.stat) : pitWindow(sp.stat);
      if (sp.position?.abbreviation) byId[id].pos = sp.position.abbreviation;
    }
  }
  return byId;
}

async function gameLog(id, group) {
  try {
    const res = await get(
      `${BASE}/people/${id}/stats?stats=gameLog&group=${group}&season=${SEASON}&sportId=1`
    );
    const splits = res.stats?.[0]?.splits || [];
    const recent = splits.slice(-LOG_GAMES);
    if (group === 'hitting') {
      return recent.map((g) => ({
        date: g.date,
        gamePk: g.game?.gamePk,
        opp: g.team?.id === BRAVES_ID ? g.opponent?.abbreviation || g.opponent?.name : g.team?.abbreviation,
        ab: g.stat.atBats || 0,
        r: g.stat.runs || 0,
        h: g.stat.hits || 0,
        hr: g.stat.homeRuns || 0,
        rbi: g.stat.rbi || 0,
        bb: g.stat.baseOnBalls || 0,
        so: g.stat.strikeOuts || 0,
        avg: g.stat.avg,
        ops: g.stat.ops,
      }));
    }
    return recent.map((g) => ({
      date: g.date,
      gamePk: g.game?.gamePk,
      opp: g.opponent?.abbreviation || g.opponent?.name,
      ip: g.stat.inningsPitched || '0.0',
      h: g.stat.hits || 0,
      r: g.stat.runs || 0,
      er: g.stat.earnedRuns || 0,
      bb: g.stat.baseOnBalls || 0,
      so: g.stat.strikeOuts || 0,
      era: g.stat.era,
      whip: g.stat.whip,
      decision: g.stat.note || '',
    }));
  } catch {
    return [];
  }
}

async function main() {
  console.log('Syncing MLB data (player-first)…');

  const teamsRes = await get(`${BASE}/teams?sportId=1&season=${SEASON}`);
  const teams = teamsRes.teams;
  const byId = abbrMap(teams);

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
      });
    }
  }

  for (const game of schedule.filter((g) => g.status === 'upcoming').slice(0, 5)) {
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
    record: atl ? `${atl.w}-${atl.l}` : '—',
    rank: atl ? `${ordinal(atl.rank)} · NL East` : 'NL East',
    streak: atl?.streak || '—',
    ...pulseExtra,
  };

  // Season stats
  const [hitSeason, pitSeason] = await Promise.all([
    get(
      `${BASE}/stats?stats=season&group=hitting&season=${SEASON}&teamIds=${BRAVES_ID}&sportId=1&playerPool=all&limit=50&order=desc&sortStat=plateAppearances`
    ),
    get(
      `${BASE}/stats?stats=season&group=pitching&season=${SEASON}&teamIds=${BRAVES_ID}&sportId=1&playerPool=all&limit=40&order=desc&sortStat=inningsPitched`
    ),
  ]);

  console.log('Loading trend windows…');
  const [hitWindows, pitWindows] = await Promise.all([
    loadWindows('hitting'),
    loadWindows('pitching'),
  ]);

  const hitters = [];
  for (const sp of hitSeason.stats?.[0]?.splits || []) {
    if ((sp.stat.plateAppearances || 0) < 75) continue;
    if (sp.position?.abbreviation === 'P') continue;
    const id = sp.player.id;
    const windows = hitWindows[id]?.windows || {};
    const form = formHit(windows.l10 || windows.l5);
    hitters.push({
      id,
      name: sp.player.fullName,
      pos: sp.position?.abbreviation || hitWindows[id]?.pos || 'DH',
      number: 0,
      season: hitWindow(sp.stat),
      windows,
      form,
      log: [],
    });
  }

  const pitchers = [];
  for (const sp of pitSeason.stats?.[0]?.splits || []) {
    const ip = parseFloat(sp.stat.inningsPitched) || 0;
    if (ip < 10) continue;
    const id = sp.player.id;
    const windows = pitWindows[id]?.windows || {};
    const form = formPitch(windows.l10 || windows.l5);
    const gs = sp.stat.gamesStarted || 0;
    pitchers.push({
      id,
      name: sp.player.fullName,
      pos: gs >= 5 ? 'SP' : (sp.stat.saves || 0) > 0 ? 'CL' : 'RP',
      number: 0,
      season: pitWindow(sp.stat),
      windows,
      form,
      log: [],
    });
  }

  console.log(`Loading game logs for ${hitters.length} hitters + ${pitchers.length} pitchers…`);
  // Batched to avoid hammering API
  async function fillLogs(list, group, concurrency = 6) {
    let i = 0;
    async function worker() {
      while (i < list.length) {
        const idx = i++;
        list[idx].log = await gameLog(list[idx].id, group);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }
  await fillLogs(hitters, 'hitting');
  await fillLogs(pitchers, 'pitching');

  // Sort defaults: hot first then by L10 OPS / ERA
  hitters.sort((a, b) => {
    const ao = parseFloat(a.windows.l10?.ops || a.season.ops || '0');
    const bo = parseFloat(b.windows.l10?.ops || b.season.ops || '0');
    return bo - ao;
  });
  pitchers.sort((a, b) => {
    const ae = parseFloat(a.windows.l10?.era || a.season.era || '99');
    const be = parseFloat(b.windows.l10?.era || b.season.era || '99');
    return ae - be;
  });

  // Legacy fields for older screens
  const todayLineup = hitters.slice(0, 9).map((h) => ({
    id: h.id,
    number: 0,
    name: h.name,
    pos: h.pos,
    avg: h.season.avg,
    ops: h.season.ops,
    hr: h.season.hr,
    rbi: h.season.rbi,
  }));
  const pitchingToday = {
    starter: pitchers.find((p) => p.pos === 'SP')
      ? {
          id: pitchers.find((p) => p.pos === 'SP').id,
          number: 0,
          name: pitchers.find((p) => p.pos === 'SP').name,
          pos: 'SP',
          era: pitchers.find((p) => p.pos === 'SP').season.era,
          whip: pitchers.find((p) => p.pos === 'SP').season.whip,
          so: pitchers.find((p) => p.pos === 'SP').season.so,
        }
      : null,
    bullpen: pitchers
      .filter((p) => p.pos !== 'SP')
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        number: 0,
        name: p.name,
        pos: p.pos,
        era: p.season.era,
        whip: p.season.whip,
        so: p.season.so,
      })),
  };

  const trends = hitters.map((h) => ({
    id: h.id,
    name: h.name,
    form: h.form,
    windows: {
      l10: h.windows.l10,
      l15: h.windows.l10,
      l30: h.windows.l30,
    },
  }));

  const leaders = [
    ...hitters.slice(0, 2).map((h) => ({
      name: h.name,
      stat: `${h.season.avg} · ${h.season.hr} HR · ${h.season.rbi} RBI`,
      role: h.pos,
    })),
    ...pitchers.slice(0, 2).map((p) => ({
      name: p.name,
      stat: `${p.season.w}-${p.season.l} · ${p.season.era} ERA · ${p.season.so} K`,
      role: p.pos,
    })),
  ];

  const payload = {
    syncedAt: new Date().toISOString(),
    dataAsOf: new Date().toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    teamPulse,
    keyStats: [],
    leaders,
    todayLineup,
    pitchingToday,
    standings: nlEast?.teams || [],
    divisions,
    wildCards,
    schedule,
    trends,
    hitters,
    pitchers,
  };

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(
    `Wrote ${OUT} hitters ${hitters.length} pitchers ${pitchers.length} games ${schedule.length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
