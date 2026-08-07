import live from './live.json';
import type { Hitter, LivePayload, Pitcher, WindowKey } from './types';

export type {
  Game,
  GameStatus,
  Player,
  StandingRow,
  KeyStat,
  PlayerTrend,
  DivisionBoard,
  WildCardBoard,
  Hitter,
  Pitcher,
  HitWindow,
  PitchWindow,
  WindowKey,
} from './types';

const data = live as LivePayload;

export const dataAsOf = data.dataAsOf;
export const syncedAt = data.syncedAt;
export const teamPulse = data.teamPulse;
export const keyStats = data.keyStats || [];
export const leaders = data.leaders || [];
export const todayLineup = data.todayLineup || [];
export const pitchingToday = data.pitchingToday || { starter: null, bullpen: [] };
export const standings = data.standings || [];
export const divisions = data.divisions || [];
export const wildCards = data.wildCards || [];
export const schedule = data.schedule;
export const trends = data.trends || [];
export const hitters: Hitter[] = data.hitters || [];
export const pitchers: Pitcher[] = data.pitchers || [];

export const nextGame = schedule.find((g) => g.status === 'upcoming');

export function trendFor(playerId?: number, playerName?: string) {
  if (playerId != null) {
    const byId = trends.find((t) => t.id === playerId);
    if (byId) return byId;
  }
  if (playerName) return trends.find((t) => t.name === playerName);
  return undefined;
}

export function hitterById(id: number | string) {
  return hitters.find((h) => String(h.id) === String(id));
}

export function pitcherById(id: number | string) {
  return pitchers.find((p) => String(p.id) === String(id));
}

export function playerById(id: number | string) {
  const h = hitterById(id);
  if (h) return { kind: 'hitter' as const, player: h };
  const p = pitcherById(id);
  if (p) return { kind: 'pitcher' as const, player: p };
  return null;
}

export const WINDOW_KEYS: WindowKey[] = ['l5', 'l10', 'l20', 'l30'];
export const WINDOW_LABELS: Record<WindowKey, string> = {
  l5: 'L5',
  l10: 'L10',
  l20: 'L20',
  l30: 'L30',
};
