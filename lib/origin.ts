export type OriginLevel =
  | 'MLB'
  | 'AAA'
  | 'AA'
  | 'A+'
  | 'A'
  | 'ROK'
  | 'KBO'
  | 'NPB'
  | 'College'
  | 'Other';

export type OriginStint = {
  from: number;
  to: number;
  team: string;
  abbr?: string;
  teamId?: number;
  level: OriginLevel;
  org?: string;
  orgId?: number;
  orgAbbr?: string;
  summary?: string;
  kind: 'mlb' | 'minors' | 'intl' | 'draft' | 'college';
  note?: string;
};

export type OriginDraft = {
  year: number;
  team: string;
  teamId?: number;
  round: string;
  pick?: number;
  school?: string;
  signed: boolean;
};

export type OriginArrival = {
  date?: string;
  year?: number;
  type: string;
  typeCode?: string;
  fromTeam?: string;
  description: string;
  resignedYear?: number;
};

export type PlayerOrigin = {
  name: string;
  debut?: string;
  birthplace?: string;
  summary: string;
  path: 'homegrown' | 'trade' | 'waiver' | 'free-agent' | 'other';
  drafts: OriginDraft[];
  arrival?: OriginArrival;
  stints: OriginStint[];
};

const BRAVES_ID = 144;

const SPORT_LEVEL: Record<number, OriginLevel> = {
  1: 'MLB',
  11: 'AAA',
  12: 'AA',
  13: 'A+',
  14: 'A',
  16: 'ROK',
  31: 'NPB',
  32: 'KBO',
  22: 'College',
};

const SPORT_KIND: Record<number, OriginStint['kind']> = {
  1: 'mlb',
  11: 'minors',
  12: 'minors',
  13: 'minors',
  14: 'minors',
  16: 'minors',
  31: 'intl',
  32: 'intl',
  22: 'college',
};

const JOIN_CODES = new Set(['TR', 'TRD', 'CLA', 'CLW', 'SFA', 'SGN', 'DFT']);
const ARRIVAL_CODES = new Set(['TR', 'TRD', 'CLA', 'CLW', 'DFT']);
const ASSIGN_CODES = new Set(['ASG', 'OPT']);
const ALL_STAR = /all[-\s]?star/i;
const BRAVES_AFFILIATE =
  /braves|stripers|emperors|clingstones|mud monsters/i;

type MlbSplit = {
  season?: string;
  numTeams?: number;
  team?: { id?: number; name?: string };
  sport?: { id?: number; name?: string };
  stat?: Record<string, unknown>;
};

type MlbTeam = {
  id: number;
  name: string;
  abbreviation?: string;
  parentOrgId?: number;
  parentOrgName?: string;
  sport?: { id?: number; name?: string };
};

type MlbDraft = {
  year?: string | number;
  pickRound?: string;
  pickNumber?: number;
  isDrafted?: boolean;
  isPass?: boolean;
  team?: { id?: number; name?: string };
  school?: { name?: string };
};

type MlbTx = {
  date?: string;
  typeCode?: string;
  typeDesc?: string;
  description?: string;
  fromTeam?: { id?: number; name?: string };
  toTeam?: { id?: number; name?: string };
};

function yearOf(season?: string) {
  const y = Number(season);
  return Number.isFinite(y) ? y : 0;
}

function ordinalRound(raw?: string) {
  if (!raw) return '';
  if (/[a-z]/i.test(raw) && /rd|st|nd|th/i.test(raw)) return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  const v = n % 100;
  const s = ['th', 'st', 'nd', 'rd'];
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export function yearRange(from: number, to: number) {
  if (!from && !to) return '';
  if (!to || from === to) return String(from || to);
  return `${from}–${to}`;
}

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function hitSummary(stat: Record<string, unknown> | undefined) {
  if (!stat) return undefined;
  const avg = String(stat.avg || '');
  const hr = n(stat.homeRuns);
  const rbi = n(stat.rbi);
  const g = n(stat.gamesPlayed);
  const bits = [];
  if (g) bits.push(`${g} G`);
  if (avg) bits.push(avg);
  if (hr) bits.push(`${hr} HR`);
  if (rbi) bits.push(`${rbi} RBI`);
  return bits.join(' · ') || undefined;
}

function pitchSummary(stat: Record<string, unknown> | undefined) {
  if (!stat) return undefined;
  const g = n(stat.gamesPlayed);
  const ip = String(stat.inningsPitched || '');
  const era = String(stat.era || '');
  const bits = [];
  if (g) bits.push(`${g} G`);
  if (ip) bits.push(`${ip} IP`);
  if (era) bits.push(`${era} ERA`);
  return bits.join(' · ') || undefined;
}

function collapseStints(rows: OriginStint[]): OriginStint[] {
  const sorted = [...rows].sort((a, b) => {
    const ka = `${a.kind}|${a.level}|${a.teamId || a.team}`;
    const kb = `${b.kind}|${b.level}|${b.teamId || b.team}`;
    if (ka !== kb) return ka.localeCompare(kb);
    return a.from - b.from;
  });
  const out: OriginStint[] = [];
  for (const row of sorted) {
    const prev = out[out.length - 1];
    const sameClub =
      prev &&
      prev.kind === row.kind &&
      prev.level === row.level &&
      ((prev.teamId && row.teamId && prev.teamId === row.teamId) ||
        (!prev.teamId && !row.teamId && prev.team === row.team));
    if (sameClub && row.from <= prev.to + 1) {
      prev.to = Math.max(prev.to, row.to);
      if (row.summary) prev.summary = row.summary;
      continue;
    }
    out.push({ ...row });
  }
  return out.sort((a, b) => b.to - a.to || b.from - a.from || a.team.localeCompare(b.team));
}

function rehabTeamYears(transactions: MlbTx[]) {
  const keys = new Set<string>();
  for (const t of transactions) {
    if (t.typeCode !== 'ASG' || !/rehab/i.test(t.description || '')) continue;
    const year = t.date ? t.date.slice(0, 4) : '';
    const id = t.toTeam?.id;
    if (id && year) keys.add(`${id}:${year}`);
  }
  return keys;
}

function placeLine(p: {
  birthCity?: string;
  birthStateProvince?: string;
  birthCountry?: string;
}) {
  const bits = [p.birthCity, p.birthStateProvince, p.birthCountry].filter(Boolean);
  return bits.length ? bits.join(', ') : undefined;
}

function countryShort(raw?: string) {
  if (!raw) return '';
  if (/korea/i.test(raw)) return 'Korea';
  if (/japan/i.test(raw)) return 'Japan';
  if (/united states|usa/i.test(raw)) return 'the U.S.';
  if (/venezuela/i.test(raw)) return 'Venezuela';
  if (/dominican/i.test(raw)) return 'the Dominican Republic';
  if (/cuba/i.test(raw)) return 'Cuba';
  if (/mexico/i.test(raw)) return 'Mexico';
  if (/canada/i.test(raw)) return 'Canada';
  if (/curacao|curaçao/i.test(raw)) return 'Curaçao';
  return raw;
}

function isCommissioner(name?: string) {
  return !!name && /commissioner/i.test(name);
}

function resolveOrg(
  teamName: string,
  meta: MlbTeam | undefined,
  teamById: Map<number, MlbTeam>
): { orgId?: number; orgName?: string; orgAbbr?: string } {
  const sportId = meta?.sport?.id;
  if (sportId === 1) {
    return { orgId: meta?.id, orgName: meta?.name || teamName, orgAbbr: meta?.abbreviation };
  }
  const parentId = meta?.parentOrgId;
  const parentName = meta?.parentOrgName;
  if (parentId && parentId > 20 && !isCommissioner(parentName)) {
    const parent = teamById.get(parentId);
    return {
      orgId: parentId,
      orgName: parentName,
      orgAbbr: parent?.abbreviation,
    };
  }
  if (BRAVES_AFFILIATE.test(teamName) || BRAVES_AFFILIATE.test(meta?.name || '')) {
    const braves = teamById.get(BRAVES_ID);
    return { orgId: BRAVES_ID, orgName: 'Atlanta Braves', orgAbbr: braves?.abbreviation || 'ATL' };
  }
  return { orgName: parentName && !isCommissioner(parentName) ? parentName : undefined };
}

const LEVEL_RANK: Record<string, number> = {
  College: 0,
  ROK: 1,
  A: 2,
  'A+': 3,
  AA: 4,
  AAA: 5,
  Other: 6,
  KBO: 7,
  NPB: 7,
  MLB: 8,
};

function bravesMinors(stints: OriginStint[]) {
  const names: string[] = [];
  const seen = new Set<string>();
  const chronological = [...stints].sort(
    (a, b) => a.from - b.from || (LEVEL_RANK[a.level] ?? 9) - (LEVEL_RANK[b.level] ?? 9)
  );
  for (const s of chronological) {
    if (s.kind !== 'minors') continue;
    const bravesOrg = s.orgId === BRAVES_ID || BRAVES_AFFILIATE.test(s.team);
    if (!bravesOrg) continue;
    const short = /^FCL |^GCL /i.test(s.team)
      ? 'FCL'
      : /^ACL /i.test(s.team)
        ? 'ACL'
        : /^DSL /i.test(s.team)
          ? 'DSL'
          : s.team
              .replace(/ Braves$/i, '')
              .replace(/ Stripers$/i, '')
              .replace(/ Emperors$/i, '')
              .replace(/ Clingstones$/i, '')
              .replace(/ Mud Monsters$/i, '')
              .trim();
    if (seen.has(short)) continue;
    seen.add(short);
    names.push(short);
  }
  return names;
}

function signedDraftsOf(drafts: OriginDraft[], transactions: MlbTx[]) {
  const sign = [...transactions]
    .filter((t) => t.typeCode === 'SGN' || t.typeCode === 'DFT')
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  const signTeamId = sign?.toTeam?.id;
  return drafts.map((d, i, all) => {
    const last = i === all.length - 1;
    const signed = signTeamId
      ? d.teamId === signTeamId
      : last && d.signed;
    return { ...d, signed };
  });
}

function buildSummary(input: {
  name: string;
  drafts: OriginDraft[];
  arrival?: OriginArrival;
  mlbTeams: { id?: number; name: string; from: number; to: number }[];
  stints: OriginStint[];
  birthCountry?: string;
  debut?: string;
}): { summary: string; path: PlayerOrigin['path'] } {
  const signedDrafts = input.drafts.filter((d) => d.signed);
  const bravesDraft = signedDrafts.find((d) => d.teamId === BRAVES_ID);
  const otherMlb = input.mlbTeams.filter((t) => t.id !== BRAVES_ID);
  const firstMlb = input.mlbTeams[0];
  const homegrown =
    !!bravesDraft &&
    (!firstMlb || firstMlb.id === BRAVES_ID) &&
    otherMlb.length === 0;

  const draftBit = (d: OriginDraft) => {
    const rd = d.round ? `${d.round} round` : 'draft';
    const pick = d.pick ? `, pick ${d.pick}` : '';
    const school = d.school ? ` out of ${d.school}` : '';
    return `${d.year} (${rd}${pick}${school})`;
  };

  if (homegrown && bravesDraft) {
    const ladder = bravesMinors(input.stints);
    const through = ladder.length ? ` Came up through ${ladder.join(', ')}.` : '';
    return {
      path: 'homegrown',
      summary: `Homegrown. Drafted by the Braves in ${draftBit(bravesDraft)}.${through}`,
    };
  }

  const prior = otherMlb.map((t) => t.name.replace(/^the /i, '')).filter((v, i, a) => a.indexOf(v) === i);
  const priorLine = prior.length ? ` Previously with the ${prior.join(', then the ')}.` : '';
  const originDraft =
    signedDrafts[0] && signedDrafts[0].teamId !== BRAVES_ID
      ? ` Originally drafted by the ${signedDrafts[0].team} in ${draftBit(signedDrafts[0])}.`
      : '';
  const intlPro =
    !signedDrafts.length && input.birthCountry && /korea/i.test(input.birthCountry)
      ? ' Played in the KBO before signing with MLB.'
      : !signedDrafts.length && input.birthCountry && /japan/i.test(input.birthCountry)
        ? ' Played in NPB before signing with MLB.'
        : input.birthCountry && !/usa|united states/i.test(input.birthCountry) && !signedDrafts.length
          ? ` Originally from ${countryShort(input.birthCountry)}.`
          : '';
  const resign = input.arrival?.resignedYear
    ? ` Re-signed as a free agent in ${input.arrival.resignedYear}.`
    : '';

  const arrivalType = `${input.arrival?.type || ''} ${input.arrival?.typeCode || ''}`;
  if (/trade|\bTR\b/i.test(arrivalType)) {
    const from = input.arrival?.fromTeam || 'another club';
    const when = input.arrival?.year ? ` in ${input.arrival.year}` : '';
    return {
      path: 'trade',
      summary: `Acquired from the ${from}${when} via trade.${priorLine}${originDraft}`,
    };
  }
  if (/claim|\bCL[AW]\b/i.test(arrivalType)) {
    const from = input.arrival?.fromTeam || 'another club';
    const when = input.arrival?.year ? ` in ${input.arrival.year}` : '';
    return {
      path: 'waiver',
      summary: `Claimed off waivers from the ${from}${when}.${resign}${priorLine}${intlPro}${originDraft}`,
    };
  }
  if (/free agent|SFA/i.test(arrivalType)) {
    const when = input.arrival?.year ? ` in ${input.arrival.year}` : '';
    return {
      path: 'free-agent',
      summary: `Signed with Atlanta as a free agent${when}.${priorLine}${originDraft}${intlPro}`,
    };
  }

  if (signedDrafts[0] && signedDrafts[0].teamId !== BRAVES_ID) {
    return {
      path: 'other',
      summary: `Originally drafted by the ${signedDrafts[0].team} in ${draftBit(signedDrafts[0])}.${priorLine}`,
    };
  }

  if (prior.length) {
    return {
      path: 'other',
      summary: `Joined the Braves after time with the ${prior.join(', then the ')}.`,
    };
  }

  const debut = input.debut ? ` MLB debut ${input.debut}.` : '';
  return { path: 'other', summary: `Atlanta Braves.${debut}` };
}

export function buildOrigin(raw: {
  person: {
    fullName?: string;
    mlbDebutDate?: string;
    birthCity?: string;
    birthStateProvince?: string;
    birthCountry?: string;
    drafts?: MlbDraft[];
    education?: { colleges?: { name?: string }[]; highschools?: { name?: string; state?: string }[] };
  };
  group: 'hitting' | 'pitching';
  splits: MlbSplit[];
  teams: MlbTeam[];
  transactions: MlbTx[];
}): PlayerOrigin {
  const teamById = new Map(raw.teams.map((t) => [t.id, t]));
  const summarize = raw.group === 'pitching' ? pitchSummary : hitSummary;
  const rehab = rehabTeamYears(raw.transactions);

  const seenYearTeam = new Set<string>();
  const stintRows: OriginStint[] = [];

  const pushStint = (row: OriginStint) => {
    const key = `${row.kind}:${row.teamId || row.team}:${row.from}`;
    if (seenYearTeam.has(key)) return;
    seenYearTeam.add(key);
    stintRows.push(row);
  };

  for (const s of raw.splits) {
    const teamId = s.team?.id;
    const teamName = s.team?.name;
    if (!teamId || !teamName) continue;
    if (ALL_STAR.test(teamName)) continue;
    const year = yearOf(s.season);
    if (!year) continue;
    if (rehab.has(`${teamId}:${year}`)) continue;
    const meta = teamById.get(teamId);
    const sportId = s.sport?.id || meta?.sport?.id || 1;
    if (sportId === 22) continue;
    const level = SPORT_LEVEL[sportId] || (sportId === 1 ? 'MLB' : 'Other');
    const kind = SPORT_KIND[sportId] || (level === 'MLB' ? 'mlb' : 'minors');
    const org = resolveOrg(teamName, meta, teamById);
    pushStint({
      from: year,
      to: year,
      team: teamName,
      abbr: meta?.abbreviation,
      teamId,
      level,
      org: org.orgName,
      orgId: org.orgId,
      orgAbbr: org.orgAbbr,
      summary: summarize(s.stat),
      kind,
    });
  }

  for (const t of raw.transactions) {
    if (!ASSIGN_CODES.has(t.typeCode || '')) continue;
    if (/rehab/i.test(t.description || '')) continue;
    const teamId = t.toTeam?.id;
    const teamName = t.toTeam?.name;
    const year = t.date ? Number(t.date.slice(0, 4)) : 0;
    if (!teamId || !teamName || !year) continue;
    if (ALL_STAR.test(teamName)) continue;
    const meta = teamById.get(teamId);
    const sportId = meta?.sport?.id;
    if (sportId === 1 || sportId === 22) continue;
    const level = SPORT_LEVEL[sportId || 0] || 'Other';
    const kind = SPORT_KIND[sportId || 0] || 'minors';
    if (kind === 'mlb') continue;
    const org = resolveOrg(teamName, meta, teamById);
    pushStint({
      from: year,
      to: year,
      team: teamName,
      abbr: meta?.abbreviation,
      teamId,
      level,
      org: org.orgName,
      orgId: org.orgId,
      orgAbbr: org.orgAbbr,
      kind,
      note: 'Assigned',
    });
  }

  const rawDrafts: OriginDraft[] = (raw.person.drafts || [])
    .map((d) => ({
      year: Number(d.year) || 0,
      team: d.team?.name || 'Unknown',
      teamId: d.team?.id,
      round: ordinalRound(d.pickRound),
      pick: d.pickNumber,
      school: d.school?.name,
      signed: d.isDrafted !== false && d.isPass !== true,
    }))
    .sort((a, b) => a.year - b.year);
  const drafts = signedDraftsOf(rawDrafts, raw.transactions);

  for (const d of drafts) {
    if (d.signed) continue;
    pushStint({
      from: d.year,
      to: d.year,
      team: d.team,
      teamId: d.teamId,
      level: 'MLB',
      org: d.team,
      orgId: d.teamId,
      kind: 'draft',
      note: `Drafted, did not sign${d.school ? ` · ${d.school}` : ''}`,
    });
  }

  for (const c of raw.person.education?.colleges || []) {
    if (!c.name) continue;
    pushStint({
      from: 0,
      to: 0,
      team: c.name,
      level: 'College',
      kind: 'college',
      note: 'College',
    });
  }

  const stints = collapseStints(stintRows);

  const mlbChrono = stints
    .filter((s) => s.kind === 'mlb')
    .slice()
    .sort((a, b) => a.from - b.from)
    .map((s) => ({ id: s.teamId, name: s.team, from: s.from, to: s.to }));

  const joinTx = [...raw.transactions]
    .filter((t) => {
      const toId = t.toTeam?.id;
      const desc = t.description || '';
      const toBraves = toId === BRAVES_ID || /atlanta braves/i.test(desc);
      return toBraves && JOIN_CODES.has(t.typeCode || '');
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const firstArrival =
    joinTx.find((t) => ARRIVAL_CODES.has(t.typeCode || '')) || joinTx[0];
  const lastJoin = joinTx[joinTx.length - 1];
  const resignedYear =
    lastJoin &&
    lastJoin !== firstArrival &&
    /SFA|free agent/i.test(`${lastJoin.typeCode} ${lastJoin.typeDesc}`)
      ? lastJoin.date
        ? Number(lastJoin.date.slice(0, 4))
        : undefined
      : undefined;
  const arrival: OriginArrival | undefined = firstArrival
    ? {
        date: firstArrival.date,
        year: firstArrival.date ? Number(firstArrival.date.slice(0, 4)) : undefined,
        type: firstArrival.typeDesc || firstArrival.typeCode || '',
        typeCode: firstArrival.typeCode,
        fromTeam: firstArrival.fromTeam?.name,
        description: firstArrival.description || '',
        resignedYear,
      }
    : undefined;

  const { summary, path } = buildSummary({
    name: raw.person.fullName || '',
    drafts,
    arrival,
    mlbTeams: mlbChrono,
    stints,
    birthCountry: raw.person.birthCountry,
    debut: raw.person.mlbDebutDate,
  });

  return {
    name: raw.person.fullName || '',
    debut: raw.person.mlbDebutDate,
    birthplace: placeLine(raw.person),
    summary,
    path,
    drafts,
    arrival,
    stints,
  };
}

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const YEAR_SPORTS = [1, 11, 12, 13, 14, 16, 31, 32];

export async function loadPlayerOrigin(
  id: number,
  group: 'hitting' | 'pitching'
): Promise<PlayerOrigin> {
  const [personRes, txRes, ...yearBlocks] = await Promise.all([
    getJson(`https://statsapi.mlb.com/api/v1/people/${id}?hydrate=draft,education`),
    getJson(`https://statsapi.mlb.com/api/v1/transactions?playerId=${id}`),
    ...YEAR_SPORTS.map((sportId) =>
      getJson(
        `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=yearByYear&group=${group}&sportId=${sportId}`
      ).catch(() => ({ stats: [] }))
    ),
  ]);

  const person = personRes.people?.[0] || {};
  const splits: MlbSplit[] = [];
  for (const block of yearBlocks) {
    for (const s of block.stats?.[0]?.splits || []) splits.push(s);
  }

  const transactions: MlbTx[] = txRes.transactions || [];
  const teamIds = [
    ...new Set(
      splits
        .map((s) => s.team?.id)
        .concat((person.drafts || []).map((d: MlbDraft) => d.team?.id))
        .concat(transactions.flatMap((t) => [t.fromTeam?.id, t.toTeam?.id]))
        .filter((x: unknown): x is number => typeof x === 'number')
    ),
  ];
  let teams: MlbTeam[] = [];
  if (teamIds.length) {
    const tRes = await getJson(`https://statsapi.mlb.com/api/v1/teams?teamId=${teamIds.join(',')}`);
    teams = tRes.teams || [];
  }
  const parentIds = [
    ...new Set(
      teams
        .map((t) => t.parentOrgId)
        .filter((id): id is number => typeof id === 'number' && id > 20 && !teamIds.includes(id))
    ),
  ];
  if (parentIds.length) {
    const pRes = await getJson(`https://statsapi.mlb.com/api/v1/teams?teamId=${parentIds.join(',')}`);
    teams = teams.concat(pRes.teams || []);
  }

  return buildOrigin({
    person,
    group,
    splits,
    teams,
    transactions,
  });
}
