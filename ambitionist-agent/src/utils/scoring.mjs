export function clamp(value, min = 0, max = 10) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeWeightMap(weightMap) {
  const total = Object.values(weightMap).reduce((sum, value) => sum + value, 0);
  if (!total) {
    return weightMap;
  }

  return Object.fromEntries(
    Object.entries(weightMap).map(([key, value]) => [key, value / total]),
  );
}

export function weightedScore(scoreMap, weightMap) {
  const normalized = normalizeWeightMap(weightMap);

  return Number(
    Object.entries(normalized)
      .reduce((sum, [key, weight]) => sum + (scoreMap[key] || 0) * weight, 0)
      .toFixed(2),
  );
}

export function scoreLabel(score) {
  if (score >= 8.5) return "very strong";
  if (score >= 7) return "strong";
  if (score >= 5.5) return "mixed";
  if (score >= 4) return "weak";
  return "high risk";
}
