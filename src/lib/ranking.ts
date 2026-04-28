export function buildCompetitionRanks<T extends { points: number }>(items: T[]) {
  let previousPoints: number | null = null;
  let previousRank = 0;

  return items.map((item, index) => {
    if (previousPoints !== null && item.points === previousPoints) {
      return previousRank;
    }

    previousPoints = item.points;
    previousRank = index + 1;

    return previousRank;
  });
}
