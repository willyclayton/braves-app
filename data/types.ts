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

export type TrendWindow = {
  g: number;
  avg: string;
  ops: string;
  hr: number;
  h: number;
  ab: number;
};

export type PlayerTrend = {
  id: number;
  name: string;
  form?: 'hot' | 'cold' | 'neutral';
  windows: {
    l10?: TrendWindow;
    l15?: TrendWindow;
    l30?: TrendWindow;
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
};
