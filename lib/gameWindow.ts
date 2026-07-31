import type { Game } from '@/data/types';

/** Noon ET on the calendar day after `yyyy-mm-dd`. */
export function resultCutoffEt(gameDate: string): Date {
  const [y, m, d] = gameDate.split('-').map(Number);
  // Noon Eastern ≈ 16:00 UTC (EDT) or 17:00 UTC (EST)
  const edt = new Date(Date.UTC(y, m - 1, d + 1, 16, 0, 0));
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(edt)
  );
  if (hour === 12) return edt;
  return new Date(Date.UTC(y, m - 1, d + 1, 17, 0, 0));
}

export type HeroMode = {
  mode: 'result' | 'next';
  result?: Game;
  next?: Game;
};

/**
 * Last final result stays primary until noon ET the following day.
 * Then the next upcoming game becomes primary (countdown).
 */
export function resolveHero(schedule: Game[], now = new Date()): HeroMode {
  const finals = schedule.filter(
    (g) => g.status === 'final' && g.bravesScore != null && g.oppScore != null
  );
  const next = schedule.find((g) => g.status === 'upcoming' || g.status === 'live');
  const result = finals[finals.length - 1];

  if (result && now.getTime() < resultCutoffEt(result.date).getTime()) {
    return { mode: 'result', result, next };
  }
  if (next) return { mode: 'next', next, result };
  if (result) return { mode: 'result', result };
  return { mode: 'next' };
}

export function countdownParts(gameDateIso: string, now = new Date()) {
  const diff = Math.max(0, new Date(gameDateIso).getTime() - now.getTime());
  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function resultLabel(game: Game) {
  if (game.bravesScore == null || game.oppScore == null) return null;
  const win = game.bravesScore > game.oppScore;
  const tie = game.bravesScore === game.oppScore;
  return {
    win,
    tie,
    text: tie ? 'TIE' : win ? 'WIN' : 'LOSS',
    score: `${game.bravesScore}–${game.oppScore}`,
  };
}
