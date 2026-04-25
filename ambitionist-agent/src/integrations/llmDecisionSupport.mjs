import { callJsonLlm } from "./llmClient.mjs";

export async function generateInterviewQuestionWithLlm({
  profile,
  candidateQuestion,
  transcript = [],
  githubSync = {},
  airjelly = {},
  options = {},
}) {
  if (!options.enabled) {
    return {
      ...candidateQuestion,
      id: "llm-interview-unavailable",
      prompt: "ChatGPT API 尚未启用，暂时不能生成下一轮对话内容。请先填写或配置 LLM Key。",
      reason: "对话回复已要求交给 ChatGPT API，不再使用规则库问题作为用户可见输出。",
      source: "llm-unavailable",
    };
  }

  const result = await callJsonLlm({
    options: options.llm || {},
    system:
      "You are a sharp but supportive career interview agent for CS students. Rewrite or improve the next question using the user's profile, GitHub evidence, and recent context. Ask exactly one high-information question.",
    schemaHint:
      '{"id":"string","prompt":"string","reason":"string","layer":"background|conflict|value-ranking|done","source":"llm-interview"}',
    user: JSON.stringify({
      profile,
      candidateQuestion,
      recentTranscript: transcript.slice(-4),
      githubRepos: (githubSync.repos || []).slice(0, 4).map((repo) => ({
        repo: repo.repo,
        projectType: repo.projectType,
        techStack: repo.techStack,
        projectAnalysis: repo.projectAnalysis,
      })),
      airjellySummary: airjelly.contextSummary || null,
    }),
  });

  if (!result.available || !result.data?.prompt) {
    return {
      ...candidateQuestion,
      id: "llm-interview-unavailable",
      prompt: `ChatGPT API 暂时没有返回可展示的问题：${result.reason || "empty response"}`,
      reason: "对话回复已要求交给 ChatGPT API，不再使用规则库问题作为用户可见输出。",
      source: "llm-unavailable",
    };
  }

  return {
    ...candidateQuestion,
    ...result.data,
    id: result.data.id || candidateQuestion.id,
    source: "llm-interview",
    llmModel: result.model,
  };
}

export async function extractProfileSignalsWithLlm({
  latestTurn = null,
  transcript = [],
  profile = {},
  options = {},
}) {
  if (!options.enabled || !latestTurn?.answer) return [];

  const result = await callJsonLlm({
    options: options.llm || {},
    temperature: 0,
    system: [
      "You extract structured career-profile fields from a user's answer.",
      "Only extract information that is explicitly stated or strongly implied by the answer.",
      "Return field/value pairs for stable personal profile data. Do not invent missing values.",
      "Use the exact field paths from the schema. For targetGraduationYear, return a number like 2027.",
      "For projects, internships, and research/paper evidence, return field rawEvents with an object value: {type,name,summary}.",
      "Use type project for projects, internship for internships/practical work, and research for papers, labs, research notes, or publications.",
      "For Chinese text, preserve the user's original wording for names, schools, grades, and goals.",
    ].join(" "),
    schemaHint:
      '{"signals":[{"field":"basicInfo.name|basicInfo.school|basicInfo.grade|basicInfo.major|basicInfo.targetGraduationYear|careerGoal.primary|careerGoal.secondary|careerGoal.targetDomains|careerGoal.targetRoles|futureVision.fiveYearGoal|futureVision.idealLifestyle|personalContext.familyBackground|personalContext.familySupportLevel|personalContext.relationshipStatus|constraints.financialPressure|constraints.cityPreference|constraints.timePressure|riskPreference.style|riskPreference.reversibilityNeed|hiddenConcerns|valueRanking|strengths.engineering|strengths.research|strengths.competition|strengths.communication|strengths.internship|decisionWeights.moneyUrgency|decisionWeights.partnerDistanceAversion|decisionWeights.familyDistanceAversion|decisionWeights.domainPassion|decisionWeights.returnHomeExpectation|decisionWeights.marketProspectPriority|evidence.onlinePresence.githubUsername|evidence.onlinePresence.githubProfileUrl|rawEvents","value":"string|number|boolean|object"}]}',
    user: JSON.stringify({
      currentProfile: {
        basicInfo: profile.basicInfo,
        careerGoal: profile.careerGoal,
        futureVision: profile.futureVision,
        personalContext: profile.personalContext,
        constraints: profile.constraints,
        riskPreference: profile.riskPreference,
        decisionWeights: profile.decisionWeights,
      },
      latestTurn,
      recentTranscript: transcript.slice(-4),
    }),
  });

  if (!result.available || !Array.isArray(result.data?.signals)) {
    return [];
  }

  return result.data.signals
    .filter((signal) => signal?.field && signal.value !== undefined && signal.value !== null && signal.value !== "")
    .map((signal) => ({
      field: String(signal.field),
      value: signal.value,
      source: "llm-extract",
    }));
}

export async function selectConversationHighlightsWithLlm({
  transcript = [],
  profile,
  options = {},
}) {
  if (!options.enabled || !transcript.length) return null;

  const result = await callJsonLlm({
    options: options.llm || {},
    system:
      "You decide which career-planning conversation turns deserve long-term storage in a personal profile archive. Keep only stable preferences, constraints, goals, evidence, and important contradictions. Do not keep small talk.",
    schemaHint:
      '{"highlights":[{"questionId":"string","importanceScore":0,"reason":"string"}],"storageNotes":["string"]}',
    user: JSON.stringify({
      profile: {
        careerGoal: profile?.careerGoal,
        constraints: profile?.constraints,
        decisionWeights: profile?.decisionWeights,
        hiddenConcerns: profile?.hiddenConcerns,
      },
      transcript,
    }),
  });

  if (!result.available || !Array.isArray(result.data?.highlights)) {
    return null;
  }

  return {
    highlights: result.data.highlights,
    storageNotes: result.data.storageNotes || [],
    llmModel: result.model,
  };
}
