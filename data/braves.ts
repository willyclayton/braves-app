/** Season snapshot sourced from MLB Stats API — updated Jul 31, 2026. */

export type GameStatus = 'final' | 'live' | 'upcoming';

export type Game = {
  id: string;
  date: string;
  time: string;
  opponent: string;
  opponentAbbr: string;
  home: boolean;
  status: GameStatus;
  bravesScore?: number;
  oppScore?: number;
  starter?: string;
  venue: string;
  tv?: string;
};

export type Player = {
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
  w: number;
  l: number;
  pct: string;
  gb: string;
  streak: string;
  highlight?: boolean;
};

export const dataAsOf = 'Jul 31, 2026';

export const teamPulse = {
  record: '64-45',
  rank: '1st · NL East',
  streak: 'W2',
  runDiff: '+97',
  lastTen: '6-4',
  home: '33-20',
  away: '31-25',
};

export const keyStats = [
  { label: 'AVG', value: '.248', detail: 'Team' },
  { label: 'OPS', value: '.728', detail: 'Team' },
  { label: 'ERA', value: '3.71', detail: 'Staff' },
  { label: 'HR', value: '143', detail: 'Team' },
];

export const leaders = [
  { name: 'Matt Olson', stat: '.261 · 28 HR · 66 RBI', role: '1B' },
  { name: 'Michael Harris II', stat: '.290 · 19 HR · 61 RBI', role: 'CF' },
  { name: 'Chris Sale', stat: '12-6 · 2.08 ERA · 143 K', role: 'SP' },
  { name: 'Raisel Iglesias', stat: '23 SV · 2.31 ERA', role: 'CL' },
];

/** Projected order based on most recent home lineup (Jul 30); official card posts closer to first pitch. */
export const todayLineup: Player[] = [
  { number: 30, name: 'Drake Baldwin', pos: 'C', bats: 'L', avg: '.279', ops: '.851', hr: 20, rbi: 56 },
  { number: 13, name: 'Ronald Acuña Jr.', pos: 'RF', bats: 'R', avg: '.244', ops: '.781', hr: 8, rbi: 23 },
  { number: 28, name: 'Matt Olson', pos: '1B', bats: 'L', avg: '.261', ops: '.858', hr: 28, rbi: 66 },
  { number: 23, name: 'Michael Harris II', pos: 'CF', bats: 'L', avg: '.290', ops: '.808', hr: 19, rbi: 61 },
  { number: 1, name: 'Ozzie Albies', pos: '2B', bats: 'S', avg: '.261', ops: '.748', hr: 18, rbi: 62 },
  { number: 14, name: 'Mauricio Dubón', pos: '3B', bats: 'R', avg: '.258', ops: '.704', hr: 10, rbi: 55 },
  { number: 8, name: 'Dominic Smith', pos: 'DH', bats: 'L', avg: '.267', ops: '.714', hr: 7, rbi: 41 },
  { number: 36, name: 'Eli White', pos: 'LF', bats: 'R', avg: '.233', ops: '.691', hr: 5, rbi: 17 },
  { number: 74, name: 'Jim Jarvis', pos: 'SS', bats: 'L', avg: '.243', ops: '.679', hr: 1, rbi: 8 },
];

export const pitchingToday = {
  starter: {
    number: 55,
    name: 'Bryce Elder',
    pos: 'SP',
    era: '3.96',
    whip: '1.25',
    so: 98,
  } as Player,
  bullpen: [
    { number: 26, name: 'Raisel Iglesias', pos: 'CL', era: '2.31', whip: '1.05', so: 43 },
    { number: 52, name: 'Dylan Lee', pos: 'RP', era: '2.16', whip: '0.72', so: 61 },
    { number: 75, name: 'Robert Suárez', pos: 'RP', era: '0.56', whip: '0.84', so: 26 },
  ] as Player[],
};

export const standings: StandingRow[] = [
  { team: 'Atlanta Braves', abbr: 'ATL', w: 64, l: 45, pct: '.587', gb: '—', streak: 'W2', highlight: true },
  { team: 'Philadelphia', abbr: 'PHI', w: 57, l: 52, pct: '.523', gb: '7.0', streak: 'L3' },
  { team: 'Miami', abbr: 'MIA', w: 55, l: 55, pct: '.500', gb: '9.5', streak: 'L1' },
  { team: 'Washington', abbr: 'WSH', w: 55, l: 55, pct: '.500', gb: '9.5', streak: 'L2' },
  { team: 'New York Mets', abbr: 'NYM', w: 47, l: 63, pct: '.427', gb: '17.5', streak: 'W1' },
];

export const schedule: Game[] = [
  {
    id: '1',
    date: 'Jul 27',
    time: 'Final',
    opponent: 'New York Mets',
    opponentAbbr: 'NYM',
    home: false,
    status: 'final',
    bravesScore: 3,
    oppScore: 14,
    venue: 'Citi Field',
  },
  {
    id: '2',
    date: 'Jul 29',
    time: 'Final',
    opponent: 'New York Mets',
    opponentAbbr: 'NYM',
    home: false,
    status: 'final',
    bravesScore: 2,
    oppScore: 3,
    venue: 'Citi Field',
  },
  {
    id: '3',
    date: 'Jul 29',
    time: 'Final',
    opponent: 'New York Mets',
    opponentAbbr: 'NYM',
    home: false,
    status: 'final',
    bravesScore: 1,
    oppScore: 0,
    venue: 'Citi Field',
  },
  {
    id: '4',
    date: 'Jul 30',
    time: 'Final',
    opponent: 'Washington Nationals',
    opponentAbbr: 'WSH',
    home: true,
    status: 'final',
    bravesScore: 5,
    oppScore: 4,
    venue: 'Truist Park',
  },
  {
    id: '5',
    date: 'Jul 31',
    time: '7:15 PM',
    opponent: 'Washington Nationals',
    opponentAbbr: 'WSH',
    home: true,
    status: 'upcoming',
    starter: 'Elder',
    venue: 'Truist Park',
    tv: 'BravesVision',
  },
  {
    id: '6',
    date: 'Aug 1',
    time: '7:15 PM',
    opponent: 'Washington Nationals',
    opponentAbbr: 'WSH',
    home: true,
    status: 'upcoming',
    starter: 'López',
    venue: 'Truist Park',
    tv: 'BravesVision',
  },
  {
    id: '7',
    date: 'Aug 2',
    time: '1:35 PM',
    opponent: 'Washington Nationals',
    opponentAbbr: 'WSH',
    home: true,
    status: 'upcoming',
    starter: 'Pérez',
    venue: 'Truist Park',
    tv: 'BravesVision',
  },
  {
    id: '8',
    date: 'Aug 4',
    time: '7:15 PM',
    opponent: 'Miami Marlins',
    opponentAbbr: 'MIA',
    home: true,
    status: 'upcoming',
    starter: 'Sale',
    venue: 'Truist Park',
    tv: 'BravesVision',
  },
  {
    id: '9',
    date: 'Aug 5',
    time: '7:15 PM',
    opponent: 'Miami Marlins',
    opponentAbbr: 'MIA',
    home: true,
    status: 'upcoming',
    starter: 'Holmes',
    venue: 'Truist Park',
    tv: 'BravesVision',
  },
  {
    id: '10',
    date: 'Aug 6',
    time: '7:15 PM',
    opponent: 'Miami Marlins',
    opponentAbbr: 'MIA',
    home: true,
    status: 'upcoming',
    starter: 'Elder',
    venue: 'Truist Park',
    tv: 'BravesVision',
  },
  {
    id: '11',
    date: 'Aug 7',
    time: '7:05 PM',
    opponent: 'New York Yankees',
    opponentAbbr: 'NYY',
    home: false,
    status: 'upcoming',
    starter: 'López',
    venue: 'Yankee Stadium',
    tv: 'BravesVision',
  },
];

export const nextGame = schedule.find((g) => g.status === 'upcoming')!;
