import type { DivisionBoard, StandingRow } from '../data/types';
import { mlbSeasonYear } from './dates';

const BRAVES_ID = 144;
const STANDINGS_URL = 'https://statsapi.mlb.com/api/v1/standings';
const CACHE_MS = 45_000;

const DIVISION_NAMES: Record<number, string> = {
  200: 'West',
  201: 'East',
  202: 'Central',
  203: 'West',
  204: 'East',
  205: 'Central',
};

type MlbTeamRecord = {
  team?: { id?: number; name?: string; abbreviation?: string };
  wins?: number;
  losses?: number;
  winningPercentage?: string;
  gamesBack?: string;
  wildCardGamesBack?: string;
  streak?: { streakCode?: string };
  divisionRank?: string | number;
  leagueRank?: string | number;
  magicNumber?: string;
  eliminationNumber?: string;
  wildCardEliminationNumber?: string;
  clinched?: boolean;
  clinchIndicator?: string;
  divisionChamp?: boolean;
  divisionLeader?: boolean;
};

type MlbStandingsRecord = {
  standingsType?: string;
  league?: { id?: number };
  division?: { id?: number };
  teamRecords?: MlbTeamRecord[];
};

type Cache = { at: number; season: number; data: DivisionBoard[] };

let cache: Cache | null = null;

function dash(value?: string) {
  if (!value || value === '-') return '—';
  return value;
}

export function mapMlbStandings(payload: { records?: MlbStandingsRecord[] }): DivisionBoard[] {
  const divisions: DivisionBoard[] = [];
  for (const rec of payload.records || []) {
    if (rec.standingsType && rec.standingsType !== 'regularSeason') continue;
    const leagueId = rec.league?.id;
    if (leagueId !== 103 && leagueId !== 104) continue;
    const rows: StandingRow[] = (rec.teamRecords || []).map((tr) => {
      const teamId = tr.team?.id;
      const row: StandingRow = {
        team: tr.team?.name || '',
        abbr: tr.team?.abbreviation || tr.team?.name || '',
        teamId,
        w: Number(tr.wins) || 0,
        l: Number(tr.losses) || 0,
        pct: tr.winningPercentage || '.000',
        gb: dash(tr.gamesBack),
        wcgb: dash(tr.wildCardGamesBack),
        streak: tr.streak?.streakCode || '',
        rank: Number(tr.divisionRank || tr.leagueRank || 0),
        highlight: teamId === BRAVES_ID,
        leagueId,
        divisionId: rec.division?.id,
      };
      if (tr.magicNumber && tr.magicNumber !== '-') row.magicNumber = String(tr.magicNumber);
      if (tr.eliminationNumber && tr.eliminationNumber !== '-') {
        row.eliminationNumber = String(tr.eliminationNumber);
      }
      if (tr.wildCardEliminationNumber && tr.wildCardEliminationNumber !== '-') {
        row.wildCardEliminationNumber = String(tr.wildCardEliminationNumber);
      }
      if (tr.clinched) row.clinched = true;
      if (tr.clinchIndicator) row.clinchIndicator = tr.clinchIndicator;
      if (tr.divisionChamp) row.divisionChamp = true;
      if (tr.divisionLeader) row.divisionLeader = true;
      return row;
    });
    divisions.push({
      leagueId,
      league: leagueId === 104 ? 'NL' : 'AL',
      divisionId: rec.division?.id,
      division: DIVISION_NAMES[rec.division?.id || 0] || 'Division',
      teams: rows,
    });
  }
  return divisions;
}

export async function fetchLiveDivisions(now = new Date()): Promise<DivisionBoard[]> {
  const season = mlbSeasonYear(now);
  if (cache && cache.season === season && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }
  const url = `${STANDINGS_URL}?leagueId=103,104&season=${season}&standingsTypes=regularSeason&hydrate=team`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`standings ${res.status}`);
  const payload = (await res.json()) as { records?: MlbStandingsRecord[] };
  const data = mapMlbStandings(payload);
  if (!data.length) throw new Error('empty standings');
  cache = { at: Date.now(), season, data };
  return data;
}
