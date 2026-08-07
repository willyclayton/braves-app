/** Shared box-score mapping from MLB Stats API live feed. */

export type BoxBatter = {
  id: number;
  name: string;
  number: string;
  pos: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  hr: number;
  avg?: string;
  note?: string;
  battingOrder?: string;
};

export type BoxPitcher = {
  id: number;
  name: string;
  number: string;
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  decision?: string;
};

type MlbPlayer = {
  person: { id: number; fullName: string };
  jerseyNumber?: string;
  position?: { abbreviation?: string };
  allPositions?: { abbreviation?: string }[];
  battingOrder?: string;
  stats?: {
    batting?: Record<string, unknown>;
    pitching?: Record<string, unknown>;
  };
  seasonStats?: { batting?: { avg?: string } };
};

type MlbSide = {
  team: { id: number; name: string };
  players: Record<string, MlbPlayer>;
  batters?: number[];
  pitchers?: number[];
  battingOrder?: number[];
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** All batters who appeared, including substitutes — sorted by MLB battingOrder. */
export function mapBatters(side: MlbSide): BoxBatter[] {
  const players = Object.values(side.players || {});
  return players
    .filter((p) => {
      const b = p.stats?.batting;
      if (!b || p.battingOrder == null || p.battingOrder === '') return false;
      const pa = num(b.plateAppearances);
      const ab = b.atBats;
      return pa > 0 || ab != null;
    })
    .sort((a, b) =>
      String(a.battingOrder).localeCompare(String(b.battingOrder), undefined, {
        numeric: true,
      })
    )
    .map((p) => {
      const b = p.stats?.batting || {};
      const allPos = (p.allPositions || [])
        .map((x) => x.abbreviation)
        .filter(Boolean)
        .join('-');
      return {
        id: p.person.id,
        name: p.person.fullName,
        number: p.jerseyNumber || '',
        pos: allPos || p.position?.abbreviation || '',
        ab: num(b.atBats),
        r: num(b.runs),
        h: num(b.hits),
        rbi: num(b.rbi),
        bb: num(b.baseOnBalls),
        so: num(b.strikeOuts),
        hr: num(b.homeRuns),
        avg: p.seasonStats?.batting?.avg,
        note: typeof b.note === 'string' ? b.note : undefined,
        battingOrder: p.battingOrder,
      };
    });
}

export function mapPitchers(side: MlbSide): BoxPitcher[] {
  return (side.pitchers || []).map((pid) => {
    const p = side.players[`ID${pid}`];
    const pit = p?.stats?.pitching || {};
    return {
      id: pid,
      name: p?.person?.fullName || 'Unknown',
      number: p?.jerseyNumber || '',
      ip: String(pit.inningsPitched ?? '—'),
      h: num(pit.hits),
      r: num(pit.runs),
      er: num(pit.earnedRuns),
      bb: num(pit.baseOnBalls),
      so: num(pit.strikeOuts),
      decision: typeof pit.note === 'string' ? pit.note : '',
    };
  });
}

export function sumBatters(rows: BoxBatter[]) {
  return rows.reduce(
    (acc, b) => ({
      ab: acc.ab + b.ab,
      r: acc.r + b.r,
      h: acc.h + b.h,
      rbi: acc.rbi + b.rbi,
      bb: acc.bb + b.bb,
      so: acc.so + b.so,
      hr: acc.hr + b.hr,
    }),
    { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, hr: 0 }
  );
}
