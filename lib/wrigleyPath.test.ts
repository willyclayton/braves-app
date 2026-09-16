import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DivisionBoard, Game, StandingRow } from '../data/types';
import {
  meetingRound,
  remainingWrigleyGames,
  seedNationalLeague,
  wrigleyHosting,
  wrigleyPath,
} from './wrigleyPath';

function team(partial: Partial<StandingRow> & Pick<StandingRow, 'abbr' | 'w' | 'l'>): StandingRow {
  return {
    team: partial.team || partial.abbr,
    pct: partial.pct || '.500',
    gb: partial.gb || '—',
    streak: partial.streak || '',
    ...partial,
  };
}

function nlBoards(rows: Record<'east' | 'central' | 'west', StandingRow[]>): DivisionBoard[] {
  return [
    { leagueId: 104, league: 'NL', divisionId: 204, division: 'East', teams: rows.east },
    { leagueId: 104, league: 'NL', divisionId: 205, division: 'Central', teams: rows.central },
    { leagueId: 104, league: 'NL', divisionId: 203, division: 'West', teams: rows.west },
  ];
}

/** Snapshot after the 2026-09-15 night games. */
const afterTuesday = nlBoards({
  east: [
    team({ abbr: 'ATL', team: 'Braves', w: 89, l: 63, pct: '.586', highlight: true, rank: 1 }),
    team({ abbr: 'PHI', team: 'Phillies', w: 83, l: 68, pct: '.550', rank: 2 }),
    team({ abbr: 'MIA', team: 'Marlins', w: 75, l: 77, pct: '.493', rank: 3 }),
  ],
  central: [
    team({
      abbr: 'MIL',
      team: 'Brewers',
      w: 94,
      l: 57,
      pct: '.623',
      clinched: true,
      clinchIndicator: 'y',
      rank: 1,
    }),
    team({ abbr: 'CHC', team: 'Cubs', w: 84, l: 68, pct: '.553', rank: 2 }),
  ],
  west: [
    team({
      abbr: 'LAD',
      team: 'Dodgers',
      w: 92,
      l: 59,
      pct: '.609',
      clinched: true,
      clinchIndicator: 'x',
      rank: 1,
    }),
    team({ abbr: 'SD', team: 'Padres', w: 82, l: 69, pct: '.543', rank: 2 }),
    team({ abbr: 'AZ', team: 'D-backs', w: 80, l: 72, pct: '.526', rank: 3 }),
  ],
});

describe('meetingRound', () => {
  it('pairs Wild Card seeds only (3-6 and 4-5)', () => {
    assert.equal(meetingRound(3, 6), 'wcs');
    assert.equal(meetingRound(6, 3), 'wcs');
    assert.equal(meetingRound(4, 5), 'wcs');
    assert.equal(meetingRound(5, 4), 'wcs');
  });

  it('keeps {1,4,5} and {2,3,6} on opposite NLCS halves with no re-seed', () => {
    assert.equal(meetingRound(1, 4), 'nlds');
    assert.equal(meetingRound(1, 5), 'nlds');
    assert.equal(meetingRound(2, 3), 'nlds');
    assert.equal(meetingRound(2, 6), 'nlds');
    assert.equal(meetingRound(3, 4), 'nlcs');
    assert.equal(meetingRound(1, 2), 'nlcs');
    assert.equal(meetingRound(1, 3), 'nlcs');
    assert.equal(meetingRound(4, 6), 'nlcs');
  });
});

describe('wrigleyHosting', () => {
  it('gives the higher Wild Card every game', () => {
    assert.deepEqual(wrigleyHosting('wcs', 5, 4), {
      atWrigley: false,
      games: 'All 3 games at Truist Park',
    });
    assert.deepEqual(wrigleyHosting('wcs', 4, 5), {
      atWrigley: true,
      games: 'All 3 games at Wrigley',
    });
  });

  it('uses 2-2-1 NLDS and 2-3-2 NLCS home-field', () => {
    assert.equal(wrigleyHosting('nlds', 4, 1).games, 'Games 3–4 at Wrigley');
    assert.equal(wrigleyHosting('nlds', 1, 4).games, 'Games 1, 2, and 5 at Wrigley');
    assert.equal(wrigleyHosting('nlcs', 4, 3).games, 'Games 3–5 at Wrigley');
    assert.equal(wrigleyHosting('nlcs', 1, 4).games, 'Games 1, 2, 6, and 7 at Wrigley');
  });
});

describe('seedNationalLeague', () => {
  it('ranks division winners 1–3 then Wild Cards 4–6', () => {
    const seeds = seedNationalLeague(afterTuesday);
    assert.deepEqual(
      seeds.map((s) => `${s.seed} ${s.team.abbr} ${s.kind}`),
      ['1 MIL division', '2 LAD division', '3 ATL division', '4 CHC wildcard', '5 PHI wildcard', '6 SD wildcard']
    );
    assert.equal(seeds[0].bye, true);
    assert.equal(seeds[2].bye, false);
  });
});

describe('wrigleyPath', () => {
  it('puts today’s 3-vs-4 matchup in the NLCS at Wrigley for Games 3–5', () => {
    const path = wrigleyPath(afterTuesday);
    assert.ok(path);
    assert.equal(path.atl?.seed, 3);
    assert.equal(path.chc?.seed, 4);
    const featured = path.scenarios.find((s) => s.featured);
    assert.ok(featured);
    assert.equal(featured.round, 'nlcs');
    assert.equal(featured.atWrigley, true);
    assert.equal(featured.headline, 'NLCS · Games 3–5 at Wrigley');
    assert.match(featured.body, /opposite halves/i);
    assert.match(featured.body, /Padres/);
    assert.match(featured.body, /Dodgers/);
    assert.match(featured.body, /Phillies/);
    assert.match(featured.body, /Brewers/);
  });

  it('says a Braves–Cubs Wild Card would be all Truist while Atlanta still ranks higher', () => {
    const path = wrigleyPath(afterTuesday);
    const alt = path?.scenarios.find((s) => s.id === 'wcs-alt');
    assert.ok(alt);
    assert.equal(alt.atWrigley, false);
    assert.match(alt.headline, /Truist/);
    assert.match(alt.body, /all 3 at Truist/);
  });

  it('hosts a 4-vs-5 Wild Card at Truist if the Phillies take the East', () => {
    const philliesEast = nlBoards({
      east: [
        team({ abbr: 'PHI', team: 'Phillies', w: 90, l: 72, pct: '.556', rank: 1 }),
        team({ abbr: 'ATL', team: 'Braves', w: 89, l: 73, pct: '.549', highlight: true, rank: 2 }),
      ],
      central: [
        team({ abbr: 'MIL', team: 'Brewers', w: 96, l: 66, pct: '.593', rank: 1 }),
        team({ abbr: 'CHC', team: 'Cubs', w: 87, l: 75, pct: '.537', rank: 2 }),
      ],
      west: [
        team({ abbr: 'LAD', team: 'Dodgers', w: 94, l: 68, pct: '.580', rank: 1 }),
        team({ abbr: 'SD', team: 'Padres', w: 85, l: 77, pct: '.525', rank: 2 }),
      ],
    });
    const path = wrigleyPath(philliesEast);
    assert.equal(path?.atl?.seed, 4);
    assert.equal(path?.chc?.seed, 5);
    const featured = path?.scenarios.find((s) => s.featured);
    assert.equal(featured?.round, 'wcs');
    assert.equal(featured?.atWrigley, false);
    assert.equal(featured?.headline, 'Wild Card · All 3 games at Truist Park');
  });

  it('moves that Wild Card to Wrigley if Chicago also passes Atlanta', () => {
    const cubsAhead = nlBoards({
      east: [
        team({ abbr: 'PHI', team: 'Phillies', w: 90, l: 72, pct: '.556', rank: 1 }),
        team({ abbr: 'ATL', team: 'Braves', w: 86, l: 76, pct: '.531', highlight: true, rank: 2 }),
      ],
      central: [
        team({ abbr: 'MIL', team: 'Brewers', w: 96, l: 66, pct: '.593', rank: 1 }),
        team({ abbr: 'CHC', team: 'Cubs', w: 88, l: 74, pct: '.543', rank: 2 }),
      ],
      west: [
        team({ abbr: 'LAD', team: 'Dodgers', w: 94, l: 68, pct: '.580', rank: 1 }),
        team({ abbr: 'SD', team: 'Padres', w: 85, l: 77, pct: '.525', rank: 2 }),
      ],
    });
    const path = wrigleyPath(cubsAhead);
    assert.equal(path?.chc?.seed, 4);
    assert.equal(path?.atl?.seed, 5);
    const featured = path?.scenarios.find((s) => s.featured);
    assert.equal(featured?.round, 'wcs');
    assert.equal(featured?.atWrigley, true);
    assert.equal(featured?.headline, 'Wild Card · All 3 games at Wrigley');
  });

  it('lists unfinished road games at Wrigley', () => {
    const schedule: Game[] = [
      {
        id: '1',
        date: '2026-09-15',
        time: 'Final',
        opponent: 'Chicago Cubs',
        opponentAbbr: 'CHC',
        home: false,
        status: 'final',
        venue: 'Wrigley Field',
      },
      {
        id: '2',
        date: '2026-09-16',
        time: '7:40 PM',
        opponent: 'Chicago Cubs',
        opponentAbbr: 'CHC',
        home: false,
        status: 'upcoming',
        venue: 'Wrigley Field',
      },
      {
        id: '3',
        date: '2026-09-18',
        time: '7:20 PM',
        opponent: 'Chicago Cubs',
        opponentAbbr: 'CHC',
        home: true,
        status: 'upcoming',
        venue: 'Truist Park',
      },
    ];
    const leftover = remainingWrigleyGames(schedule);
    assert.equal(leftover.length, 1);
    assert.equal(leftover[0].id, '2');
  });
});
