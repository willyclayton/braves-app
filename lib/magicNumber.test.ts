import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DivisionBoard, StandingRow } from '../data/types';
import { mlbSeasonYear } from './dates';
import { computeTeamMagic, magicDisplay, magicVs } from './magicNumber';
import { fetchLiveDivisions, mapMlbStandings } from './standingsLive';

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

/** Snapshot after the 2026-09-15 night games (Braves 89-63, PHI 83-68, AZ 80-72). */
const afterTuesday = nlBoards({
  east: [
    team({
      abbr: 'ATL',
      team: 'Braves',
      w: 89,
      l: 63,
      pct: '.586',
      highlight: true,
      magicNumber: '5',
      divisionLeader: true,
      rank: 1,
    }),
    team({ abbr: 'PHI', team: 'Phillies', w: 83, l: 68, pct: '.550', rank: 2 }),
    team({ abbr: 'MIA', team: 'Marlins', w: 75, l: 77, pct: '.493', rank: 3 }),
    team({ abbr: 'WSH', team: 'Nationals', w: 71, l: 81, pct: '.467', rank: 4 }),
    team({ abbr: 'NYM', team: 'Mets', w: 69, l: 82, pct: '.457', rank: 5 }),
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
    team({ abbr: 'PIT', team: 'Pirates', w: 75, l: 76, pct: '.497', rank: 3 }),
    team({ abbr: 'STL', team: 'Cardinals', w: 75, l: 77, pct: '.493', rank: 4 }),
    team({ abbr: 'CIN', team: 'Reds', w: 70, l: 81, pct: '.464', rank: 5 }),
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
    team({ abbr: 'SF', team: 'Giants', w: 63, l: 89, pct: '.414', rank: 4 }),
    team({ abbr: 'COL', team: 'Rockies', w: 56, l: 95, pct: '.371', rank: 5 }),
  ],
});

describe('mlbSeasonYear', () => {
  it('uses the current year once March arrives', () => {
    assert.equal(mlbSeasonYear(new Date('2026-09-16T16:00:00-04:00')), 2026);
    assert.equal(mlbSeasonYear(new Date('2027-03-01T12:00:00-05:00')), 2027);
  });

  it('stays on the previous season through February', () => {
    assert.equal(mlbSeasonYear(new Date('2027-02-01T12:00:00-05:00')), 2026);
  });
});

describe('magicVs', () => {
  it('matches MLB division math without the extra +1', () => {
    assert.equal(magicVs({ w: 89 }, { l: 68 }), 5);
  });

  it('requires an outright lead for playoff-berth clinches', () => {
    assert.equal(magicVs({ w: 89 }, { l: 72 }, 162, true), 2);
  });
});

describe('computeTeamMagic', () => {
  it('matches published Braves numbers after the 2026-09-15 games', () => {
    const magic = computeTeamMagic(afterTuesday);
    assert.ok(magic);
    assert.equal(magic.division.status, 'magic');
    assert.equal(magic.division.value, 5);
    assert.equal(magic.division.vs?.abbr, 'PHI');
    assert.equal(magicDisplay(magic.division), '5');
    assert.equal(magic.playoffs.status, 'magic');
    assert.equal(magic.playoffs.value, 2);
    assert.equal(magic.playoffs.vs?.abbr, 'AZ');
    assert.equal(magicDisplay(magic.playoffs), '2');
  });

  it('uses MLB magicNumber when it already includes a tiebreaker', () => {
    const boards = nlBoards({
      east: [
        team({
          abbr: 'ATL',
          w: 89,
          l: 63,
          highlight: true,
          magicNumber: '5',
          rank: 1,
        }),
        team({ abbr: 'PHI', w: 83, l: 68, rank: 2 }),
      ],
      central: [team({ abbr: 'MIL', w: 94, l: 57, rank: 1 })],
      west: [
        team({ abbr: 'LAD', w: 92, l: 59, rank: 1 }),
        team({ abbr: 'SD', w: 82, l: 69, rank: 2 }),
        team({ abbr: 'AZ', w: 80, l: 72, rank: 3 }),
      ],
    });
    const magic = computeTeamMagic(boards);
    assert.equal(magic?.division.value, 5);
  });

  it('shows CLINCHED once MLB marks the division or a playoff berth', () => {
    const boards = nlBoards({
      east: [
        team({
          abbr: 'ATL',
          w: 95,
          l: 63,
          highlight: true,
          clinched: true,
          clinchIndicator: 'y',
          divisionChamp: true,
          rank: 1,
        }),
        team({ abbr: 'PHI', w: 83, l: 72, rank: 2 }),
      ],
      central: [team({ abbr: 'MIL', w: 94, l: 57, rank: 1 })],
      west: [team({ abbr: 'LAD', w: 92, l: 59, rank: 1 })],
    });
    const magic = computeTeamMagic(boards);
    assert.equal(magicDisplay(magic!.division), 'CLINCHED');
    assert.equal(magicDisplay(magic!.playoffs), 'CLINCHED');
  });

  it('drops the playoff number as the Braves win and the first team out loses', () => {
    const later = nlBoards({
      east: afterTuesday[0].teams.map((t) =>
        t.abbr === 'ATL' ? { ...t, w: 90, l: 63, magicNumber: '4' } : t
      ),
      central: afterTuesday[1].teams,
      west: afterTuesday[2].teams,
    });
    const magic = computeTeamMagic(later);
    assert.equal(magic?.division.value, 4);
    assert.equal(magic?.playoffs.value, 1);
    assert.equal(magic?.playoffs.vs?.abbr, 'AZ');
  });
});

describe('live MLB standings', () => {
  it('maps a statsapi payload onto division boards', () => {
    const boards = mapMlbStandings({
      records: [
        {
          standingsType: 'regularSeason',
          league: { id: 104 },
          division: { id: 204 },
          teamRecords: [
            {
              team: { id: 144, name: 'Atlanta Braves', abbreviation: 'ATL' },
              wins: 89,
              losses: 63,
              winningPercentage: '.586',
              gamesBack: '-',
              magicNumber: '5',
              streak: { streakCode: 'W1' },
              divisionRank: '1',
              divisionLeader: true,
            },
          ],
        },
      ],
    });
    assert.equal(boards.length, 1);
    assert.equal(boards[0].league, 'NL');
    assert.equal(boards[0].teams[0].abbr, 'ATL');
    assert.equal(boards[0].teams[0].highlight, true);
    assert.equal(boards[0].teams[0].magicNumber, '5');
  });

  it('division magic tracks MLB’s published number', async (t) => {
    let boards;
    try {
      boards = await fetchLiveDivisions();
    } catch {
      t.skip('MLB standings unavailable');
      return;
    }
    const magic = computeTeamMagic(boards);
    const atl = boards.flatMap((d) => d.teams).find((row) => row.abbr === 'ATL');
    assert.ok(magic && atl);
    if (atl.divisionChamp || atl.clinchIndicator === 'y') {
      assert.equal(magic.division.status, 'clinched');
      return;
    }
    if (atl.magicNumber) {
      assert.equal(String(magic.division.value), atl.magicNumber);
    }
  });
});
