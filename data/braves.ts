import live from './live.json';
import type { LivePayload } from './types';

export type {
  Game,
  GameStatus,
  Player,
  StandingRow,
  KeyStat,
  PlayerTrend,
  DivisionBoard,
  WildCardBoard,
} from './types';

const data = live as LivePayload;

export const dataAsOf = data.dataAsOf;
export const syncedAt = data.syncedAt;
export const teamPulse = data.teamPulse;
export const keyStats = data.keyStats;
export const leaders = data.leaders;
export const todayLineup = data.todayLineup;
export const pitchingToday = data.pitchingToday;
export const standings = data.standings;
export const divisions = data.divisions;
export const wildCards = data.wildCards;
export const schedule = data.schedule;
export const trends = data.trends;

export const nextGame = schedule.find((g) => g.status === 'upcoming');

export function trendFor(playerId?: number, playerName?: string) {
  if (playerId != null) {
    const byId = trends.find((t) => t.id === playerId);
    if (byId) return byId;
  }
  if (playerName) return trends.find((t) => t.name === playerName);
  return undefined;
}
