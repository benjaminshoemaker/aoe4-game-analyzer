import {
  buildAllocationCategories,
  buildAllocationLeaderSegments,
} from '../../packages/aoe4-core/src/presentation/postMatchPresentation';

describe('post-match presentation preparation', () => {
  it('maps deployed pool bands into strategic allocation categories outside the HTML renderer', () => {
    expect(buildAllocationCategories({
      economic: 100,
      populationCap: 25,
      militaryCapacity: 30,
      militaryActive: 70,
      defensive: 50,
      research: 40,
      advancement: 160,
      destroyed: 40,
      float: 125,
      total: 435,
    })).toEqual({
      economic: 100,
      technology: 200,
      military: 150,
      other: 25,
      destroyed: 40,
      overall: 435,
      float: 125,
      opportunityLost: 0,
    });
  });

  it('builds 30-second strategic allocation leader segments as presentation data', () => {
    const segments = buildAllocationLeaderSegments([
      {
        timestamp: 0,
        you: {
          economic: 100,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 0,
          defensive: 0,
          research: 0,
          advancement: 0,
          total: 100,
        },
        opponent: {
          economic: 50,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 0,
          defensive: 0,
          research: 0,
          advancement: 0,
          total: 50,
        },
      },
      {
        timestamp: 30,
        you: {
          economic: 100,
          populationCap: 0,
          militaryCapacity: 10,
          militaryActive: 30,
          defensive: 0,
          research: 0,
          advancement: 0,
          total: 140,
        },
        opponent: {
          economic: 50,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 90,
          defensive: 0,
          research: 0,
          advancement: 0,
          total: 140,
        },
      },
    ], 60);

    expect(segments).toContainEqual(expect.objectContaining({
      categoryKey: 'economic',
      start: 0,
      end: 30,
      hoverTimestamp: 30,
      leader: 'you',
      you: 100,
      opponent: 50,
    }));
    expect(segments).toContainEqual(expect.objectContaining({
      categoryKey: 'military',
      start: 0,
      end: 30,
      hoverTimestamp: 30,
      leader: 'opponent',
      you: 40,
      opponent: 90,
    }));
  });
});
