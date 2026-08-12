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

async function get(url, { retries = 4, baseDelayMs = 800 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
      const retriable = res.status === 429 || res.status >= 500;
      lastErr = new Error(`${res.status} ${url}`);
      if (!retriable || attempt === retries) throw lastErr;
    } catch (err) {
      lastErr = err;
      if (attempt === retries) throw lastErr;
    }
    const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
    console.warn(`Retry ${attempt + 1}/${retries} after ${delay}ms — ${lastErr.message}`);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastErr;
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
  const h = Number(w.h) || 0;
  const hr = Number(w.hr) || 0;
  const rbi = Number(w.rbi) || 0;
  const ops = parseFloat(w.ops);
  const avg = parseFloat(w.avg);
  const slg = parseFloat(w.slg);
  if (ab < 8 && g < 3) return 'neutral';
  const hasOps = !Number.isNaN(ops);
  const iso = !Number.isNaN(slg) && !Number.isNaN(avg) ? slg - avg : null;
  const powerSurge = hr >= 3 || (hr >= 2 && ab <= 25) || (iso != null && iso >= 0.25);
  const emptyBat = hr === 0 && rbi <= 1 && h <= Math.max(1, Math.floor(ab * 0.12));
  if (hasOps && ops >= 0.85) return 'hot';
  if (hasOps && ops >= 0.78 && (powerSurge || (!Number.isNaN(avg) && avg >= 0.28))) return 'hot';
  if (powerSurge && hasOps && ops >= 0.75) return 'hot';
  if (!hasOps && !Number.isNaN(avg) && avg >= 0.33 && ab >= 12) return 'hot';
  if (hasOps && ops <= 0.5 && emptyBat) return 'cold';
  if (hasOps && ops <= 0.55 && emptyBat && ab >= 12) return 'cold';
  if (hasOps && ops <= 0.6 && emptyBat && !Number.isNaN(avg) && avg <= 0.15 && ab >= 15) {
    return 'cold';
  }
  return 'neutral';
}

function formPitch(w) {
  if (!w) return 'neutral';
  const ip = parseFloat(w.ip) || 0;
  const g = Number(w.g) || 0;
  if (ip < 3 && g < 2) return 'neutral';
  const era = parseFloat(w.era);
  const whip = parseFloat(w.whip);
  const so = Number(w.so) || 0;
  const bb = Number(w.bb) || 0;
  const er = Number(w.er) || 0;
  const hasEra = !Number.isNaN(era);
  const hasWhip = !Number.isNaN(whip);
  const kPerIp = ip > 0 ? so / ip : 0;
  if ((hasEra && era <= 2.25) || (hasWhip && whip <= 0.95)) return 'hot';
  if (hasEra && era <= 3.0 && hasWhip && whip <= 1.15) return 'hot';
  if (hasEra && era <= 3.25 && kPerIp >= 1.2 && er <= Math.max(2, ip * 0.4)) return 'hot';
  if ((hasEra && era >= 6.5) || (hasWhip && whip >= 1.7)) return 'cold';
  if (hasEra && era >= 5.5 && hasWhip && whip >= 1.5) return 'cold';
  if (hasEra && era >= 5.0 && bb >= so && ip >= 4) return 'cold';
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
    doubles: st.doubles || 0,
    triples: st.triples || 0,
  };
}

function parseIpOuts(ip) {
  const [w, f] = String(ip || '0').split('.');
  return Number(w || 0) * 3 + Number(f || 0);
}

function rateStr(value, digits = 3) {
  if (!Number.isFinite(value) || value < 0) return digits === 3 ? '.000' : '0.00';
  const s = value.toFixed(digits);
  if (digits === 3 && s.startsWith('0')) return s.slice(1);
  return s;
}

function hitWindowFromLog(log, games) {
  if (!log?.length || games < 1) return null;
  const slice = log.slice(-games);
  let ab = 0;
  let h = 0;
  let hr = 0;
  let r = 0;
  let rbi = 0;
  let bb = 0;
  let so = 0;
  let sb = 0;
  let doubles = 0;
  let triples = 0;
  let hbp = 0;
  let sf = 0;
  let tb = 0;
  let hasTb = false;
  for (const g of slice) {
    ab += Number(g.ab) || 0;
    h += Number(g.h) || 0;
    hr += Number(g.hr) || 0;
    r += Number(g.r) || 0;
    rbi += Number(g.rbi) || 0;
    bb += Number(g.bb) || 0;
    so += Number(g.so) || 0;
    sb += Number(g.sb) || 0;
    doubles += Number(g.doubles) || 0;
    triples += Number(g.triples) || 0;
    hbp += Number(g.hbp) || 0;
    sf += Number(g.sf) || 0;
    if (g.tb != null) {
      hasTb = true;
      tb += Number(g.tb) || 0;
    }
  }
  if (!hasTb) {
    const singles = Math.max(0, h - doubles - triples - hr);
    tb = singles + 2 * doubles + 3 * triples + 4 * hr;
  }
  const obpDen = ab + bb + hbp + sf;
  const avg = ab > 0 ? h / ab : 0;
  const obp = obpDen > 0 ? (h + bb + hbp) / obpDen : 0;
  const slg = ab > 0 ? tb / ab : 0;
  return {
    g: slice.length,
    avg: rateStr(avg),
    ops: rateStr(obp + slg),
    obp: rateStr(obp),
    slg: rateStr(slg),
    hr,
    h,
    ab,
    r,
    rbi,
    bb,
    so,
    sb,
    doubles,
    triples,
  };
}

function pitWindowFromLog(log, games) {
  if (!log?.length || games < 1) return null;
  const slice = log.slice(-games);
  let outs = 0;
  let h = 0;
  let r = 0;
  let er = 0;
  let bb = 0;
  let so = 0;
  for (const g of slice) {
    outs += parseIpOuts(g.ip);
    h += Number(g.h) || 0;
    r += Number(g.r) || 0;
    er += Number(g.er) || 0;
    bb += Number(g.bb) || 0;
    so += Number(g.so) || 0;
  }
  const ip = outs / 3;
  const era = ip > 0 ? (er * 9) / ip : 0;
  const whip = ip > 0 ? (h + bb) / ip : 0;
  const whole = Math.floor(outs / 3);
  const rem = outs % 3;
  return {
    g: slice.length,
    ip: `${whole}.${rem}`,
    era: ip > 0 ? era.toFixed(2) : '—',
    whip: ip > 0 ? whip.toFixed(2) : '—',
    so,
    bb,
    h,
    er,
  };
}

function windowsFromLog(log, group) {
  const windows = {};
  const build = group === 'hitting' ? hitWindowFromLog : pitWindowFromLog;
  for (const n of WINDOWS) {
    const w = build(log, n);
    if (w) windows[`l${n}`] = w;
  }
  return windows;
}

function numStat(v) {
  if (v == null || v === '' || v === '—') return NaN;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/^–/, '-'));
  return Number.isFinite(n) ? n : NaN;
}

/** Competition ranking (ties share the best place: 1,1,3). */
function buildRankMap(rows, getValue, { higherBetter = true } = {}) {
  const scored = [];
  for (const row of rows) {
    const value = getValue(row);
    if (!Number.isFinite(value)) continue;
    scored.push({ id: row.player.id, value });
  }
  scored.sort((a, b) => (higherBetter ? b.value - a.value : a.value - b.value));
  const ranks = new Map();
  let i = 0;
  while (i < scored.length) {
    let j = i + 1;
    while (j < scored.length && scored[j].value === scored[i].value) j++;
    const rank = i + 1;
    for (let k = i; k < j; k++) ranks.set(scored[k].id, rank);
    i = j;
  }
  return ranks;
}

const HIT_RANK_DEFS = [
  { key: 'hr', label: 'HR', format: 'int', get: (s) => Number(s.homeRuns) || 0, higherBetter: true },
  { key: 'doubles', label: '2B', format: 'int', get: (s) => Number(s.doubles) || 0, higherBetter: true },
  { key: 'rbi', label: 'RBI', format: 'int', get: (s) => Number(s.rbi) || 0, higherBetter: true },
  { key: 'r', label: 'Runs', format: 'int', get: (s) => Number(s.runs) || 0, higherBetter: true },
  { key: 'h', label: 'Hits', format: 'int', get: (s) => Number(s.hits) || 0, higherBetter: true },
  { key: 'sb', label: 'SB', format: 'int', get: (s) => Number(s.stolenBases) || 0, higherBetter: true },
  { key: 'bb', label: 'BB', format: 'int', get: (s) => Number(s.baseOnBalls) || 0, higherBetter: true },
  {
    key: 'avg',
    label: 'AVG',
    format: 'avg',
    get: (s) => numStat(s.avg),
    higherBetter: true,
    rate: true,
  },
  {
    key: 'ops',
    label: 'OPS',
    format: 'ops',
    get: (s) => numStat(s.ops),
    higherBetter: true,
    rate: true,
  },
  {
    key: 'obp',
    label: 'OBP',
    format: 'avg',
    get: (s) => numStat(s.obp),
    higherBetter: true,
    rate: true,
  },
  {
    key: 'slg',
    label: 'SLG',
    format: 'avg',
    get: (s) => numStat(s.slg),
    higherBetter: true,
    rate: true,
  },
];

const PITCH_RANK_DEFS = [
  {
    key: 'era',
    label: 'ERA',
    format: 'era',
    get: (s) => numStat(s.era),
    higherBetter: false,
    rate: true,
  },
  {
    key: 'whip',
    label: 'WHIP',
    format: 'whip',
    get: (s) => numStat(s.whip),
    higherBetter: false,
    rate: true,
  },
  { key: 'so', label: 'K', format: 'int', get: (s) => Number(s.strikeOuts) || 0, higherBetter: true },
  { key: 'w', label: 'W', format: 'int', get: (s) => Number(s.wins) || 0, higherBetter: true },
  { key: 'sv', label: 'SV', format: 'int', get: (s) => Number(s.saves) || 0, higherBetter: true },
  { key: 'holds', label: 'HLD', format: 'int', get: (s) => Number(s.holds) || 0, higherBetter: true },
  {
    key: 'ip',
    label: 'IP',
    format: 'ip',
    get: (s) => parseIpOuts(s.inningsPitched) / 3,
    higherBetter: true,
  },
];

function formatRankValue(format, raw, stat, key) {
  if (format === 'int') return String(Math.round(raw));
  if (format === 'avg') {
    if (key === 'obp') return stat.obp || String(raw);
    if (key === 'slg') return stat.slg || String(raw);
    return stat.avg || String(raw);
  }
  if (format === 'ops') return stat.ops || String(raw);
  if (format === 'era') return stat.era || String(raw);
  if (format === 'whip') return stat.whip || String(raw);
  if (format === 'ip') return stat.inningsPitched || String(raw);
  return String(raw);
}

function rankingsForPlayer(playerId, defs, mlbRows, nlRows, teamGames) {
  const minPa = Math.max(1, Math.floor(3.1 * teamGames));
  const minIpOuts = Math.max(3, teamGames * 3);
  const primary = new Set([
    'hr',
    'doubles',
    'rbi',
    'r',
    'h',
    'avg',
    'ops',
    'obp',
    'slg',
    'era',
    'whip',
    'so',
    'w',
    'sv',
    'ip',
  ]);
  const out = [];
  for (const def of defs) {
    const qualify =
      def.qualify ||
      (def.rate
        ? def.key === 'era' || def.key === 'whip'
          ? (s) => parseIpOuts(s.inningsPitched) >= minIpOuts
          : (s) => (Number(s.plateAppearances) || 0) >= minPa
        : null);
    const mlbPool = qualify ? mlbRows.filter((r) => qualify(r.stat)) : mlbRows;
    const nlPool = qualify ? nlRows.filter((r) => qualify(r.stat)) : nlRows;
    const mlbRanks = buildRankMap(mlbPool, (r) => def.get(r.stat), {
      higherBetter: def.higherBetter,
    });
    const nlRanks = buildRankMap(nlPool, (r) => def.get(r.stat), {
      higherBetter: def.higherBetter,
    });
    const mlb = mlbRanks.get(playerId);
    const nl = nlRanks.get(playerId);
    if (mlb == null && nl == null) continue;
    const row = mlbRows.find((r) => r.player.id === playerId);
    if (!row) continue;
    const raw = def.get(row.stat);
    if (!Number.isFinite(raw)) continue;
    // Skip counting stats that are zero — not meaningful for ranking UI
    if (def.format === 'int' && raw === 0) continue;
    // Secondary counting stats (SB, BB, HLD) only when near the leaderboard
    if (!primary.has(def.key) && (mlb == null || mlb > 40) && (nl == null || nl > 25)) {
      continue;
    }
    out.push({
      key: def.key,
      label: def.label,
      value: formatRankValue(def.format, raw, row.stat, def.key),
      mlb: mlb ?? null,
      nl: nl ?? null,
      mlbOf: mlbPool.length,
      nlOf: nlPool.length,
    });
  }
  return out;
}

async function loadSeasonSplits(group) {
  const res = await get(
    `${BASE}/stats?stats=season&group=${group}&season=${SEASON}&sportIds=1&limit=1000&playerPool=all`
  );
  return res.stats?.[0]?.splits || [];
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

function splitOppAbbr(g, teamAbbrById) {
  const vsBraves = g.team?.id === BRAVES_ID;
  const opp = vsBraves ? g.opponent : g.team || g.opponent;
  if (opp?.id != null && teamAbbrById[opp.id]) return teamAbbrById[opp.id];
  if (opp?.abbreviation) return opp.abbreviation;
  return opp?.name || '';
}

async function gameLog(id, group, teamAbbrById = {}) {
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
        opp: splitOppAbbr(g, teamAbbrById),
        ab: g.stat.atBats || 0,
        r: g.stat.runs || 0,
        h: g.stat.hits || 0,
        hr: g.stat.homeRuns || 0,
        rbi: g.stat.rbi || 0,
        bb: g.stat.baseOnBalls || 0,
        so: g.stat.strikeOuts || 0,
        sb: g.stat.stolenBases || 0,
        doubles: g.stat.doubles || 0,
        triples: g.stat.triples || 0,
        hbp: g.stat.hitByPitch || 0,
        sf: g.stat.sacFlies || 0,
        tb: g.stat.totalBases,
        avg: g.stat.avg,
        ops: g.stat.ops,
      }));
    }
    return recent.map((g) => ({
      date: g.date,
      gamePk: g.game?.gamePk,
      opp: splitOppAbbr(g, teamAbbrById),
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

  // Active 26-man roster — drop anyone no longer with the club
  const rosterRes = await get(
    `${BASE}/teams/${BRAVES_ID}/roster?rosterType=active&season=${SEASON}`
  );
  const rosterById = new Map();
  for (const entry of rosterRes.roster || []) {
    const id = entry.person?.id;
    if (id == null) continue;
    rosterById.set(id, {
      name: entry.person.fullName,
      pos: entry.position?.abbreviation || 'DH',
      number: Number(entry.jerseyNumber) || 0,
    });
  }
  console.log(`Active roster: ${rosterById.size}`);

  // Season stats (playerPool=all so recent acquisitions still appear; filter to roster below)
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
  const seenHitters = new Set();
  for (const sp of hitSeason.stats?.[0]?.splits || []) {
    const id = sp.player.id;
    if (!rosterById.has(id)) continue;
    if (sp.position?.abbreviation === 'P' || rosterById.get(id).pos === 'P') continue;
    seenHitters.add(id);
    const roster = rosterById.get(id);
    const windows = hitWindows[id]?.windows || {};
    const form = formHit(windows.l10 || windows.l5);
    hitters.push({
      id,
      name: sp.player.fullName || roster.name,
      pos: sp.position?.abbreviation || hitWindows[id]?.pos || roster.pos || 'DH',
      number: roster.number,
      season: hitWindow(sp.stat),
      windows,
      form,
      log: [],
    });
  }
  // Roster position players with no season split yet (very new call-ups)
  for (const [id, roster] of rosterById) {
    if (roster.pos === 'P' || seenHitters.has(id)) continue;
    const windows = hitWindows[id]?.windows || {};
    hitters.push({
      id,
      name: roster.name,
      pos: roster.pos,
      number: roster.number,
      season: hitWindow({}),
      windows,
      form: formHit(windows.l10 || windows.l5),
      log: [],
    });
  }

  const pitchers = [];
  const seenPitchers = new Set();
  for (const sp of pitSeason.stats?.[0]?.splits || []) {
    const id = sp.player.id;
    if (!rosterById.has(id)) continue;
    // Skip position players who show up in pitching leaderboards
    if (rosterById.get(id).pos !== 'P') continue;
    seenPitchers.add(id);
    const roster = rosterById.get(id);
    const windows = pitWindows[id]?.windows || {};
    const form = formPitch(windows.l10 || windows.l5);
    const gs = sp.stat.gamesStarted || 0;
    pitchers.push({
      id,
      name: sp.player.fullName || roster.name,
      pos: gs >= 5 ? 'SP' : (sp.stat.saves || 0) > 0 ? 'CL' : 'RP',
      number: roster.number,
      season: pitWindow(sp.stat),
      windows,
      form,
      log: [],
    });
  }
  for (const [id, roster] of rosterById) {
    if (roster.pos !== 'P' || seenPitchers.has(id)) continue;
    const windows = pitWindows[id]?.windows || {};
    pitchers.push({
      id,
      name: roster.name,
      pos: 'RP',
      number: roster.number,
      season: pitWindow({}),
      windows,
      form: formPitch(windows.l10 || windows.l5),
      log: [],
    });
  }

  console.log('Computing MLB / NL season rankings…');
  const teamGames = Math.max(
    1,
    schedule.filter((g) => g.status === 'final').length
  );
  const [mlbHitSplits, mlbPitSplits] = await Promise.all([
    loadSeasonSplits('hitting'),
    loadSeasonSplits('pitching'),
  ]);
  const nlHitSplits = mlbHitSplits.filter((s) => s.league?.id === 104);
  const nlPitSplits = mlbPitSplits.filter((s) => s.league?.id === 104);
  for (const h of hitters) {
    h.rankings = rankingsForPlayer(h.id, HIT_RANK_DEFS, mlbHitSplits, nlHitSplits, teamGames);
  }
  for (const p of pitchers) {
    p.rankings = rankingsForPlayer(p.id, PITCH_RANK_DEFS, mlbPitSplits, nlPitSplits, teamGames);
  }

  console.log(`Loading game logs for ${hitters.length} hitters + ${pitchers.length} pitchers…`);
  // Batched to avoid hammering API
  async function fillLogs(list, group, concurrency = 6) {
    let i = 0;
    async function worker() {
      while (i < list.length) {
        const idx = i++;
        list[idx].log = await gameLog(list[idx].id, group, byId);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }
  await fillLogs(hitters, 'hitting');
  await fillLogs(pitchers, 'pitching');

  // Always derive L5/L10/L20/L30 from the player's own last N games.
  // MLB lastXGames omits windows when the player has fewer than N games,
  // and the UI used to fall back to L5 — so L30 could show 0-for-6.
  for (const h of hitters) {
    const fromLog = windowsFromLog(h.log, 'hitting');
    if (Object.keys(fromLog).length) h.windows = fromLog;
    h.form = formHit(h.windows.l10 || h.windows.l5);
  }
  for (const p of pitchers) {
    const fromLog = windowsFromLog(p.log, 'pitching');
    if (Object.keys(fromLog).length) p.windows = fromLog;
    p.form = formPitch(p.windows.l10 || p.windows.l5);
  }

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
    number: h.number || 0,
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
          number: pitchers.find((p) => p.pos === 'SP').number || 0,
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
        number: p.number || 0,
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
