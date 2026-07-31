import type { TrendWindow } from '@/data/types';

export type FormState = 'hot' | 'cold' | 'neutral';

/** Hot/cold from the selected sample window (L10 / L15 / L30). */
export function formFromWindow(w?: TrendWindow | null): FormState {
  if (!w) return 'neutral';
  const ab = Number(w.ab) || 0;
  const g = Number(w.g) || 0;
  if (ab < 8 && g < 4) return 'neutral';

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

export function formGlyph(form: FormState) {
  if (form === 'hot') return '🔥';
  if (form === 'cold') return '❄️';
  return '';
}
