export type GameStatus = 'final' | 'live' | 'upcoming';

export type Game = {
  id: string;
  gamePk?: number;
  date: string;
  gameDate?: string;
  time: string;
  opponent: string;
  opponentAbbr: string;
  opponentId?: number;
  home: boolean;
  status: GameStatus;
  bravesScore?: number;
  oppScore?: number;
  starter?: string;
  venue: string;
  tv?: string;
};

export type Player = {
  id?: number;
  number: number;
  name: string;
  pos: string;
  bats?: string;
  avg?: string;
  ops?: string;
  hr?: number;
  rbi?: number;
  era?: string;
  whip?: string;
  so?: number;
};

export type StandingRow = {
  team: string;
  abbr: string;
  teamId?: number;
  w: number;
  l: number;
  pct: string;
  gb: string;
  wcgb?: string;
  streak: string;
  rank?: number;
  highlight?: boolean;
  leagueId?: number;
  divisionId?: number;
};

export type KeyStat = {
  label: string;
  value: string;
  detail: string;
  rank?: number;
  of?: number;
  leaderAbbr?: string;
  leaderValue?: string;
};

export type HitWindow = {
  g: number;
  avg: string;
  ops: string;
  obp?: string;
  slg?: string;
  hr: number;
  h: number;
  ab: number;
  r?: number;
  rbi?: number;
  bb?: number;
  so?: number;
  sb?: number;
};

export type PitchWindow = {
  g: number;
  gs?: number;
  ip: string;
  era: string;
  whip: string;
  so: number;
  bb?: number;
  h?: number;
  er?: number;
  w?: number;
  l?: number;
  sv?: number;
};

/** @deprecated use HitWindow */
export type TrendWindow = HitWindow;

export type HitGameLog = {
  date: string;
  gamePk?: number;
  opp?: string;
  ab: number;
  r: number;
  h: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  avg?: string;
  ops?: string;
};

export type PitchGameLog = {
  date: string;
  gamePk?: number;
  opp?: string;
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  era?: string;
  whip?: string;
  decision?: string;
};

export type Hitter = {
  id: number;
  name: string;
  pos: string;
  number?: number;
  season: HitWindow;
  windows: {
    l5?: HitWindow;
    l10?: HitWindow;
    l20?: HitWindow;
    l30?: HitWindow;
  };
  form?: 'hot' | 'cold' | 'neutral';
  log: HitGameLog[];
};

export type Pitcher = {
  id: number;
  name: string;
  pos: string;
  number?: number;
  season: PitchWindow;
  windows: {
    l5?: PitchWindow;
    l10?: PitchWindow;
    l20?: PitchWindow;
    l30?: PitchWindow;
  };
  form?: 'hot' | 'cold' | 'neutral';
  log: PitchGameLog[];
};

export type PlayerTrend = {
  id: number;
  name: string;
  form?: 'hot' | 'cold' | 'neutral';
  windows: {
    l10?: HitWindow;
    l15?: HitWindow;
    l30?: HitWindow;
  };
};

export type DivisionBoard = {
  leagueId: number;
  league: 'AL' | 'NL';
  divisionId?: number;
  division: string;
  teams: StandingRow[];
};

export type WildCardBoard = {
  leagueId: number;
  league: 'AL' | 'NL';
  teams: StandingRow[];
};

export type LivePayload = {
  syncedAt: string;
  dataAsOf: string;
  teamPulse: {
    record: string;
    rank: string;
    streak: string;
    runDiff: string;
    lastTen: string;
    home: string;
    away: string;
  };
  keyStats: KeyStat[];
  leaders: { name: string; stat: string; role: string }[];
  todayLineup: Player[];
  pitchingToday: {
    starter: Player | null;
    bullpen: Player[];
  };
  standings: StandingRow[];
  divisions: DivisionBoard[];
  wildCards: WildCardBoard[];
  schedule: Game[];
  trends: PlayerTrend[];
  hitters: Hitter[];
  pitchers: Pitcher[];
};

export type WindowKey = 'l5' | 'l10' | 'l20' | 'l30';
