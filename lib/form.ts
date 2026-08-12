import type { HitWindow, PitchWindow } from '@/data/types';

export type FormState = 'hot' | 'cold' | 'neutral';

/**
 * Hot/cold classification for a hitting sample.
 *
 * Inspired by how FanGraphs/ESPN talk about streaks: judge production
 * (OPS as a wOBA stand-in), not batting average alone. A .200 AVG with
 * three homers and an .888 OPS is hot, not cold. Cold is reserved for
 * truly empty stretches — very low OPS with no power offset.
 *
 * Rough league-average OPS sits near .720. Hot ≈ +80 OPS, cold ≈ −170.
 */
export function formFromHitWindow(w?: HitWindow | null): FormState {
  if (!w) return 'neutral';
  const ab = Number(w.ab) || 0;
  const g = Number(w.g) || 0;
  const h = Number(w.h) || 0;
  const hr = Number(w.hr) || 0;
  const rbi = Number(w.rbi) || 0;
  const ops = parseFloat(String(w.ops));
  const avg = parseFloat(String(w.avg));
  const slg = parseFloat(String(w.slg ?? ''));

  // Too small to label — avoid pinning call-ups / pinch-hitters.
  if (ab < 8 && g < 3) return 'neutral';

  const hasOps = !Number.isNaN(ops);
  const iso = !Number.isNaN(slg) && !Number.isNaN(avg) ? slg - avg : null;
  const hrRate = ab > 0 ? hr / ab : 0;

  // Power can carry a low AVG (Olson 4-for-20 with 3 HR).
  const powerSurge = hr >= 3 || (hr >= 2 && ab <= 25) || (iso != null && iso >= 0.25);
  const emptyBat = hr === 0 && rbi <= 1 && h <= Math.max(1, Math.floor(ab * 0.12));

  if (hasOps && ops >= 0.85) return 'hot';
  if (hasOps && ops >= 0.78 && (powerSurge || (!Number.isNaN(avg) && avg >= 0.28))) {
    return 'hot';
  }
  if (powerSurge && hasOps && ops >= 0.75) return 'hot';
  if (!hasOps && !Number.isNaN(avg) && avg >= 0.33 && ab >= 12) return 'hot';

  // Cold only when production is truly poor — not merely a cold AVG.
  if (hasOps && ops <= 0.5 && emptyBat) return 'cold';
  if (hasOps && ops <= 0.55 && emptyBat && ab >= 12) return 'cold';
  if (
    hasOps &&
    ops <= 0.6 &&
    emptyBat &&
    !Number.isNaN(avg) &&
    avg <= 0.15 &&
    ab >= 15
  ) {
    return 'cold';
  }

  return 'neutral';
}

/** Hot/cold from a pitching sample window. */
export function formFromPitchWindow(w?: PitchWindow | null): FormState {
  if (!w) return 'neutral';
  const ip = parseFloat(String(w.ip)) || 0;
  const g = Number(w.g) || 0;
  if (ip < 3 && g < 2) return 'neutral';

  const era = parseFloat(String(w.era));
  const whip = parseFloat(String(w.whip));
  const so = Number(w.so) || 0;
  const bb = Number(w.bb) || 0;
  const er = Number(w.er) || 0;
  const hasEra = !Number.isNaN(era);
  const hasWhip = !Number.isNaN(whip);
  const kPerIp = ip > 0 ? so / ip : 0;

  // Dominant: low ERA/WHIP or high miss rate with runs prevented.
  if ((hasEra && era <= 2.25) || (hasWhip && whip <= 0.95)) return 'hot';
  if (hasEra && era <= 3.0 && hasWhip && whip <= 1.15) return 'hot';
  if (hasEra && era <= 3.25 && kPerIp >= 1.2 && er <= Math.max(2, ip * 0.4)) {
    return 'hot';
  }

  // Cold only when clearly getting hit around — avoid labeling every
  // mid-4s ERA stretch as cold.
  if ((hasEra && era >= 6.5) || (hasWhip && whip >= 1.7)) return 'cold';
  if (hasEra && era >= 5.5 && hasWhip && whip >= 1.5) return 'cold';
  if (hasEra && era >= 5.0 && bb >= so && ip >= 4) return 'cold';

  return 'neutral';
}

/** @deprecated use formFromHitWindow */
export function formFromWindow(w?: HitWindow | null): FormState {
  return formFromHitWindow(w);
}

export function formGlyph(form: FormState) {
  if (form === 'hot') return '🔥';
  if (form === 'cold') return '❄️';
  return '';
}

export function formLabel(form: FormState) {
  if (form === 'hot') return 'HOT';
  if (form === 'cold') return 'COLD';
  return 'STEADY';
}

/** Single-game batter stamp for box scores. */
export type GameStamp = 'good' | 'bad' | null;

export function batterGameStamp(b: {
  ab?: number;
  h?: number;
  r?: number;
  rbi?: number;
  so?: number;
  hr?: number;
  bb?: number;
}): GameStamp {
  const ab = Number(b.ab) || 0;
  const h = Number(b.h) || 0;
  const r = Number(b.r) || 0;
  const rbi = Number(b.rbi) || 0;
  const so = Number(b.so) || 0;
  const hr = Number(b.hr) || 0;

  // Good: multi-hit night, a homer, or a big RBI game.
  if (hr >= 1 || h >= 3 || rbi >= 3 || (h >= 2 && rbi >= 2)) return 'good';

  // Bad: enough chances, totally empty night, and punched out a lot.
  // 1-for-4 with 3 K is not automatically bad (still ~.250).
  if (ab >= 4 && h === 0 && r === 0 && rbi === 0 && so >= 3) return 'bad';
  if (ab >= 5 && h === 0 && r === 0 && rbi === 0 && so >= 2) return 'bad';

  return null;
}

function parseIp(ip?: string | number) {
  const [w, f] = String(ip ?? '0').split('.');
  return Number(w || 0) + Number(f || 0) / 3;
}

/** Baseball innings (6.1 = 6⅓) as a real number, for sorting and stamps. */
export function parseInnings(ip?: string | number) {
  return parseIp(ip);
}

/** Single-game pitcher stamp for logs and box scores. */
export function pitcherGameStamp(p: {
  ip?: string | number;
  er?: number;
  so?: number;
  h?: number;
}): GameStamp {
  const ip = parseIp(p.ip);
  const er = Number(p.er) || 0;
  const so = Number(p.so) || 0;

  if (ip < 1 && er < 3) return null;

  if ((ip >= 6 && er <= 1) || so >= 8 || (ip >= 5 && er === 0)) return 'good';
  if (er >= 4 || (ip <= 3 && er >= 3)) return 'bad';

  return null;
}
