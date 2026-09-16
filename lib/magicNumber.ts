import type { DivisionBoard, StandingRow } from '../data/types';

/** MLB regular-season length. Used unless a team has already played more. */
export const SEASON_GAMES = 162;

/** Current postseason: 3 division winners + 3 wild cards per league. */
const WILD_CARD_SPOTS = 3;

export type MagicStatus = 'magic' | 'clinched' | 'eliminated' | 'elimination';

export type MagicFigure = {
  status: MagicStatus;
  /** Remaining combination of our wins + their losses. Null when clinched/eliminated. */
  value: number | null;
  vs?: Pick<StandingRow, 'abbr' | 'team'>;
};

export type TeamMagic = {
  division: MagicFigure;
  playoffs: MagicFigure;
};

function seasonLength(teams: StandingRow[]) {
  const played = teams.reduce((max, t) => Math.max(max, t.w + t.l), 0);
  return Math.max(SEASON_GAMES, played);
}

function sortByRecord(teams: StandingRow[]) {
  return [...teams].sort((a, b) => {
    const pct = parseFloat(b.pct) - parseFloat(a.pct);
    if (pct !== 0) return pct;
    if (b.w !== a.w) return b.w - a.w;
    return a.l - b.l;
  });
}

/**
 * Combination of our wins + their losses that leaves them unable to catch us.
 *
 * Division numbers omit the extra +1 so they match MLB's published magicNumber
 * (tiebreakers already folded in). Playoff-berth numbers use `outright` so a
 * tie with the first team out is not treated as a clinch.
 */
export function magicVs(
  us: Pick<StandingRow, 'w'>,
  them: Pick<StandingRow, 'l'>,
  seasonGames = SEASON_GAMES,
  outright = false
) {
  return seasonGames - us.w - them.l + (outright ? 1 : 0);
}

function parseApiNumber(raw?: string | null): number | 'eliminated' | null {
  if (raw == null || raw === '' || raw === '-') return null;
  const u = String(raw).trim().toUpperCase();
  if (u === 'E') return 'eliminated';
  const n = Number(u);
  return Number.isFinite(n) ? n : null;
}

function figureFromNumber(
  n: number,
  vs?: Pick<StandingRow, 'abbr' | 'team'>
): MagicFigure {
  if (n <= 0) return { status: 'clinched', value: null, vs };
  return { status: 'magic', value: n, vs };
}

function bindingMagic(
  us: StandingRow,
  rivals: StandingRow[],
  seasonGames: number,
  outright = false
): MagicFigure {
  if (rivals.length === 0) return { status: 'clinched', value: null };
  let best: MagicFigure | null = null;
  for (const rival of rivals) {
    const n = magicVs(us, rival, seasonGames, outright);
    const fig = figureFromNumber(n, { abbr: rival.abbr, team: rival.team });
    if (!best) {
      best = fig;
      continue;
    }
    const bestVal = best.value ?? 0;
    const nextVal = fig.value ?? 0;
    // Highest remaining number is the binding (closest) rival.
    if ((fig.status === 'magic' ? nextVal : 0) > (best.status === 'magic' ? bestVal : 0)) {
      best = fig;
    }
  }
  return best ?? { status: 'clinched', value: null };
}

function playoffField(leagueDivs: DivisionBoard[]) {
  const winners = leagueDivs
    .map((d) => sortByRecord(d.teams)[0])
    .filter((t): t is StandingRow => Boolean(t));
  const winnerAbbrs = new Set(winners.map((t) => t.abbr));
  const wildCards = sortByRecord(
    leagueDivs.flatMap((d) => d.teams).filter((t) => !winnerAbbrs.has(t.abbr))
  );
  const inField = new Set([
    ...winnerAbbrs,
    ...wildCards.slice(0, WILD_CARD_SPOTS).map((t) => t.abbr),
  ]);
  const outside = wildCards.slice(WILD_CARD_SPOTS);
  return { inField, outside, lastIn: wildCards[WILD_CARD_SPOTS - 1] };
}

function divisionFigure(
  us: StandingRow,
  division: StandingRow[],
  seasonGames: number
): MagicFigure {
  const ranked = sortByRecord(division);
  const leader = ranked[0];
  const inFirst = leader?.abbr === us.abbr;

  if (us.divisionChamp || us.clinchIndicator === 'y') {
    return { status: 'clinched', value: null };
  }

  if (inFirst) {
    const official = parseApiNumber(us.magicNumber);
    const rivals = ranked.filter((t) => t.abbr !== us.abbr);
    const computed = bindingMagic(us, rivals, seasonGames);
    if (typeof official === 'number') {
      return figureFromNumber(official, computed.vs);
    }
    return computed;
  }

  if (!leader) return { status: 'eliminated', value: null };

  const officialElim = parseApiNumber(us.eliminationNumber);
  if (officialElim === 'eliminated') {
    return { status: 'eliminated', value: null, vs: { abbr: leader.abbr, team: leader.team } };
  }
  const n = typeof officialElim === 'number' ? officialElim : magicVs(leader, us, seasonGames);
  if (n <= 0) {
    return { status: 'eliminated', value: null, vs: { abbr: leader.abbr, team: leader.team } };
  }
  return {
    status: 'elimination',
    value: n,
    vs: { abbr: leader.abbr, team: leader.team },
  };
}

function playoffFigure(
  us: StandingRow,
  leagueDivs: DivisionBoard[],
  seasonGames: number
): MagicFigure {
  const { inField, outside, lastIn } = playoffField(leagueDivs);
  const clinchedPlayoffs =
    us.clinched === true || us.clinchIndicator === 'x' || us.clinchIndicator === 'y';

  if (clinchedPlayoffs) return { status: 'clinched', value: null };

  if (inField.has(us.abbr)) {
    const officialWc = parseApiNumber(us.wildCardEliminationNumber);
    if (officialWc === 'eliminated') {
      return { status: 'eliminated', value: null };
    }
    return bindingMagic(us, outside, seasonGames, true);
  }

  const officialWc = parseApiNumber(us.wildCardEliminationNumber);
  if (officialWc === 'eliminated') {
    return {
      status: 'eliminated',
      value: null,
      vs: lastIn ? { abbr: lastIn.abbr, team: lastIn.team } : undefined,
    };
  }
  if (!lastIn) return { status: 'eliminated', value: null };
  const n = typeof officialWc === 'number' ? officialWc : magicVs(lastIn, us, seasonGames);
  if (n <= 0) {
    return {
      status: 'eliminated',
      value: null,
      vs: { abbr: lastIn.abbr, team: lastIn.team },
    };
  }
  return {
    status: 'elimination',
    value: n,
    vs: { abbr: lastIn.abbr, team: lastIn.team },
  };
}

export function computeTeamMagic(
  divisions: DivisionBoard[],
  opts: { abbr?: string; league?: 'AL' | 'NL' } = {}
): TeamMagic | null {
  const league = opts.league ?? 'NL';
  const leagueDivs = divisions.filter((d) => d.league === league);
  const allTeams = leagueDivs.flatMap((d) => d.teams);
  if (allTeams.length === 0) return null;

  const us =
    (opts.abbr ? allTeams.find((t) => t.abbr === opts.abbr) : undefined) ||
    allTeams.find((t) => t.highlight);
  if (!us) return null;

  const divisionBoard =
    leagueDivs.find((d) => d.teams.some((t) => t.abbr === us.abbr)) ||
    leagueDivs.find((d) => d.division.toLowerCase().includes('east'));
  if (!divisionBoard) return null;

  const seasonGames = seasonLength(allTeams);
  return {
    division: divisionFigure(us, divisionBoard.teams, seasonGames),
    playoffs: playoffFigure(us, leagueDivs, seasonGames),
  };
}

export function magicDisplay(fig: MagicFigure): string {
  if (fig.status === 'clinched') return 'CLINCHED';
  if (fig.status === 'eliminated') return 'ELIM';
  return fig.value != null ? String(fig.value) : '—';
}

export function magicCaption(fig: MagicFigure, kind: 'division' | 'playoffs'): string {
  if (fig.status === 'clinched') {
    return kind === 'division' ? 'NL East locked' : 'Postseason locked';
  }
  if (fig.status === 'eliminated') {
    return kind === 'division' ? 'Out of NL East' : 'Out of the playoffs';
  }
  const vs = fig.vs?.abbr ? ` vs ${fig.vs.abbr}` : '';
  if (fig.status === 'elimination') return `Elim${vs}`;
  return `To clinch${vs}`;
}
