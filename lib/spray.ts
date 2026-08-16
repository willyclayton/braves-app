export type SprayResult = 'single' | 'double' | 'triple' | 'home_run';

export type SprayEvent = {
  date: string;
  gamePk?: number;
  result: SprayResult;
  /** Feet from home toward right field (negative = left). */
  x: number;
  /** Feet from home toward center field. */
  y: number;
  ev?: number;
  la?: number;
  dist?: number;
  desc?: string;
};

export type PlayerSpray = {
  playerId: number;
  season: number;
  stand: 'L' | 'R' | 'S';
  events: SprayEvent[];
};

export type SprayZoneKey =
  | '3b'
  | 'ss'
  | '2b'
  | '1b'
  | 'lf'
  | 'lcf'
  | 'cf'
  | 'rcf'
  | 'rf';

export type SprayZone = {
  key: SprayZoneKey;
  label: string;
  ring: 'infield' | 'outfield';
  /** Degrees from CF; negative is left field. */
  a0: number;
  a1: number;
  r0: number;
  r1: number;
};

export const SPRAY_ZONES: SprayZone[] = [
  { key: '3b', label: '3B', ring: 'infield', a0: -45, a1: -14, r0: 20, r1: 155 },
  { key: 'ss', label: 'SS', ring: 'infield', a0: -14, a1: 0, r0: 20, r1: 155 },
  { key: '2b', label: '2B', ring: 'infield', a0: 0, a1: 14, r0: 20, r1: 155 },
  { key: '1b', label: '1B', ring: 'infield', a0: 14, a1: 45, r0: 20, r1: 155 },
  { key: 'lf', label: 'LF', ring: 'outfield', a0: -45, a1: -27, r0: 155, r1: 430 },
  { key: 'lcf', label: 'LCF', ring: 'outfield', a0: -27, a1: -10, r0: 155, r1: 430 },
  { key: 'cf', label: 'CF', ring: 'outfield', a0: -10, a1: 10, r0: 155, r1: 430 },
  { key: 'rcf', label: 'RCF', ring: 'outfield', a0: 10, a1: 27, r0: 155, r1: 430 },
  { key: 'rf', label: 'RF', ring: 'outfield', a0: 27, a1: 45, r0: 155, r1: 430 },
];

const RESULTS = new Set<SprayResult>(['single', 'double', 'triple', 'home_run']);
const SEASON = 2026;
const BRAVES_ABBR = 'ATL';
const SAVANT =
  'https://baseballsavant.mlb.com/statcast_search/csv?all=true&type=details&hfSea=' +
  `${SEASON}%7C&hfGT=R%7C&team=${BRAVES_ABBR}` +
  '&hfAB=single%7Cdouble%7Ctriple%7Chome%5C.%5C.run%7C&min_pas=0';

const HC_X0 = 125.42;
const HC_Y0 = 198.27;
const HC_SCALE = 2.495;

type TeamCache = { at: number; rows: Record<string, string>[] };
const teamCache = new Map<string, TeamCache>();
const CACHE_MS = 30 * 60 * 1000;

export function statcastToFeet(hcX: number, hcY: number) {
  return {
    x: (hcX - HC_X0) * HC_SCALE,
    y: (HC_Y0 - hcY) * HC_SCALE,
  };
}

export function sprayPolar(x: number, y: number) {
  const dist = Math.hypot(x, y);
  const angle = (Math.atan2(x, y) * 180) / Math.PI;
  return { dist, angle };
}

export function wallDistance(angleDeg: number) {
  const a = Math.min(1, Math.abs(angleDeg) / 45);
  return 400 - 70 * a * a;
}

export function assignZone(x: number, y: number): SprayZoneKey | null {
  const { dist, angle } = sprayPolar(x, y);
  if (dist < 8) return null;
  const clamped = Math.max(-44.99, Math.min(44.99, angle));
  const ring = dist < 155 ? 'infield' : 'outfield';
  for (const z of SPRAY_ZONES) {
    if (z.ring !== ring) continue;
    if (clamped >= z.a0 && clamped < z.a1) return z.key;
  }
  return ring === 'infield' ? (clamped < 0 ? '3b' : '1b') : clamped < 0 ? 'lf' : 'rf';
}

export function zoneCounts(events: SprayEvent[]) {
  const counts = Object.fromEntries(SPRAY_ZONES.map((z) => [z.key, 0])) as Record<
    SprayZoneKey,
    number
  >;
  for (const e of events) {
    const key = assignZone(e.x, e.y);
    if (key) counts[key] += 1;
  }
  return counts;
}

/** Percent of all hits in the sample (0% zones stay 0; hits always show at least 1%). */
export function zonePercents(events: SprayEvent[]) {
  const counts = zoneCounts(events);
  const total = events.length;
  const pcts = Object.fromEntries(SPRAY_ZONES.map((z) => [z.key, 0])) as Record<
    SprayZoneKey,
    number
  >;
  if (!total) return pcts;
  for (const z of SPRAY_ZONES) {
    const n = counts[z.key];
    if (!n) continue;
    pcts[z.key] = Math.max(1, Math.round((n / total) * 100));
  }
  return pcts;
}

export type FieldThird = 'pull' | 'center' | 'oppo';

export function fieldThird(x: number, y: number, stand: PlayerSpray['stand']): FieldThird {
  const { angle } = sprayPolar(x, y);
  if (Math.abs(angle) <= 12) return 'center';
  if (stand === 'L') return angle > 0 ? 'pull' : 'oppo';
  return angle < 0 ? 'pull' : 'oppo';
}

export function thirdPercents(events: SprayEvent[], stand: PlayerSpray['stand']) {
  const counts = { pull: 0, center: 0, oppo: 0 };
  for (const e of events) counts[fieldThird(e.x, e.y, stand)] += 1;
  const total = events.length || 1;
  const pct = (n: number) => (events.length ? Math.round((n / total) * 100) : 0);
  return {
    pull: pct(counts.pull),
    center: pct(counts.center),
    oppo: pct(counts.oppo),
    counts,
  };
}

export function summarizeSpray(events: SprayEvent[], stand: PlayerSpray['stand']) {
  let pull = 0;
  let center = 0;
  let oppo = 0;
  for (const e of events) {
    const { angle } = sprayPolar(e.x, e.y);
    if (Math.abs(angle) <= 10) center += 1;
    else if (stand === 'L') {
      if (angle > 0) pull += 1;
      else oppo += 1;
    } else if (angle < 0) pull += 1;
    else oppo += 1;
  }
  const n = events.length || 1;
  const pct = (v: number) => Math.round((v / n) * 100);
  return {
    total: events.length,
    singles: events.filter((e) => e.result === 'single').length,
    doubles: events.filter((e) => e.result === 'double').length,
    triples: events.filter((e) => e.result === 'triple').length,
    homers: events.filter((e) => e.result === 'home_run').length,
    pull: pct(pull),
    center: pct(center),
    oppo: pct(oppo),
  };
}

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (c === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string): Record<string, string>[] {
  const raw = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = raw.split('\n').filter((l) => l.length > 0);
  if (!lines.length) return [];
  const headers = parseCsvRow(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    const cells = parseCsvRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function estimateLanding(dist: number, desc: string) {
  let angle = 0;
  if (/left center/i.test(desc)) angle = -20;
  else if (/right center/i.test(desc)) angle = 20;
  else if (/left/i.test(desc)) angle = -34;
  else if (/right/i.test(desc)) angle = 34;
  const rad = (angle * Math.PI) / 180;
  const d = dist || 400;
  return { x: Math.sin(rad) * d, y: Math.cos(rad) * d };
}

function rowToEvent(row: Record<string, string>): SprayEvent | null {
  const result = row.events as SprayResult;
  if (!RESULTS.has(result)) return null;
  const hcX = n(row.hc_x);
  const hcY = n(row.hc_y);
  const dist = n(row.hit_distance_sc);
  const desc = (row.des || '').trim();
  let x: number;
  let y: number;
  if (Number.isFinite(hcX) && Number.isFinite(hcY)) {
    const ft = statcastToFeet(hcX, hcY);
    x = ft.x;
    y = ft.y;
  } else if (Number.isFinite(dist) || desc) {
    const est = estimateLanding(Number.isFinite(dist) ? dist : 400, desc);
    x = est.x;
    y = est.y;
  } else {
    return null;
  }
  const ev = n(row.launch_speed);
  const la = n(row.launch_angle);
  const gamePk = n(row.game_pk);
  return {
    date: row.game_date || '',
    gamePk: Number.isFinite(gamePk) ? gamePk : undefined,
    result,
    x,
    y,
    ev: Number.isFinite(ev) ? ev : undefined,
    la: Number.isFinite(la) ? la : undefined,
    dist: Number.isFinite(dist) ? dist : Math.round(Math.hypot(x, y)),
    desc: desc.slice(0, 140) || undefined,
  };
}

function majorityStand(rows: Record<string, string>[]): PlayerSpray['stand'] {
  let l = 0;
  let r = 0;
  for (const row of rows) {
    if (row.stand === 'L') l += 1;
    if (row.stand === 'R') r += 1;
  }
  if (l && r) return 'S';
  return l >= r ? 'L' : 'R';
}

async function getText(url: string) {
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt === 2) break;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  throw lastErr || new Error('Failed to load spray data');
}

async function loadTeamRows(group: 'hitting' | 'pitching') {
  const key = group;
  const hit = teamCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  const playerType = group === 'pitching' ? 'pitcher' : 'batter';
  const text = await getText(`${SAVANT}&player_type=${playerType}`);
  const rows = parseCsv(text);
  teamCache.set(key, { at: Date.now(), rows });
  return rows;
}

export function eventsFromRows(
  rows: Record<string, string>[],
  playerId: number,
  group: 'hitting' | 'pitching'
) {
  const col = group === 'pitching' ? 'pitcher' : 'batter';
  const id = String(playerId);
  const mine = rows.filter((r) => r[col] === id);
  const events: SprayEvent[] = [];
  for (const row of mine) {
    const ev = rowToEvent(row);
    if (ev) events.push(ev);
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return { events, stand: majorityStand(mine) };
}

export async function loadPlayerSpray(
  playerId: number,
  group: 'hitting' | 'pitching'
): Promise<PlayerSpray> {
  const rows = await loadTeamRows(group);
  const { events, stand } = eventsFromRows(rows, playerId, group);
  return { playerId, season: SEASON, stand, events };
}

export function filterSprayByDates(events: SprayEvent[], dates: string[]) {
  if (!dates.length) return events;
  const set = new Set(dates);
  return events.filter((e) => set.has(e.date));
}
