import { cloneProfile, completenessOfProfile, mergeUniqueStrings } from "../types.mjs";

function setByPath(target, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const parent = keys.reduce((acc, key) => {
    if (!acc[key] || typeof acc[key] !== "object") {
      acc[key] = {};
    }
    return acc[key];
  }, target);

  if (Array.isArray(parent[lastKey])) {
    parent[lastKey] = mergeUniqueStrings(parent[lastKey], [value]);
    return;
  }

  if (typeof parent[lastKey] === "number" && typeof value === "number") {
    parent[lastKey] = Math.max(parent[lastKey], value);
    return;
  }

  if (parent[lastKey] === "" || parent[lastKey] === null || parent[lastKey] === "unknown") {
    parent[lastKey] = value;
    return;
  }

  if (Array.isArray(value)) {
    parent[lastKey] = mergeUniqueStrings(parent[lastKey], value);
    return;
  }

  parent[lastKey] = value;
}

function profileSummary(profile) {
  const lines = [];
  const filledWeights = Object.entries(profile.decisionWeights || {})
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value]) => `${key}=${value}`);

  if (profile.basicInfo.name || profile.basicInfo.school) {
    lines.push(
      `Identity: ${[profile.basicInfo.name, profile.basicInfo.school, profile.basicInfo.grade]
        .filter(Boolean)
        .join(" | ")}`,
    );
  }

  if (profile.careerGoal.primary) {
    lines.push(`Primary goal: ${profile.careerGoal.primary}`);
  }

  if (profile.futureVision.fiveYearGoal) {
    lines.push(`5-year goal: ${profile.futureVision.fiveYearGoal}`);
  }

  if (profile.personalContext.familyBackground) {
    lines.push(`Family context: ${profile.personalContext.familyBackground}`);
  }

  if (profile.personalContext.relationshipStatus !== "unknown") {
    lines.push(`Relationship context: ${profile.personalContext.relationshipStatus}`);
  }

  if (profile.constraints.financialPressure !== "unknown") {
    lines.push(`Financial pressure: ${profile.constraints.financialPressure}`);
  }

  if (profile.riskPreference.style !== "unknown") {
    lines.push(`Risk style: ${profile.riskPreference.style}`);
  }

  if (profile.careerGoal.targetDomains.length) {
    lines.push(`Target domains: ${profile.careerGoal.targetDomains.join(", ")}`);
  }

  if (profile.hiddenConcerns.length) {
    lines.push(`Hidden concerns: ${profile.hiddenConcerns.join(", ")}`);
  }

  if (filledWeights.length) {
    lines.push(`Decision weights: ${filledWeights.join(", ")}`);
  }

  if (profile.evidence.onlinePresence.githubUsername) {
    lines.push(`GitHub: ${profile.evidence.onlinePresence.githubUsername}`);
  }

  const airjellyBehavior = (profile.rawEvents || []).find(
    (event) => event.type === "airjelly_behavior_pattern",
  );
  if (airjellyBehavior?.summary) {
    lines.push(`Observed behavior: ${airjellyBehavior.summary}`);
  }

  return lines;
}

function detectContradictions(profile) {
  const contradictions = [];

  if (
    profile.careerGoal.primary.toLowerCase().includes("phd") &&
    profile.constraints.financialPressure === "high"
  ) {
    contradictions.push("Primary goal points to PhD, but financial pressure is high.");
  }

  if (
    profile.riskPreference.style === "conservative" &&
    profile.valueRanking.some((item) => item.includes("max_upside"))
  ) {
    contradictions.push("User says conservative, but value ranking overweights upside.");
  }

  if (
    profile.strengths.research >= 7 &&
    profile.hiddenConcerns.includes("graduation_difficulty")
  ) {
    contradictions.push("Research ability is strong, but fear of graduation difficulty may suppress long-cycle choices.");
  }

  if (
    profile.personalContext.relationshipStatus !== "unknown" &&
    profile.constraints.cityPreference.length === 0
  ) {
    contradictions.push("Relationship context exists, but city preference is still unclear.");
  }

  return contradictions;
}

function summarizeGithubEvidence(githubEvidence = []) {
  return githubEvidence.map((repo) => ({
    repo: repo.repo,
    type: repo.projectType,
    techStack: repo.techStack || [],
    inclination: repo.inclination || "engineering",
    activityLevel: repo.activityLevel || "medium",
    projectAnalysis: repo.projectAnalysis
      ? {
          summary: repo.projectAnalysis.summary || "",
          roleSignals: repo.projectAnalysis.roleSignals || [],
          technicalDepth: repo.projectAnalysis.technicalDepth || "unknown",
          productMaturity: repo.projectAnalysis.productMaturity || "unknown",
          resumeBullets: repo.projectAnalysis.resumeBullets || [],
          careerSignals: repo.projectAnalysis.careerSignals || [],
          risks: repo.projectAnalysis.risks || [],
        }
      : null,
  }));
}

function inferGithubFocus(githubEvidence = []) {
  return mergeUniqueStrings(
    [],
    githubEvidence.flatMap((repo) => [
      repo.projectType,
      ...(repo.techStack || []),
      repo.inclination,
      ...(repo.projectAnalysis?.careerSignals || []),
    ]),
  );
}

function dedupeRawEvents(events = []) {
  return [
    ...new Map(
      events
        .filter((event) => event?.summary || event?.name)
        .map((event) => [
          [event.type || "", event.name || "", event.summary || ""].join("|"),
          event,
        ]),
    ).values(),
  ];
}

function buildResumeSnapshot(profile) {
  const headlineParts = [];
  if (profile.basicInfo.grade) headlineParts.push(profile.basicInfo.grade);
  if (profile.basicInfo.major) headlineParts.push(profile.basicInfo.major);
  if (profile.careerGoal.targetDomains.length) {
    headlineParts.push(profile.careerGoal.targetDomains.join("/"));
  }

  const projects = (profile.evidence.github || []).map((repo) => ({
    name: repo.repo,
    type: repo.type,
    techStack: repo.techStack,
    narrative:
      repo.projectAnalysis?.summary ||
      `${repo.repo} shows ${repo.inclination} inclination with ${repo.activityLevel} activity.`,
    technicalDepth: repo.projectAnalysis?.technicalDepth || "unknown",
    resumeBullets: repo.projectAnalysis?.resumeBullets || [],
  }));

  const experiences = (profile.rawEvents || []).map((event) => ({
    type: event.type,
    name: event.name,
    summary: event.summary || "",
  }));

  const constraints = [
    profile.personalContext.familyBackground,
    profile.personalContext.relationshipStatus !== "unknown"
      ? `Relationship: ${profile.personalContext.relationshipStatus}`
      : "",
    profile.constraints.financialPressure !== "unknown"
      ? `Financial pressure: ${profile.constraints.financialPressure}`
      : "",
    profile.constraints.cityPreference.length
      ? `City preference: ${profile.constraints.cityPreference.join(", ")}`
      : "",
  ].filter(Boolean);

  return {
    headline: headlineParts.join(" | "),
    education: [
      [profile.basicInfo.school, profile.basicInfo.major, profile.basicInfo.grade]
        .filter(Boolean)
        .join(" | "),
    ].filter(Boolean),
    highlights: [
      profile.careerGoal.primary ? `Primary path under consideration: ${profile.careerGoal.primary}` : "",
      profile.futureVision.fiveYearGoal ? `5-year target: ${profile.futureVision.fiveYearGoal}` : "",
      profile.valueRanking.length ? `Decision values: ${profile.valueRanking.join(" > ")}` : "",
      Object.entries(profile.decisionWeights || {})
        .filter(([, value]) => Number(value) > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key, value]) => `${key}=${value}`)
        .join(", ")
        ? `Decision weights: ${Object.entries(profile.decisionWeights || {})
            .filter(([, value]) => Number(value) > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([key, value]) => `${key}=${value}`)
            .join(", ")}`
        : "",
      profile.evidence.onlinePresence.githubBio
        ? `GitHub bio signal: ${profile.evidence.onlinePresence.githubBio}`
        : "",
      (profile.rawEvents || []).find((event) => event.type === "airjelly_behavior_pattern")?.summary || "",
    ].filter(Boolean),
    projects,
    experiences,
    constraints,
    nextEvidenceToCollect: [
      profile.evidence.onlinePresence.githubUsername ? "" : "Collect GitHub username and main repositories.",
      profile.personalContext.familyBackground ? "" : "Clarify family support and economic assumptions.",
      profile.personalContext.relationshipStatus !== "unknown"
        ? ""
        : "Clarify whether relationship status affects city or migration choices.",
    ].filter(Boolean),
  };
}

export class ProfileUpdateSkill {
  constructor() {
    this.systemPrompt = [
      "You are the profile update module.",
      "Convert raw dialogue and growth evidence into a stable structured profile.",
      "Separate transient events from stable preferences.",
      "Do not summarize vaguely. Normalize into explicit fields and contradictions.",
      "Also produce a resume-like profile snapshot that product modules can render directly.",
    ].join(" ");
  }

  getPromptContract() {
    return {
      systemPrompt: this.systemPrompt,
      outputFormat: {
        profile: "json",
        contradictions: "string[]",
        profileSummary: "string[]",
        resumeSnapshot: "json",
      },
    };
  }

  update({
    knownProfile,
    extractedSignals = [],
    rawEvents = [],
    githubEvidence = [],
    githubProfile = null,
    airjellyContext = null,
  }) {
    const profile = cloneProfile(knownProfile);
    const airjellySignals = airjellyContext?.signals || [];

    for (const signal of [...extractedSignals, ...airjellySignals]) {
      if (!signal?.field) continue;

      if (signal.field === "rawEvents") {
        const event =
          typeof signal.value === "object" && signal.value !== null
            ? signal.value
            : {
                type: "conversation_evidence",
                name: "对话证据",
                summary: String(signal.value || ""),
              };
        profile.rawEvents = dedupeRawEvents([
          ...profile.rawEvents,
          {
            type: event.type || "conversation_evidence",
            name: event.name || event.title || event.type || "对话证据",
            summary: event.summary || event.detail || event.content || "",
            source: signal.source || "profile-extract",
          },
        ]);
        continue;
      }

      if (signal.field === "hiddenConcerns") {
        profile.hiddenConcerns = mergeUniqueStrings(profile.hiddenConcerns, [signal.value]);
        continue;
      }

      if (signal.field === "valueRanking") {
        profile.valueRanking = mergeUniqueStrings(profile.valueRanking, [signal.value]);
        continue;
      }

      if (signal.field === "careerGoal.secondary") {
        profile.careerGoal.secondary = mergeUniqueStrings(profile.careerGoal.secondary, [signal.value]);
        continue;
      }

      if (signal.field === "careerGoal.targetDomains") {
        profile.careerGoal.targetDomains = mergeUniqueStrings(profile.careerGoal.targetDomains, [signal.value]);
        continue;
      }

      if (signal.field === "constraints.cityPreference") {
        profile.constraints.cityPreference = mergeUniqueStrings(profile.constraints.cityPreference, [signal.value]);
        continue;
      }

      setByPath(profile, signal.field, signal.value);
    }

    profile.rawEvents = dedupeRawEvents([...profile.rawEvents, ...rawEvents]);
    profile.evidence.github = summarizeGithubEvidence(githubEvidence);
    profile.evidence.airjelly = airjellySignals;
    if (githubProfile?.username) {
      profile.evidence.onlinePresence.githubUsername = githubProfile.username;
    }
    if (githubProfile?.profileUrl) {
      profile.evidence.onlinePresence.githubProfileUrl = githubProfile.profileUrl;
    }
    if (githubProfile?.bio) {
      profile.evidence.onlinePresence.githubBio = githubProfile.bio;
    }
    profile.evidence.onlinePresence.reposObserved = profile.evidence.github.length;
    profile.evidence.onlinePresence.lastSyncedAt = Date.now();
    profile.evidence.onlinePresence.githubFocus = inferGithubFocus(githubEvidence);
    profile.profileSummary = profileSummary(profile);
    profile.resumeSnapshot = buildResumeSnapshot(profile);

    const contradictions = mergeUniqueStrings(
      detectContradictions(profile),
      (airjellyContext?.counterEvidence || []).map((item) => item.summary),
    );
    const completeness = completenessOfProfile(profile);

    return {
      profile,
      contradictions,
      completeness,
      profileSummary: profile.profileSummary,
      resumeSnapshot: profile.resumeSnapshot,
    };
  }
}
