import type { DivisionBoard, Game, StandingRow } from '../data/types';

const WILD_CARD_SPOTS = 3;
const LEFT = new Set([1, 4, 5]);
const RIGHT = new Set([2, 3, 6]);
const WCS_PAIR: Record<number, number> = { 3: 6, 6: 3, 4: 5, 5: 4 };
const NICK: Record<string, string> = {
  ATL: 'the Braves',
  CHC: 'the Cubs',
  MIL: 'the Brewers',
  LAD: 'the Dodgers',
  PHI: 'the Phillies',
  SD: 'the Padres',
  AZ: 'the D-backs',
  NYM: 'the Mets',
  WSH: 'the Nationals',
  MIA: 'the Marlins',
  STL: 'the Cardinals',
  CIN: 'the Reds',
  PIT: 'the Pirates',
  SF: 'the Giants',
  COL: 'the Rockies',
};

export type PlayoffSeed = {
  seed: number;
  team: StandingRow;
  kind: 'division' | 'wildcard';
  bye: boolean;
};

export type MeetingRound = 'wcs' | 'nlds' | 'nlcs';

export type WrigleyScenario = {
  id: string;
  round: MeetingRound | 'regular';
  featured: boolean;
  atWrigley: boolean;
  kicker: string;
  headline: string;
  body: string;
};

export type WrigleyPath = {
  atl?: PlayoffSeed;
  chc?: PlayoffSeed;
  seeds: PlayoffSeed[];
  remainingRegular: Game[];
  scenarios: WrigleyScenario[];
};

function sortByRecord(teams: StandingRow[]) {
  return [...teams].sort((a, b) => {
    const pct = parseFloat(b.pct) - parseFloat(a.pct);
    if (pct !== 0) return pct;
    if (b.w !== a.w) return b.w - a.w;
    return a.l - b.l;
  });
}

function nick(row?: StandingRow | PlayoffSeed) {
  const team = row && 'seed' in row ? row.team : row;
  if (!team) return 'that club';
  return NICK[team.abbr] || `the ${team.team}`;
}

function half(seed: number) {
  return LEFT.has(seed) ? 'L' : 'R';
}

/** Where two seeds can first meet. Bracket does not re-seed. */
export function meetingRound(a: number, b: number): MeetingRound | null {
  if (a === b) return null;
  if (WCS_PAIR[a] === b) return 'wcs';
  if (half(a) === half(b)) return 'nlds';
  return 'nlcs';
}

export function wrigleyHosting(round: MeetingRound, cubsSeed: number, bravesSeed: number) {
  const cubsHigher = cubsSeed < bravesSeed;
  if (round === 'wcs') {
    return cubsHigher
      ? { atWrigley: true, games: 'All 3 games at Wrigley' }
      : { atWrigley: false, games: 'All 3 games at Truist Park' };
  }
  if (round === 'nlds') {
    return cubsHigher
      ? { atWrigley: true, games: 'Games 1, 2, and 5 at Wrigley' }
      : { atWrigley: true, games: 'Games 3–4 at Wrigley' };
  }
  return cubsHigher
    ? { atWrigley: true, games: 'Games 1, 2, 6, and 7 at Wrigley' }
    : { atWrigley: true, games: 'Games 3–5 at Wrigley' };
}

export function seedNationalLeague(divisions: DivisionBoard[]): PlayoffSeed[] {
  const nl = divisions.filter((d) => d.league === 'NL');
  const winners = nl
    .map((d) => sortByRecord(d.teams)[0])
    .filter((t): t is StandingRow => Boolean(t));
  const winnerAbbrs = new Set(winners.map((t) => t.abbr));
  const wildCards = sortByRecord(nl.flatMap((d) => d.teams).filter((t) => !winnerAbbrs.has(t.abbr))).slice(
    0,
    WILD_CARD_SPOTS
  );
  const ordered = [...sortByRecord(winners), ...wildCards];
  return ordered.map((team, i) => {
    const seed = i + 1;
    return {
      seed,
      team,
      kind: i < 3 ? 'division' : 'wildcard',
      bye: seed <= 2,
    };
  });
}

function findSeed(seeds: PlayoffSeed[], abbr: string) {
  return seeds.find((s) => s.team.abbr === abbr);
}

function seedBy(seeds: PlayoffSeed[], n: number) {
  return seeds.find((s) => s.seed === n);
}

function betterRecord(a: StandingRow, b: StandingRow) {
  if (a.w !== b.w) return a.w > b.w;
  if (a.l !== b.l) return a.l < b.l;
  return parseFloat(a.pct) > parseFloat(b.pct);
}

function dsOpponentLabel(seeds: PlayoffSeed[], seed: number) {
  if (seed === 1) return 'the 4/5 winner';
  if (seed === 2) return 'the 3/6 winner';
  return nick(seedBy(seeds, seed === 3 || seed === 6 ? 2 : 1));
}

function describeCurrentMeeting(seeds: PlayoffSeed[], atl: PlayoffSeed, chc: PlayoffSeed): WrigleyScenario {
  const round = meetingRound(atl.seed, chc.seed) || 'nlcs';
  const host = wrigleyHosting(round, chc.seed, atl.seed);
  const roundName = round === 'wcs' ? 'Wild Card' : round === 'nlds' ? 'NLDS' : 'NLCS';
  let body: string;

  if (round === 'wcs') {
    body = `No. ${atl.seed} vs No. ${chc.seed}. The higher Wild Card hosts every game — ${host.games.toLowerCase()}.`;
  } else if (round === 'nlds') {
    const cubsWc = !chc.bye ? seedBy(seeds, WCS_PAIR[chc.seed]) : undefined;
    const cubsFirst = cubsWc
      ? `Chicago has to beat ${nick(cubsWc)} in the Wild Card first`
      : 'Chicago has to win its Wild Card series first';
    body = `You’re No. ${atl.seed} with a bye. ${cubsFirst}. Then ${host.games}.`;
  } else {
    const atlWc = !atl.bye ? seedBy(seeds, WCS_PAIR[atl.seed]) : undefined;
    const chcWc = !chc.bye ? seedBy(seeds, WCS_PAIR[chc.seed]) : undefined;
    const atlOpen = atl.bye
      ? `You have a bye, then beat ${dsOpponentLabel(seeds, atl.seed)} in the NLDS`
      : `Win the Wild Card vs ${nick(atlWc)}, then the NLDS vs ${dsOpponentLabel(seeds, atl.seed)}`;
    const cubsOpen = chc.bye
      ? `Cubs have a bye, then must beat ${dsOpponentLabel(seeds, chc.seed)}`
      : `Cubs have to beat ${nick(chcWc)}, then ${dsOpponentLabel(seeds, chc.seed)}`;
    body = `You’re No. ${atl.seed}, Chicago No. ${chc.seed} — opposite halves, no re-seed, so you only meet in the NLCS. ${atlOpen}. ${cubsOpen}.`;
  }

  return {
    id: 'current',
    round,
    featured: true,
    atWrigley: host.atWrigley,
    kicker: 'If today’s seeds hold',
    headline: `${roundName} · ${host.games}`,
    body,
  };
}

function wildCardAlt(atl: PlayoffSeed, chc: PlayoffSeed): WrigleyScenario {
  const cubsWouldHost = betterRecord(chc.team, atl.team);
  const eastSlip = atl.kind === 'division';
  return {
    id: 'wcs-alt',
    round: 'wcs',
    featured: false,
    atWrigley: cubsWouldHost,
    kicker: 'If both are Wild Cards',
    headline: cubsWouldHost ? 'Wild Card at Wrigley' : 'Wild Card would be at Truist',
    body: cubsWouldHost
      ? eastSlip
        ? 'Phillies catch you in the East and the Cubs finish with the better record — Chicago hosts all 3.'
        : 'Land as the 4 and 5 seeds with Chicago ahead of you, and they host all 3 at Wrigley.'
      : eastSlip
        ? 'Phillies catch you in the East. You still own the better record, so a Braves–Cubs Wild Card is all 3 at Truist. Wrigley only if Chicago also passes you.'
        : 'Finish as the 4 and 5 seeds and you host all 3 at Truist. Wrigley only if Chicago also passes you in the standings.',
  };
}

function nldsAlt(atl: PlayoffSeed): WrigleyScenario {
  return {
    id: 'nlds-alt',
    round: 'nlds',
    featured: false,
    atWrigley: true,
    kicker: 'If you grab a bye',
    headline: 'NLDS · Games 3–4 at Wrigley',
    body:
      atl.seed === 1
        ? 'You’re already the No. 1 seed. If the Cubs win the 4-vs-5 Wild Card, they come to the NLDS — Games 3–4 at Wrigley.'
        : atl.seed === 2
          ? 'You’re the No. 2 seed. Chicago would have to drop to No. 6 and win that Wild Card to meet you in the NLDS — Games 3–4 at Wrigley.'
          : 'A 1-seed puts you against the 4/5 winner (the Cubs, if they win that Wild Card). A 2-seed only meets Chicago if they fall to No. 6. Either way, Games 3–4 are at Wrigley.',
  };
}

export function remainingWrigleyGames(schedule: Game[]) {
  return schedule.filter(
    (g) => g.opponentAbbr === 'CHC' && g.home === false && g.status !== 'final'
  );
}

/**
 * Playoff paths that put the Braves on the Wrigley turf — plus the Wild Card
 * Truist hosting case, which is the usual outcome if both land as wild cards.
 */
export function wrigleyPath(divisions: DivisionBoard[], schedule: Game[] = []): WrigleyPath | null {
  const seeds = seedNationalLeague(divisions);
  if (seeds.length < 6) return null;
  const atl = findSeed(seeds, 'ATL');
  const chc = findSeed(seeds, 'CHC');
  const remainingRegular = remainingWrigleyGames(schedule);
  const scenarios: WrigleyScenario[] = [];

  if (atl && chc) {
    scenarios.push(describeCurrentMeeting(seeds, atl, chc));
    const round = meetingRound(atl.seed, chc.seed);
    if (round !== 'wcs') scenarios.push(wildCardAlt(atl, chc));
    if (round !== 'nlds') scenarios.push(nldsAlt(atl));
  } else if (atl && !chc) {
    scenarios.push({
      id: 'cubs-out',
      round: 'nlcs',
      featured: true,
      atWrigley: false,
      kicker: 'Cubs are outside the field',
      headline: 'No October Wrigley yet',
      body: 'Chicago has to climb into a Wild Card before a postseason trip to Wrigley is on the board.',
    });
  } else if (!atl) {
    scenarios.push({
      id: 'atl-out',
      round: 'wcs',
      featured: true,
      atWrigley: false,
      kicker: 'Outside the field',
      headline: 'Need a playoff berth first',
      body: 'October at Wrigley only exists if Atlanta is in the bracket.',
    });
  }

  return { atl, chc, seeds, remainingRegular, scenarios };
}
