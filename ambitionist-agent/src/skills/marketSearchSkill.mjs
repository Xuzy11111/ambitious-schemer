import { StaticSnapshotMarketProvider } from "../contracts/marketDataProvider.mjs";
import { PATH_LIBRARY } from "../data/trendSnapshots.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function derivePersonalBoosts(profile, path) {
  let boost = 0;
  const reasons = [];

  if (path.pathId === "direct-job-ai-engineer") {
    if (profile.constraints.financialPressure === "high") {
      boost += 1.2;
      reasons.push("high money pressure favors faster monetization");
    }
    if (profile.strengths.engineering >= 7) {
      boost += 0.8;
      reasons.push("engineering evidence supports quick industry landing");
    }
  }

  if (path.pathId === "phd-top-research") {
    if (profile.strengths.research >= 7) {
      boost += 0.8;
      reasons.push("research strength supports a top PhD path");
    }
    if (profile.hiddenConcerns.includes("graduation_difficulty")) {
      boost -= 1.4;
      reasons.push("fear of graduation difficulty weakens this route");
    }
  }

  if (path.pathId === "phd-balanced-asia") {
    if (profile.constraints.cityPreference.includes("asia")) {
      boost += 1;
      reasons.push("regional preference improves path fit");
    }
    if (profile.hiddenConcerns.includes("wants_fast_income")) {
      boost += 0.4;
      reasons.push("balanced PhD keeps research option open with lower risk than top-cycle PhD");
    }
  }

  if (path.pathId === "ms-ai-overseas") {
    if (profile.constraints.financialPressure === "high") {
      boost -= 1;
      reasons.push("tuition and delayed income hurt fit under money pressure");
    }
  }

  if (path.pathId === "startup-agent-builder") {
    if (profile.riskPreference.style === "conservative") {
      boost -= 1.5;
      reasons.push("startup volatility conflicts with conservative preference");
    }
    if (profile.careerGoal.targetDomains.includes("agent")) {
      boost += 0.7;
      reasons.push("interest in agents gives this path some upside");
    }
  }

  return { boost, reasons };
}

function deriveMarketBoost(snapshot, path) {
  let boost = 0;
  const reasons = [];
  const tags = path.tags.map((tag) => tag.toLowerCase());

  for (const hot of snapshot.hotDomains) {
    if (tags.some((tag) => hot.includes(tag) || tag.includes(hot))) {
      boost += 0.6;
      reasons.push(`market tailwind from ${hot}`);
    }
  }

  for (const weak of snapshot.weakDomains) {
    if (tags.some((tag) => weak.includes(tag) || tag.includes(weak))) {
      boost -= 0.8;
      reasons.push(`market headwind from ${weak}`);
    }
  }

  if (path.category === "job") {
    boost += (snapshot.compensationBias.engineering - 6) * 0.25;
  }

  if (path.category === "phd") {
    boost += (snapshot.compensationBias.research - 6) * 0.25;
  }

  if (path.category === "startup") {
    boost += (snapshot.compensationBias.startup - 6) * 0.25;
  }

  return { boost, reasons };
}

export class MarketSearchSkill {
  constructor({ provider = new StaticSnapshotMarketProvider() } = {}) {
    this.provider = provider;
    this.systemPrompt = [
      "You are the market search module.",
      "You search the world state for a given year and translate it into path-level evidence.",
      "Always compare opportunities against the user's actual constraints, not abstract prestige.",
      "The actual market source may come from a pluggable provider, such as crawler output, job data, or research trend feeds.",
    ].join(" ");
  }

  getPromptContract() {
    return {
      systemPrompt: this.systemPrompt,
      outputFormat: {
        marketLandscape: "json",
        candidatePaths: "json[]",
      },
    };
  }

  async search({ targetYear = 2024, profile, candidatePaths = [] }) {
    const snapshot = await this.provider.getLandscape({
      targetYear,
      targetDomains: profile.careerGoal.targetDomains,
      targetRoles: profile.careerGoal.targetRoles,
      profile,
    });
    const pathSource = candidatePaths.length ? candidatePaths : PATH_LIBRARY;

    const enrichedPaths = pathSource.map((path) => {
      const pathCopy = clone(path);
      const personal = derivePersonalBoosts(profile, pathCopy);
      const market = deriveMarketBoost(snapshot, pathCopy);

      pathCopy.marketReasons = [...personal.reasons, ...market.reasons];
      pathCopy.adjustments = {
        personalBoost: personal.boost,
        marketBoost: market.boost,
      };

      return pathCopy;
    });

    return {
      marketLandscape: snapshot,
      candidatePaths: enrichedPaths,
    };
  }
}
