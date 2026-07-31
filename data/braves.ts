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

export const teamPulse = {
  record: '68-42',
  rank: '1st · NL East',
  streak: 'W3',
  runDiff: '+96',
  lastTen: '7-3',
  home: '36-18',
  away: '32-24',
};

export const keyStats = [
  { label: 'AVG', value: '.268', detail: '3rd NL' },
  { label: 'OPS', value: '.794', detail: '2nd NL' },
  { label: 'ERA', value: '3.41', detail: '4th NL' },
  { label: 'HR', value: '148', detail: '1st NL' },
];

export const leaders = [
  { name: 'Ronald Acuña Jr.', stat: '.312 / 28 HR', role: 'OF' },
  { name: 'Matt Olson', stat: '31 HR · 89 RBI', role: '1B' },
  { name: 'Spencer Strider', stat: '2.68 ERA · 168 K', role: 'SP' },
  { name: 'Raisel Iglesias', stat: '28 SV · 1.94 ERA', role: 'CL' },
];

export const todayLineup: Player[] = [
  { number: 13, name: 'Ronald Acuña Jr.', pos: 'RF', bats: 'R', avg: '.312', ops: '.948', hr: 28, rbi: 74 },
  { number: 1, name: 'Ozzie Albies', pos: '2B', bats: 'S', avg: '.278', ops: '.812', hr: 19, rbi: 67 },
  { number: 28, name: 'Matt Olson', pos: '1B', bats: 'L', avg: '.259', ops: '.875', hr: 31, rbi: 89 },
  { number: 23, name: 'Marcell Ozuna', pos: 'DH', bats: 'R', avg: '.271', ops: '.861', hr: 26, rbi: 78 },
  { number: 12, name: 'Sean Murphy', pos: 'C', bats: 'R', avg: '.248', ops: '.781', hr: 16, rbi: 52 },
  { number: 27, name: 'Austin Riley', pos: '3B', bats: 'R', avg: '.266', ops: '.830', hr: 22, rbi: 71 },
  { number: 7, name: 'Michael Harris II', pos: 'CF', bats: 'L', avg: '.289', ops: '.808', hr: 15, rbi: 58 },
  { number: 18, name: 'Jarred Kelenic', pos: 'LF', bats: 'L', avg: '.241', ops: '.724', hr: 12, rbi: 41 },
  { number: 2, name: 'Orlando Arcia', pos: 'SS', bats: 'R', avg: '.232', ops: '.668', hr: 9, rbi: 38 },
];

export const pitchingToday = {
  starter: {
    number: 99,
    name: 'Spencer Strider',
    pos: 'SP',
    era: '2.68',
    whip: '0.98',
    so: 168,
  } as Player,
  bullpen: [
    { number: 55, name: 'Raisel Iglesias', pos: 'CL', era: '1.94', whip: '0.89', so: 62 },
    { number: 38, name: 'Joe Jiménez', pos: 'RP', era: '2.41', whip: '1.05', so: 54 },
    { number: 33, name: 'Pierce Johnson', pos: 'RP', era: '2.88', whip: '1.12', so: 49 },
  ] as Player[],
};

export const standings: StandingRow[] = [
  { team: 'Atlanta Braves', abbr: 'ATL', w: 68, l: 42, pct: '.618', gb: '—', streak: 'W3', highlight: true },
  { team: 'Philadelphia', abbr: 'PHI', w: 64, l: 46, pct: '.582', gb: '4.0', streak: 'L1' },
  { team: 'New York Mets', abbr: 'NYM', w: 58, l: 52, pct: '.527', gb: '10.0', streak: 'W2' },
  { team: 'Washington', abbr: 'WSH', w: 48, l: 62, pct: '.436', gb: '20.0', streak: 'L2' },
  { team: 'Miami', abbr: 'MIA', w: 42, l: 68, pct: '.382', gb: '26.0', streak: 'L4' },
];

export const schedule: Game[] = [
  {
    id: '1',
    date: 'Jul 29',
    time: 'Final',
    opponent: 'New York Mets',
    opponentAbbr: 'NYM',
    home: true,
    status: 'final',
    bravesScore: 6,
    oppScore: 3,
    venue: 'Truist Park',
  },
  {
    id: '2',
    date: 'Jul 30',
    time: 'Final',
    opponent: 'New York Mets',
    opponentAbbr: 'NYM',
    home: true,
    status: 'final',
    bravesScore: 4,
    oppScore: 2,
    venue: 'Truist Park',
  },
  {
    id: '3',
    date: 'Jul 31',
    time: '7:20 PM',
    opponent: 'New York Mets',
    opponentAbbr: 'NYM',
    home: true,
    status: 'upcoming',
    starter: 'Strider',
    venue: 'Truist Park',
    tv: 'Bally · ESPN',
  },
  {
    id: '4',
    date: 'Aug 1',
    time: '7:15 PM',
    opponent: 'Los Angeles Dodgers',
    opponentAbbr: 'LAD',
    home: false,
    status: 'upcoming',
    starter: 'Sale',
    venue: 'Dodger Stadium',
    tv: 'MLBN',
  },
  {
    id: '5',
    date: 'Aug 2',
    time: '9:10 PM',
    opponent: 'Los Angeles Dodgers',
    opponentAbbr: 'LAD',
    home: false,
    status: 'upcoming',
    starter: 'Schwellenbach',
    venue: 'Dodger Stadium',
    tv: 'Bally',
  },
  {
    id: '6',
    date: 'Aug 3',
    time: '4:10 PM',
    opponent: 'Los Angeles Dodgers',
    opponentAbbr: 'LAD',
    home: false,
    status: 'upcoming',
    starter: 'Elder',
    venue: 'Dodger Stadium',
    tv: 'Bally',
  },
  {
    id: '7',
    date: 'Aug 5',
    time: '7:20 PM',
    opponent: 'Milwaukee Brewers',
    opponentAbbr: 'MIL',
    home: true,
    status: 'upcoming',
    starter: 'Strider',
    venue: 'Truist Park',
    tv: 'Bally',
  },
  {
    id: '8',
    date: 'Aug 6',
    time: '7:20 PM',
    opponent: 'Milwaukee Brewers',
    opponentAbbr: 'MIL',
    home: true,
    status: 'upcoming',
    starter: 'Sale',
    venue: 'Truist Park',
    tv: 'Bally',
  },
];

export const nextGame = schedule.find((g) => g.status === 'upcoming')!;
