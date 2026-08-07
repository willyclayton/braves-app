import type { HitWindow, PitchWindow } from '@/data/types';

export type FormState = 'hot' | 'cold' | 'neutral';

/** Hot/cold from a hitting sample window. */
export function formFromHitWindow(w?: HitWindow | null): FormState {
  if (!w) return 'neutral';
  const ab = Number(w.ab) || 0;
  const g = Number(w.g) || 0;
  if (ab < 6 && g < 3) return 'neutral';

  const ops = parseFloat(String(w.ops));
  const avg = parseFloat(String(w.avg));
  if (Number.isNaN(ops) && Number.isNaN(avg)) return 'neutral';

  if ((!Number.isNaN(ops) && ops >= 0.9) || (!Number.isNaN(avg) && avg >= 0.32)) {
    return 'hot';
  }
  if ((!Number.isNaN(ops) && ops <= 0.65) || (!Number.isNaN(avg) && avg <= 0.2)) {
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
  if (Number.isNaN(era) && Number.isNaN(whip)) return 'neutral';

  if ((!Number.isNaN(era) && era <= 2.5) || (!Number.isNaN(whip) && whip <= 1.0)) {
    return 'hot';
  }
  if ((!Number.isNaN(era) && era >= 5.0) || (!Number.isNaN(whip) && whip >= 1.55)) {
    return 'cold';
  }
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
