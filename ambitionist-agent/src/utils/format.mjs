export function asJson(value) {
  return JSON.stringify(value, null, 2);
}

export function section(title, body) {
  return `\n## ${title}\n${body}\n`;
}

export function bulletList(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function compactPathRanking(rankings = []) {
  return rankings
    .map(
      (item, index) =>
        `${index + 1}. ${item.pathId} | score=${item.totalScore} | verdict=${item.verdict}`,
    )
    .join("\n");
}
