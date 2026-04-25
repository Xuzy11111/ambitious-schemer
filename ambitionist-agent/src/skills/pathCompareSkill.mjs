import { clamp, scoreLabel, weightedScore } from "../utils/scoring.mjs";

const DECISION_WEIGHT_LABELS = {
  moneyUrgency: "faster monetization",
  partnerDistanceAversion: "avoiding long-distance strain with partner",
  familyDistanceAversion: "staying closer to family",
  domainPassion: "staying aligned with the loved domain",
  returnHomeExpectation: "keeping return-home flexibility",
  marketProspectPriority: "choosing a path with stronger market outlook",
};

function normalizedPriority(value, divisor = 10) {
  return clamp(Number(value || 0) / divisor, 0, 1);
}

function pathMatchesDomain(profile, path) {
  const domains = (profile.careerGoal.targetDomains || []).map((item) => String(item).toLowerCase());
  const tags = (path.tags || []).map((item) => String(item).toLowerCase());
  return domains.some((domain) => tags.some((tag) => tag.includes(domain) || domain.includes(tag)));
}

function buildWeightMap(profile) {
  const weights = {
    longTermPotential: 1,
    shortTermMonetization: 1,
    riskControl: 1,
    constraintMatch: 1,
    reversibility: 1,
    switchingCost: 1,
  };

  if (profile.constraints.financialPressure === "high") {
    weights.shortTermMonetization += 1.5;
    weights.constraintMatch += 1;
  }

  if (profile.riskPreference.style === "conservative") {
    weights.riskControl += 1.3;
    weights.reversibility += 1;
  }

  if (profile.careerGoal.primary.toLowerCase().includes("phd")) {
    weights.longTermPotential += 1;
    weights.constraintMatch += 0.8;
  }

  if (profile.hiddenConcerns.includes("graduation_difficulty")) {
    weights.riskControl += 1;
  }

  weights.shortTermMonetization += normalizedPriority(profile.decisionWeights?.moneyUrgency, 4);
  weights.constraintMatch += normalizedPriority(profile.decisionWeights?.partnerDistanceAversion, 5);
  weights.constraintMatch += normalizedPriority(profile.decisionWeights?.familyDistanceAversion, 5);
  weights.longTermPotential += normalizedPriority(profile.decisionWeights?.marketProspectPriority, 5);
  weights.constraintMatch += normalizedPriority(profile.decisionWeights?.returnHomeExpectation, 5);
  weights.longTermPotential += normalizedPriority(profile.decisionWeights?.domainPassion, 6);

  return weights;
}

function describeTopDecisionWeights(profile, limit = 3) {
  return Object.entries(profile.decisionWeights || {})
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({
      key,
      value,
      label: DECISION_WEIGHT_LABELS[key] || key,
    }));
}

function constraintMatch(profile, path) {
  let score = 6;

  if (profile.constraints.financialPressure === "high") {
    if (path.category === "job") score += 2;
    if (path.category === "master") score -= 1.5;
    if (path.category === "phd") score -= 0.5;
  }

  if (
    profile.constraints.financialPressure === "low" &&
    profile.careerGoal.primary.toLowerCase().includes("phd") &&
    path.category === "job"
  ) {
    score -= 1;
  }

  if (
    normalizedPriority(profile.decisionWeights?.partnerDistanceAversion) >= 0.7 &&
    ["ms-ai-overseas", "phd-top-research"].includes(path.pathId)
  ) {
    score -= 1.5;
  }

  if (
    normalizedPriority(profile.decisionWeights?.familyDistanceAversion) >= 0.7 &&
    ["ms-ai-overseas", "phd-top-research", "startup-agent-builder"].includes(path.pathId)
  ) {
    score -= path.pathId === "startup-agent-builder" ? 0.6 : 1.4;
  }

  if (
    normalizedPriority(profile.decisionWeights?.returnHomeExpectation) >= 0.7 &&
    ["ms-ai-overseas", "phd-top-research"].includes(path.pathId)
  ) {
    score -= 1.3;
  }

  if (profile.constraints.cityPreference.includes("asia") && path.pathId === "phd-balanced-asia") {
    score += 2;
  }

  if (
    normalizedPriority(profile.decisionWeights?.partnerDistanceAversion) >= 0.7 &&
    path.pathId === "phd-balanced-asia"
  ) {
    score += 1;
  }

  if (
    normalizedPriority(profile.decisionWeights?.familyDistanceAversion) >= 0.7 &&
    path.pathId === "phd-balanced-asia"
  ) {
    score += 1;
  }

  if (
    normalizedPriority(profile.decisionWeights?.returnHomeExpectation) >= 0.7 &&
    path.pathId === "phd-balanced-asia"
  ) {
    score += 1;
  }

  if (
    profile.careerGoal.primary.toLowerCase().includes("phd") &&
    path.pathId === "phd-balanced-asia"
  ) {
    score += 1.5;
  }

  if (
    profile.constraints.financialPressure === "low" &&
    path.pathId === "phd-balanced-asia"
  ) {
    score += 1;
  }

  if (
    profile.hiddenConcerns.includes("graduation_difficulty") &&
    path.pathId === "phd-top-research"
  ) {
    score -= 2.5;
  }

  return clamp(score);
}

function scorePath(profile, path) {
  const base = path.baseScores;
  const adjustment = (path.adjustments?.personalBoost || 0) + (path.adjustments?.marketBoost || 0);
  const domainPassionBoost =
    pathMatchesDomain(profile, path) && normalizedPriority(profile.decisionWeights?.domainPassion) >= 0.6
      ? 0.8
      : 0;
  const marketPriorityBoost =
    normalizedPriority(profile.decisionWeights?.marketProspectPriority) >= 0.6
      ? adjustment * 0.15
      : 0;

  const scoreMap = {
    longTermPotential: clamp(base.longTermPotential + adjustment * 0.5 + domainPassionBoost + marketPriorityBoost),
    shortTermMonetization: clamp(
      base.shortTermMonetization +
        adjustment * 0.35 +
        normalizedPriority(profile.decisionWeights?.moneyUrgency) *
          (path.category === "job" ? 1 : path.category === "phd" ? -0.3 : 0),
    ),
    riskControl: clamp(base.riskControl + adjustment * 0.2),
    constraintMatch: constraintMatch(profile, path),
    reversibility: base.reversibility,
    switchingCost: base.switchingCost,
  };

  const weights = buildWeightMap(profile);
  const totalScore = weightedScore(scoreMap, weights);

  return {
    pathId: path.pathId,
    title: path.title,
    scoreMap,
    weights,
    totalScore,
    verdict: scoreLabel(totalScore),
    reasons: path.marketReasons || [],
    category: path.category,
      decisionWeightHighlights: describeTopDecisionWeights(profile),
  };
}

function buildNextActions() {
  return {
    next3Months: [],
    next12Months: [],
  };
}

function explainWhyNot(top, other) {
  const biggestGap = Object.entries(other.scoreMap)
    .map(([key, value]) => ({
      key,
      gap: Number((top.scoreMap[key] - value).toFixed(2)),
    }))
    .sort((a, b) => b.gap - a.gap)[0];

  const readableGap = {
    longTermPotential: "long-term upside",
    shortTermMonetization: "short-term monetization",
    riskControl: "risk control",
    constraintMatch: "fit to the user's constraints",
    reversibility: "reversibility",
    switchingCost: "switching cost",
  };

  return `It loses mostly on ${readableGap[biggestGap.key] || biggestGap.key} compared with the current top path.`;
}

function explainWeightAwareSummary(top, profile) {
  const topWeights = describeTopDecisionWeights(profile);
  if (!topWeights.length) {
    return `${top.title} is currently the best tradeoff under the user's real constraints.`;
  }

  return `${top.title} is currently the best tradeoff because it best balances ${topWeights
    .map((item) => item.label)
    .join(", ")} under the user's real constraints.`;
}

function explainWhyNotWithWeights(top, other, profile) {
  const baseReason = explainWhyNot(top, other);
  const topWeights = describeTopDecisionWeights(profile, 2);
  if (!topWeights.length) {
    return baseReason;
  }

  return `${baseReason} It is also weaker on the user's highest-priority factors: ${topWeights
    .map((item) => item.label)
    .join(" and ")}.`;
}

export class PathCompareSkill {
  constructor() {
    this.systemPrompt = [
      "You are the path comparison module.",
      "Compare multiple routes using explicit dimensions and personalized weights.",
      "Return the best route, why the others lose, and actionable next steps.",
    ].join(" ");
  }

  getPromptContract() {
    return {
      systemPrompt: this.systemPrompt,
      outputFormat: {
        rankings: "json[]",
        topRecommendation: "json",
        whyNotOthers: "json[]",
        nextActions: "json",
      },
    };
  }

  compare({ profile, candidatePaths }) {
    const rankings = candidatePaths
      .map((path) => scorePath(profile, path))
      .sort((a, b) => b.totalScore - a.totalScore);

    const [top, ...others] = rankings;

    return {
      rankings,
      topRecommendation: {
        pathId: top.pathId,
        title: top.title,
        totalScore: top.totalScore,
        reasons: top.reasons,
        summary: explainWeightAwareSummary(top, profile),
        decisionWeightHighlights: top.decisionWeightHighlights,
      },
      whyNotOthers: others.map((item) => ({
        pathId: item.pathId,
        title: item.title,
        reason: explainWhyNotWithWeights(top, item, profile),
        score: item.totalScore,
      })),
      nextActions: buildNextActions(top, profile),
      decisionWeightsUsed: profile.decisionWeights || {},
    };
  }
}
