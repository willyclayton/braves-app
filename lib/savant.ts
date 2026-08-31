import { parseCsv } from './spray';

export const SAVANT_SEASON = 2026;

export type SavantGroup = 'hitting' | 'pitching';

export type SavantMetric = {
  key: string;
  label: string;
  percentile: number | null;
  value: string;
};

export type SavantSection = {
  key: 'value' | 'batting' | 'pitching' | 'fielding' | 'running';
  title: string;
  metrics: SavantMetric[];
};

export type SavantRolling = {
  window: number;
  values: number[];
  league: number;
};

export type SavantProfile = {
  playerId: number;
  season: number;
  group: SavantGroup;
  sections: SavantSection[];
  rolling: SavantRolling | null;
};

const CACHE_MS = 30 * 60 * 1000;
type CsvCache = { at: number; rows: Record<string, string>[] };
const csvCache = new Map<string, CsvCache>();
const rollingCache = new Map<string, { at: number; rolling: SavantRolling | null }>();

const PA_EVENTS = new Set([
  'single',
  'double',
  'triple',
  'home_run',
  'field_out',
  'force_out',
  'grounded_into_double_play',
  'double_play',
  'field_error',
  'strikeout',
  'walk',
  'intent_walk',
  'hit_by_pitch',
  'sac_fly',
  'fielders_choice',
  'fielders_choice_out',
  'catcher_interf',
  'other_out',
]);

function num(v: unknown) {
  if (v == null || v === '') return NaN;
  const x = Number(String(v).replace(/^[.]/, '0.'));
  return Number.isFinite(x) ? x : NaN;
}

function idOf(row: Record<string, string>) {
  return String(row.player_id || row.id || row.entity_id || '');
}

function findRow(rows: Record<string, string>[], playerId: number) {
  const id = String(playerId);
  return rows.find((r) => idOf(r) === id);
}

function fmtRate(v: number) {
  if (!Number.isFinite(v)) return '—';
  const n = v > 1 && v <= 1000 ? v / 1000 : v;
  return n.toFixed(3).replace(/^0/, '');
}

function fmtOne(v: number) {
  if (!Number.isFinite(v)) return '—';
  return (Math.round(v * 10) / 10).toFixed(1);
}

function fmtInt(v: number) {
  if (!Number.isFinite(v)) return '—';
  return String(Math.round(v));
}

function fmtPct(v: number) {
  if (!Number.isFinite(v)) return '—';
  const n = v <= 1 && v >= 0 ? v * 100 : v;
  return (Math.round(n * 10) / 10).toFixed(1);
}

function pctNum(v: unknown) {
  const n = num(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Rank-based percentile: 100 = best. */
function percentileAmong(
  rows: Record<string, string>[],
  playerId: number,
  get: (row: Record<string, string>) => number,
  higherBetter = true
) {
  const scored = rows
    .map((r) => ({ id: idOf(r), v: get(r) }))
    .filter((x) => x.id && Number.isFinite(x.v));
  if (scored.length < 2) return null;
  scored.sort((a, b) => (higherBetter ? b.v - a.v : a.v - b.v));
  const idx = scored.findIndex((x) => x.id === String(playerId));
  if (idx < 0) return null;
  return Math.round(((scored.length - 1 - idx) / (scored.length - 1)) * 100);
}

async function getText(url: string) {
  let lastErr: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BravesApp/1.0)' },
      });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt === 2) break;
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  throw lastErr || new Error('Failed to load Savant data');
}

async function loadCsv(url: string) {
  const hit = csvCache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rows;
  const text = await getText(url);
  const rows = parseCsv(text);
  csvCache.set(url, { at: Date.now(), rows });
  return rows;
}

function percentileUrl(type: 'batter' | 'pitcher') {
  return `https://baseballsavant.mlb.com/leaderboard/percentile-rankings?type=${type}&year=${SAVANT_SEASON}&position=&team=&csv=true`;
}

function customUrl(type: 'batter' | 'pitcher', selections: string) {
  return (
    `https://baseballsavant.mlb.com/leaderboard/custom?year=${SAVANT_SEASON}` +
    `&type=${type}&filter=&min=1&selections=${selections}&chart=false&csv=true`
  );
}

function metric(
  key: string,
  label: string,
  percentile: number | null,
  value: string
): SavantMetric | null {
  if (percentile == null && (value === '—' || !value)) return null;
  return { key, label, percentile, value };
}

function section(
  key: SavantSection['key'],
  title: string,
  metrics: (SavantMetric | null)[]
): SavantSection | null {
  const rows = metrics.filter((m): m is SavantMetric => m != null);
  if (!rows.length) return null;
  return { key, title, metrics: rows };
}

function batterSections(
  playerId: number,
  pct: Record<string, string> | undefined,
  raw: Record<string, string> | undefined,
  xrow: Record<string, string> | undefined,
  sc: Record<string, string> | undefined,
  sprint: Record<string, string> | undefined,
  bat: Record<string, string> | undefined,
  oaa: Record<string, string> | undefined,
  arm: Record<string, string> | undefined,
  brv: Record<string, string> | undefined,
  scRows: Record<string, string>[],
  brvRows: Record<string, string>[],
  oaaRows: Record<string, string>[]
): SavantSection[] {
  const battingRv = num(raw?.batting_run_value);
  const baseRv = num(brv?.runner_runs_tot);
  const fieldRv = num(raw?.fielding_run_value ?? oaa?.fielding_runs_prevented);

  const sweet = num(sc?.anglesweetspotpercent);
  const sweetPct = percentileAmong(scRows, playerId, (r) => num(r.anglesweetspotpercent), true);
  const basePct = percentileAmong(brvRows, playerId, (r) => num(r.runner_runs_tot), true);
  const fieldPct = percentileAmong(
    oaaRows,
    playerId,
    (r) => num(r.fielding_runs_prevented),
    true
  );

  const xwoba = num(raw?.xwoba ?? xrow?.est_woba);
  const xba = num(raw?.xba ?? xrow?.est_ba);
  const xslg = num(raw?.xslg ?? xrow?.est_slg);
  const ev = num(raw?.exit_velocity_avg ?? sc?.avg_hit_speed);
  const barrel = num(raw?.barrel_batted_rate ?? sc?.brl_percent);
  const hard = num(raw?.hard_hit_percent ?? sc?.ev95percent);
  const batSpeed = num(bat?.avg_bat_speed);
  const squared = num(bat?.squared_up_per_swing);
  const chase = num(raw?.oz_swing_percent);
  const whiff = num(raw?.whiff_percent);
  const k = num(raw?.k_percent);
  const bb = num(raw?.bb_percent);
  const oaaVal = num(oaa?.outs_above_average);
  const armVal = num(arm?.arm_overall ?? arm?.arm_of ?? arm?.arm_cf);
  const speed = num(sprint?.sprint_speed);

  return [
    section('value', 'Value', [
      metric('brv', 'Batting Run Value', pctNum(raw?.batting_run_value_pct), fmtInt(battingRv)),
      metric('base', 'Baserunning Run Value', basePct, fmtInt(baseRv)),
      metric('field', 'Fielding Run Value', fieldPct ?? pctNum(pct?.oaa), fmtInt(fieldRv)),
    ]),
    section('batting', 'Batting', [
      metric('xwoba', 'xwOBA', pctNum(pct?.xwoba), fmtRate(xwoba)),
      metric('xba', 'xBA', pctNum(pct?.xba), fmtRate(xba)),
      metric('xslg', 'xSLG', pctNum(pct?.xslg), fmtRate(xslg)),
      metric('ev', 'Avg Exit Velo', pctNum(pct?.exit_velocity), fmtOne(ev)),
      metric('barrel', 'Barrel %', pctNum(pct?.brl_percent), fmtPct(barrel)),
      metric('hard', 'Hard-Hit %', pctNum(pct?.hard_hit_percent), fmtPct(hard)),
      metric('sweet', 'LA Sweet-Spot %', sweetPct, fmtPct(sweet)),
      metric('batspeed', 'Bat Speed', pctNum(pct?.bat_speed), fmtOne(batSpeed)),
      metric('squared', 'Squared-Up %', pctNum(pct?.squared_up_rate), fmtPct(squared)),
      metric('chase', 'Chase %', pctNum(pct?.chase_percent), fmtPct(chase)),
      metric('whiff', 'Whiff %', pctNum(pct?.whiff_percent), fmtPct(whiff)),
      metric('k', 'K %', pctNum(pct?.k_percent), fmtPct(k)),
      metric('bb', 'BB %', pctNum(pct?.bb_percent), fmtPct(bb)),
    ]),
    section('fielding', 'Fielding', [
      metric('oaa', 'Range (OAA)', pctNum(pct?.oaa), fmtInt(oaaVal)),
      metric('arm', 'Arm Strength', pctNum(pct?.arm_strength), fmtOne(armVal)),
    ]),
    section('running', 'Running', [
      metric('sprint', 'Sprint Speed', pctNum(pct?.sprint_speed), fmtOne(speed)),
    ]),
  ].filter((s): s is SavantSection => s != null);
}

function pitcherSections(
  pct: Record<string, string> | undefined,
  raw: Record<string, string> | undefined,
  xrow: Record<string, string> | undefined
): SavantSection[] {
  const xwoba = num(raw?.xwoba ?? xrow?.est_woba);
  const xba = num(raw?.xba ?? xrow?.est_ba);
  const xslg = num(raw?.xslg ?? xrow?.est_slg);
  const xera = num(raw?.xera ?? xrow?.xera);
  const ev = num(raw?.exit_velocity_avg);
  const barrel = num(raw?.barrel_batted_rate);
  const hard = num(raw?.hard_hit_percent);
  const chase = num(raw?.oz_swing_percent);
  const whiff = num(raw?.whiff_percent);
  const k = num(raw?.k_percent);
  const bb = num(raw?.bb_percent);
  const fb = num(raw?.fastball_avg_speed);

  return [
    section('pitching', 'Pitching', [
      metric('xera', 'xERA', pctNum(pct?.xera), Number.isFinite(xera) ? xera.toFixed(2) : '—'),
      metric('xwoba', 'xwOBA', pctNum(pct?.xwoba), fmtRate(xwoba)),
      metric('xba', 'xBA', pctNum(pct?.xba), fmtRate(xba)),
      metric('xslg', 'xSLG', pctNum(pct?.xslg), fmtRate(xslg)),
      metric('fb', 'Fastball Velo', pctNum(pct?.fb_velocity), fmtOne(fb)),
      metric('ev', 'Avg Exit Velo', pctNum(pct?.exit_velocity), fmtOne(ev)),
      metric('barrel', 'Barrel %', pctNum(pct?.brl_percent), fmtPct(barrel)),
      metric('hard', 'Hard-Hit %', pctNum(pct?.hard_hit_percent), fmtPct(hard)),
      metric('chase', 'Chase %', pctNum(pct?.chase_percent), fmtPct(chase)),
      metric('whiff', 'Whiff %', pctNum(pct?.whiff_percent), fmtPct(whiff)),
      metric('k', 'K %', pctNum(pct?.k_percent), fmtPct(k)),
      metric('bb', 'BB %', pctNum(pct?.bb_percent), fmtPct(bb)),
    ]),
  ].filter((s): s is SavantSection => s != null);
}

function rollingFromPitches(rows: Record<string, string>[], window = 100): number[] {
  const pas: { date: string; ab: number; pitch: number; x: number }[] = [];
  for (const row of rows) {
    const ev = (row.events || '').trim();
    if (!PA_EVENTS.has(ev)) continue;
    const est = num(row.estimated_woba_using_speedangle);
    const woba = num(row.woba_value);
    const x = Number.isFinite(est) ? est : woba;
    if (!Number.isFinite(x)) continue;
    pas.push({
      date: row.game_date || '',
      ab: num(row.at_bat_number) || 0,
      pitch: num(row.pitch_number) || 0,
      x,
    });
  }
  pas.sort((a, b) => a.date.localeCompare(b.date) || a.ab - b.ab || a.pitch - b.pitch);
  if (pas.length < 8) return [];
  const vals = pas.map((p) => p.x);
  const w = Math.min(window, vals.length);
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < vals.length; i++) {
    sum += vals[i];
    if (i >= w) sum -= vals[i - w];
    if (i >= w - 1) out.push(sum / w);
  }
  return out;
}

async function loadRolling(playerId: number, group: SavantGroup): Promise<SavantRolling | null> {
  const key = `${group}-${playerId}`;
  const hit = rollingCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.rolling;

  const lookup = group === 'pitching' ? 'pitchers_lookup' : 'batters_lookup';
  const playerType = group === 'pitching' ? 'pitcher' : 'batter';
  const url =
    `https://baseballsavant.mlb.com/statcast_search/csv?all=true&type=details` +
    `&hfSea=${SAVANT_SEASON}%7C&hfGT=R%7C&min_pas=0&player_type=${playerType}` +
    `&${lookup}%5B%5D=${playerId}`;

  try {
    const rows = await loadCsv(url);
    const values = rollingFromPitches(rows, 100);
    const rolling = values.length
      ? { window: Math.min(100, values.length + 99 > 100 ? 100 : values.length), values, league: 0.31 }
      : null;
    if (rolling && values.length < 100) rolling.window = Math.min(100, values.length);
    rollingCache.set(key, { at: Date.now(), rolling });
    return rolling;
  } catch {
    rollingCache.set(key, { at: Date.now(), rolling: null });
    return null;
  }
}

function leagueXwoba(rows: Record<string, string>[]) {
  const vals = rows.map((r) => num(r.est_woba)).filter((v) => Number.isFinite(v) && v > 0.1 && v < 0.6);
  if (!vals.length) return 0.31;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export async function loadPlayerSavant(
  playerId: number,
  group: SavantGroup
): Promise<SavantProfile> {
  const type = group === 'pitching' ? 'pitcher' : 'batter';
  const batterCustom =
    'batting_run_value,baserunning_run_value,fielding_run_value,k_percent,bb_percent,whiff_percent,oz_swing_percent,exit_velocity_avg,barrel_batted_rate,hard_hit_percent,xwoba,xba,xslg';
  const pitcherCustom =
    'xwoba,xba,xslg,xera,k_percent,bb_percent,whiff_percent,oz_swing_percent,exit_velocity_avg,barrel_batted_rate,hard_hit_percent,fastball_avg_speed';

  const [pctRows, customRows, xRows, scRows, sprintRows, batRows, oaaRows, armRows, brvRows, rolling] =
    await Promise.all([
      loadCsv(percentileUrl(type)),
      loadCsv(customUrl(type, group === 'pitching' ? pitcherCustom : batterCustom)),
      loadCsv(
        `https://baseballsavant.mlb.com/leaderboard/expected_statistics?type=${type}&year=${SAVANT_SEASON}&min=1&csv=true`
      ),
      group === 'hitting'
        ? loadCsv(
            `https://baseballsavant.mlb.com/leaderboard/statcast?type=batter&year=${SAVANT_SEASON}&min=1&csv=true`
          )
        : Promise.resolve([] as Record<string, string>[]),
      group === 'hitting'
        ? loadCsv(
            `https://baseballsavant.mlb.com/leaderboard/sprint_speed?year=${SAVANT_SEASON}&min=1&csv=true`
          )
        : Promise.resolve([] as Record<string, string>[]),
      group === 'hitting'
        ? loadCsv(
            `https://baseballsavant.mlb.com/leaderboard/bat-tracking?year=${SAVANT_SEASON}&type=batter&csv=true`
          )
        : Promise.resolve([] as Record<string, string>[]),
      group === 'hitting'
        ? loadCsv(
            `https://baseballsavant.mlb.com/leaderboard/outs_above_average?year=${SAVANT_SEASON}&csv=true`
          )
        : Promise.resolve([] as Record<string, string>[]),
      group === 'hitting'
        ? loadCsv(
            `https://baseballsavant.mlb.com/leaderboard/arm-strength?year=${SAVANT_SEASON}&csv=true`
          )
        : Promise.resolve([] as Record<string, string>[]),
      group === 'hitting'
        ? loadCsv(
            `https://baseballsavant.mlb.com/leaderboard/baserunning-run-value?year=${SAVANT_SEASON}&csv=true`
          )
        : Promise.resolve([] as Record<string, string>[]),
      loadRolling(playerId, group),
    ]);

  const pct = findRow(pctRows, playerId);
  const raw = findRow(customRows, playerId);
  const xrow = findRow(xRows, playerId);
  const sc = findRow(scRows, playerId);
  const sprint = findRow(sprintRows, playerId);
  const bat = findRow(batRows, playerId);
  const oaa = findRow(oaaRows, playerId);
  const arm = findRow(armRows, playerId);
  const brv = findRow(brvRows, playerId);

  const sections =
    group === 'pitching'
      ? pitcherSections(pct, raw, xrow)
      : batterSections(
          playerId,
          pct,
          raw,
          xrow,
          sc,
          sprint,
          bat,
          oaa,
          arm,
          brv,
          scRows,
          brvRows,
          oaaRows
        );

  const lg = leagueXwoba(xRows);
  const rollingOut = rolling ? { ...rolling, league: Math.round(lg * 1000) / 1000 } : null;

  return {
    playerId,
    season: SAVANT_SEASON,
    group,
    sections,
    rolling: rollingOut,
  };
}

/** Savant-style cool → warm scale (poor blue → great red). */
export function savantPercentileColor(pct: number) {
  if (pct >= 90) return '#C81D25';
  if (pct >= 80) return '#E31B23';
  if (pct >= 70) return '#E04A5A';
  if (pct >= 60) return '#E88A8A';
  if (pct >= 45) return '#A8B0BC';
  if (pct >= 30) return '#7BA3C9';
  if (pct >= 15) return '#3D6FA8';
  return '#24478F';
}

export function savantTrackColor(pct: number) {
  if (pct >= 60) return '#F7E4E4';
  if (pct >= 45) return '#ECEDEF';
  return '#E4EAF3';
}
