export const DEFAULT_PROFILE = {
  basicInfo: {
    name: "",
    school: "",
    grade: "",
    major: "Computer Science",
    targetGraduationYear: null,
    preferredRegion: [],
  },
  personalContext: {
    familyBackground: "",
    familySupportLevel: "unknown",
    relationshipStatus: "unknown",
    emotionalAnchors: [],
    responsibilities: [],
  },
  careerGoal: {
    primary: "",
    secondary: [],
    targetDomains: [],
    targetRoles: [],
  },
  futureVision: {
    fiveYearGoal: "",
    idealLifestyle: "",
    nonNegotiables: [],
  },
  constraints: {
    financialPressure: "unknown",
    cityPreference: [],
    timePressure: "unknown",
    visaOrLocationConstraint: "",
  },
  riskPreference: {
    style: "unknown",
    volatilityTolerance: "unknown",
    reversibilityNeed: "unknown",
  },
  decisionWeights: {
    moneyUrgency: 0,
    partnerDistanceAversion: 0,
    familyDistanceAversion: 0,
    domainPassion: 0,
    returnHomeExpectation: 0,
    marketProspectPriority: 0,
  },
  strengths: {
    engineering: 0,
    research: 0,
    competition: 0,
    communication: 0,
    internship: 0,
  },
  hiddenConcerns: [],
  valueRanking: [],
  profileSummary: [],
  rawEvents: [],
  resumeSnapshot: {
    headline: "",
    education: [],
    highlights: [],
    projects: [],
    experiences: [],
    constraints: [],
    nextEvidenceToCollect: [],
  },
  evidence: {
    onlinePresence: {
      githubUsername: "",
      githubProfileUrl: "",
      githubFocus: [],
      githubBio: "",
      reposObserved: 0,
      lastSyncedAt: 0,
    },
    github: [],
    airjelly: [],
  },
};

export const DEFAULT_ORCHESTRATOR_STATE = {
  phase: "interviewing",
  askedQuestionIds: [],
  transcript: [],
  latestSignals: [],
  contradictions: [],
  profileCompleteness: 0,
};

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : [...base];
  }

  if (typeof base === "object" && base !== null) {
    const result = { ...base };
    const source = typeof override === "object" && override !== null ? override : {};

    for (const key of Object.keys(base)) {
      result[key] = deepMerge(base[key], source[key]);
    }

    for (const [key, value] of Object.entries(source)) {
      if (!(key in result)) {
        result[key] = value;
      }
    }

    return result;
  }

  return override !== undefined ? override : base;
}

export function cloneProfile(profile = DEFAULT_PROFILE) {
  return deepMerge(JSON.parse(JSON.stringify(DEFAULT_PROFILE)), JSON.parse(JSON.stringify(profile)));
}

export function createEmptyInput() {
  return {
    userId: "demo-user",
    targetYear: 2024,
    userMessage: "",
    knownProfile: cloneProfile(DEFAULT_PROFILE),
    transcript: [],
    rawEvents: [],
    githubEvidence: [],
    candidatePaths: [],
    airjelly: {
      enableSemanticSearch: false,
      memoryWindowDays: 30,
      eventWindowDays: 14,
      semanticQueryLimit: 2,
    },
    storage: {
      enabled: false,
      dir: "./data/profiles",
    },
  };
}

export function mergeUniqueStrings(existing = [], incoming = []) {
  return [...new Set([...(existing || []), ...(incoming || [])].filter(Boolean))];
}

export function completenessOfProfile(profile) {
  const filledWeights = Object.values(profile.decisionWeights || {}).filter((value) => Number(value) > 0).length;
  const checkpoints = [
    profile.basicInfo.school,
    profile.basicInfo.grade,
    profile.personalContext.familyBackground,
    profile.personalContext.relationshipStatus !== "unknown",
    profile.careerGoal.primary,
    profile.futureVision.fiveYearGoal,
    profile.constraints.financialPressure !== "unknown",
    profile.constraints.timePressure !== "unknown",
    profile.riskPreference.style !== "unknown",
    filledWeights >= 4,
    profile.valueRanking.length >= 3,
    profile.hiddenConcerns.length >= 1,
    profile.careerGoal.targetDomains.length >= 1,
    profile.evidence.onlinePresence.githubUsername,
  ];

  const hits = checkpoints.filter(Boolean).length;
  return Math.round((hits / checkpoints.length) * 100);
}
