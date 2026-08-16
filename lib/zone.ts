import { parseCsv } from './spray';

export type ZoneTemp = 'hot' | 'warm' | 'lukewarm' | 'cool' | 'cold';

export type ZoneCell = {
  id: string;
  value: number | null;
  display: string;
  temp: ZoneTemp | null;
};

export type ZoneMetric = {
  key: string;
  label: string;
  /** False when a low value is the pitcher's strength (e.g. SLG against). */
  higherIsBetter: boolean;
  cells: ZoneCell[];
};

export type PitchType = {
  code: string;
  name: string;
  pct: number;
  count: number;
  velo: number;
  /** Location heatmap for this pitch (Use% / Strike%). Empty if Savant is down. */
  metrics: ZoneMetric[];
};

export type PlayerZone = {
  playerId: number;
  group: 'hitting' | 'pitching';
  metrics: ZoneMetric[];
  pitchTypes: PitchType[];
};

const SEASON = 2026;

const METRIC_META: Record<
  string,
  { label: string; higherIsBetter: (group: PlayerZone['group']) => boolean }
> = {
  sluggingPercentage: {
    label: 'SLG',
    higherIsBetter: (g) => g === 'hitting',
  },
  battingAverage: {
    label: 'AVG',
    higherIsBetter: (g) => g === 'hitting',
  },
  exitVelocity: {
    label: 'EV',
    higherIsBetter: () => true,
  },
  onBasePlusSlugging: {
    label: 'OPS',
    higherIsBetter: (g) => g === 'hitting',
  },
  numberOfPitches: {
    label: 'Pitches',
    higherIsBetter: () => true,
  },
  numberOfStrikes: {
    label: 'Strikes',
    higherIsBetter: () => true,
  },
};

const KEEP_HITTING = ['sluggingPercentage', 'battingAverage', 'exitVelocity'];
const KEEP_PITCHING = ['sluggingPercentage', 'battingAverage'];

export const ZONE_IDS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '11', '12', '13', '14'];

const CACHE_MS = 30 * 60 * 1000;
type PitchCache = { at: number; rows: Record<string, string>[] };
const pitchCache = new Map<number, PitchCache>();

function parseVal(raw: string): number | null {
  if (!raw || raw === '-') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatVal(key: string, n: number | null) {
  if (n == null) return '—';
  if (key === 'exitVelocity') return n.toFixed(1);
  if (key === 'numberOfPitches' || key === 'numberOfStrikes') return String(Math.round(n));
  if (key === 'strikePct' || key === 'usePct') return `${Math.round(n)}%`;
  if (n >= 0 && n < 1) return n.toFixed(3).replace(/^0/, '');
  return n.toFixed(3).replace(/^0/, '');
}

function asTemp(raw?: string): ZoneTemp | null {
  if (raw === 'hot' || raw === 'warm' || raw === 'lukewarm' || raw === 'cool' || raw === 'cold') {
    return raw;
  }
  return null;
}

type MlbZone = { zone?: string; value?: string; temp?: string };
type MlbSplit = { stat?: { name?: string; zones?: MlbZone[] } };
type MlbArsenal = {
  percentage?: number;
  count?: number;
  averageSpeed?: number;
  type?: { code?: string; description?: string };
};

function metricFromSplit(
  name: string,
  zones: MlbZone[],
  group: PlayerZone['group']
): ZoneMetric | null {
  const meta = METRIC_META[name];
  if (!meta) return null;
  return {
    key: name,
    label: meta.label,
    higherIsBetter: meta.higherIsBetter(group),
    cells: zones.map((z) => {
      const value = parseVal(String(z.value ?? ''));
      return {
        id: String(z.zone || '').padStart(2, '0'),
        value,
        display: formatVal(name, value),
        temp: asTemp(z.temp),
      };
    }),
  };
}

function strikeMetric(pitches: ZoneMetric, strikes: ZoneMetric): ZoneMetric {
  const byId = new Map(strikes.cells.map((c) => [c.id, c]));
  return {
    key: 'strikePct',
    label: 'Strike%',
    higherIsBetter: true,
    cells: pitches.cells.map((p) => {
      const s = byId.get(p.id);
      const pct =
        p.value && p.value > 0 && s?.value != null ? (s.value / p.value) * 100 : null;
      return {
        id: p.id,
        value: pct,
        display: formatVal('strikePct', pct),
        temp: null,
      };
    }),
  };
}

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export async function loadPlayerZone(
  playerId: number,
  group: 'hitting' | 'pitching'
): Promise<PlayerZone> {
  const zoneUrl = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=hotColdZones&group=${group}&season=${SEASON}`;
  const [zoneRes, arsenalRes, pitchZones] = await Promise.all([
    getJson(zoneUrl),
    group === 'pitching'
      ? getJson(
          `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=pitchArsenal&group=pitching&season=${SEASON}`
        ).catch(() => ({ stats: [] }))
      : Promise.resolve({ stats: [] }),
    group === 'pitching'
      ? loadPitchTypeZones(playerId).catch(() => new Map<string, ZoneMetric[]>())
      : Promise.resolve(new Map<string, ZoneMetric[]>()),
  ]);

  const keep = group === 'pitching' ? KEEP_PITCHING : KEEP_HITTING;
  const splits: MlbSplit[] = zoneRes.stats?.[0]?.splits || [];
  const metrics: ZoneMetric[] = [];
  for (const name of keep) {
    const split = splits.find((s) => s.stat?.name === name);
    if (!split?.stat?.zones) continue;
    const m = metricFromSplit(name, split.stat.zones, group);
    if (m) metrics.push(m);
  }

  if (group === 'pitching') {
    const pitchSplit = splits.find((s) => s.stat?.name === 'numberOfPitches');
    const strikeSplit = splits.find((s) => s.stat?.name === 'numberOfStrikes');
    const pitches = pitchSplit?.stat?.zones
      ? metricFromSplit('numberOfPitches', pitchSplit.stat.zones, group)
      : null;
    const strikes = strikeSplit?.stat?.zones
      ? metricFromSplit('numberOfStrikes', strikeSplit.stat.zones, group)
      : null;
    if (pitches && strikes) metrics.push(strikeMetric(pitches, strikes));
  }

  const arsenalSplits: { stat?: MlbArsenal }[] = arsenalRes.stats?.[0]?.splits || [];
  const pitchTypes: PitchType[] = arsenalSplits
    .map((row) => row.stat)
    .filter((stat): stat is MlbArsenal => !!stat?.type?.code)
    .map((stat) => ({
      code: stat.type!.code!,
      name: (stat.type!.description || stat.type!.code!).replace('Four-seam FB', '4-seam'),
      pct: Math.round((stat.percentage || 0) * 100),
      count: stat.count || 0,
      velo: stat.averageSpeed ? Math.round(stat.averageSpeed * 10) / 10 : 0,
      metrics: [] as ZoneMetric[],
    }))
    .sort((a, b) => b.count - a.count);

  if (group === 'pitching' && pitchTypes.length) {
    for (const p of pitchTypes) {
      p.metrics = pitchZones.get(p.code) || [];
    }
  }

  return { playerId, group, metrics, pitchTypes };
}

function padZone(raw: string) {
  const z = String(raw || '').trim();
  return z ? z.padStart(2, '0') : '';
}

function shareCells(counts: Record<string, number>, total: number): ZoneCell[] {
  const raw = ZONE_IDS.map((id) => {
    const n = counts[id] || 0;
    const exact = total ? (n / total) * 100 : 0;
    return { id, n, exact, pct: n ? Math.floor(exact) : 0, frac: exact - Math.floor(exact) };
  });
  let leftover = total ? 100 - raw.reduce((s, r) => s + r.pct, 0) : 0;
  [...raw]
    .filter((r) => r.n > 0)
    .sort((a, b) => b.frac - a.frac)
    .forEach((r) => {
      if (leftover <= 0) return;
      r.pct += 1;
      leftover -= 1;
    });
  return raw.map((r) => ({
    id: r.id,
    value: total ? r.pct : null,
    display: formatVal('usePct', total ? r.pct : null),
    temp: null,
  }));
}

export function metricsFromPitchRows(rows: Record<string, string>[]): Map<string, ZoneMetric[]> {
  const grouped = new Map<string, { counts: Record<string, number>; strikes: Record<string, number>; total: number }>();
  for (const row of rows) {
    const code = String(row.pitch_type || '').toUpperCase();
    const id = padZone(row.zone);
    if (!code || !ZONE_IDS.includes(id)) continue;
    let g = grouped.get(code);
    if (!g) {
      g = { counts: {}, strikes: {}, total: 0 };
      grouped.set(code, g);
    }
    g.counts[id] = (g.counts[id] || 0) + 1;
    g.total += 1;
    if (row.type === 'S' || row.type === 'X') {
      g.strikes[id] = (g.strikes[id] || 0) + 1;
    }
  }

  const out = new Map<string, ZoneMetric[]>();
  for (const [code, g] of grouped) {
    out.set(code, [
      {
        key: 'usePct',
        label: 'Use%',
        higherIsBetter: true,
        cells: shareCells(g.counts, g.total),
      },
      {
        key: 'strikePct',
        label: 'Strike%',
        higherIsBetter: true,
        cells: ZONE_IDS.map((id) => {
          const n = g.counts[id] || 0;
          const pct = n ? ((g.strikes[id] || 0) / n) * 100 : null;
          return {
            id,
            value: pct,
            display: formatVal('strikePct', pct),
            temp: null,
          };
        }),
      },
    ]);
  }
  return out;
}

async function getText(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function loadPitchTypeZones(playerId: number) {
  const hit = pitchCache.get(playerId);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return metricsFromPitchRows(hit.rows);
  }
  const url =
    `https://baseballsavant.mlb.com/statcast_search/csv?all=true&type=details` +
    `&player_type=pitcher&pitchers_lookup%5B%5D=${playerId}` +
    `&hfSea=${SEASON}%7C&hfGT=R%7C&min_pitches=1`;
  const text = await getText(url);
  const rows = parseCsv(text);
  pitchCache.set(playerId, { at: Date.now(), rows });
  return metricsFromPitchRows(rows);
}

const TEMP_RANK: Record<string, number> = {
  cold: 0,
  cool: 1,
  lukewarm: 2,
  warm: 3,
  hot: 4,
};

/** 0 = weak, 1 = strong, after applying higherIsBetter. */
export function cellStrength(cell: ZoneCell, metric: ZoneMetric, cells: ZoneCell[]) {
  if (cell.temp && !metric.key.startsWith('strike') && metric.key !== 'numberOfPitches') {
    const t = TEMP_RANK[cell.temp] / 4;
    return metric.higherIsBetter ? t : 1 - t;
  }
  const vals = cells.map((c) => c.value).filter((v): v is number => v != null);
  if (cell.value == null || vals.length < 2) return 0.45;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (max === min) return 0.45;
  const t = (cell.value - min) / (max - min);
  return metric.higherIsBetter ? t : 1 - t;
}

export function strengthColor(t: number) {
  if (t >= 0.8) return '#C41E3A';
  if (t >= 0.62) return '#E04A5A';
  if (t >= 0.48) return '#C4A36A';
  if (t >= 0.32) return '#5B8FBF';
  return '#1E4A7A';
}
