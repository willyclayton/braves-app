import type {
  HitGameLog,
  HitWindow,
  Hitter,
  PitchGameLog,
  PitchWindow,
  Pitcher,
  WindowKey,
} from '@/data/types';
import { formatInnings, parseInnings } from '@/lib/form';

export const WINDOW_SIZE: Record<WindowKey, number> = {
  l5: 5,
  l10: 10,
  l20: 20,
  l30: 30,
};

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Baseball rate string: .266, 1.019 */
export function rateStr(value: number, digits = 3) {
  if (!Number.isFinite(value) || value < 0) return digits === 3 ? '.000' : '0.00';
  const s = value.toFixed(digits);
  if (digits === 3 && s.startsWith('0')) return s.slice(1);
  return s;
}

export function hitWindowFromLog(log: HitGameLog[] | undefined, games: number): HitWindow | null {
  if (!log?.length || games < 1) return null;
  const slice = log.slice(-games);
  let ab = 0;
  let h = 0;
  let hr = 0;
  let r = 0;
  let rbi = 0;
  let bb = 0;
  let so = 0;
  let sb = 0;
  let doubles = 0;
  let triples = 0;
  let hbp = 0;
  let sf = 0;
  let tb = 0;
  let hasTb = false;
  for (const g of slice) {
    ab += n(g.ab);
    h += n(g.h);
    hr += n(g.hr);
    r += n(g.r);
    rbi += n(g.rbi);
    bb += n(g.bb);
    so += n(g.so);
    sb += n(g.sb);
    doubles += n(g.doubles);
    triples += n(g.triples);
    hbp += n(g.hbp);
    sf += n(g.sf);
    if (g.tb != null) {
      hasTb = true;
      tb += n(g.tb);
    }
  }
  if (!hasTb) {
    const singles = Math.max(0, h - doubles - triples - hr);
    tb = singles + 2 * doubles + 3 * triples + 4 * hr;
  }
  const obpDen = ab + bb + hbp + sf;
  const avg = ab > 0 ? h / ab : 0;
  const obp = obpDen > 0 ? (h + bb + hbp) / obpDen : 0;
  const slg = ab > 0 ? tb / ab : 0;
  return {
    g: slice.length,
    avg: rateStr(avg),
    ops: rateStr(obp + slg),
    obp: rateStr(obp),
    slg: rateStr(slg),
    hr,
    h,
    ab,
    r,
    rbi,
    bb,
    so,
    sb,
    doubles,
    triples,
  };
}

export function pitchWindowFromLog(
  log: PitchGameLog[] | undefined,
  games: number
): PitchWindow | null {
  if (!log?.length || games < 1) return null;
  const slice = log.slice(-games);
  let outs = 0;
  let h = 0;
  let r = 0;
  let er = 0;
  let bb = 0;
  let so = 0;
  for (const g of slice) {
    outs += Math.round(parseInnings(g.ip) * 3);
    h += n(g.h);
    r += n(g.r);
    er += n(g.er);
    bb += n(g.bb);
    so += n(g.so);
  }
  const ip = outs / 3;
  const era = ip > 0 ? (er * 9) / ip : 0;
  const whip = ip > 0 ? (h + bb) / ip : 0;
  return {
    g: slice.length,
    ip: formatInnings(ip),
    era: ip > 0 ? era.toFixed(2) : '—',
    whip: ip > 0 ? whip.toFixed(2) : '—',
    so,
    bb,
    h,
    er,
  };
}

export function resolveHitWindow(
  player: Pick<Hitter, 'log' | 'windows' | 'season'>,
  key: WindowKey
): HitWindow {
  return (
    hitWindowFromLog(player.log, WINDOW_SIZE[key]) ||
    player.windows[key] ||
    player.season
  );
}

export function resolvePitchWindow(
  player: Pick<Pitcher, 'log' | 'windows' | 'season'>,
  key: WindowKey
): PitchWindow {
  return (
    pitchWindowFromLog(player.log, WINDOW_SIZE[key]) ||
    player.windows[key] ||
    player.season
  );
}
