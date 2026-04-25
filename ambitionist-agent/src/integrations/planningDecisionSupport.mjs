import { callJsonLlm } from "./llmClient.mjs";

const INTERNAL_PATH_TITLES = [
  "Direct Job -> AI Engineer",
  "Overseas MS -> Re-enter Job Market",
  "Top PhD -> Research Track",
  "Balanced PhD -> Asia Hub",
  "Agent Startup / Builder Path",
];

function isInternalPathTitle(value = "") {
  const normalized = String(value).trim().toLowerCase();
  return INTERNAL_PATH_TITLES.some((title) => normalized === title.toLowerCase());
}

function publicTitle(value, fallback) {
  return isInternalPathTitle(value) ? fallback : value || fallback;
}

export async function generateCareerPlanWithLlm({
  profile,
  profileSummary = [],
  transcript = [],
  marketLandscape = {},
  comparison = {},
  githubSync = {},
  airjelly = {},
  profileCompleteness = 0,
  options = {},
}) {
  const emptyApiPlan = {
    rankings: [],
    topRecommendation: null,
    whyNotOthers: [],
    nextActions: {
      next3Months: [],
      next12Months: [],
    },
    developmentDirection: "",
    conversationalReply: "",
    followUpQuestion: null,
    llmAvailable: false,
    llmReason: "LLM API is not enabled.",
  };

  if (!options.enabled) return emptyApiPlan;

  const result = await callJsonLlm({
    options: options.llm || {},
    temperature: 0.3,
    system: [
      "You are a conversational career planning advisor for a CS student.",
      "Use internal scoring signals only as rough private context; do not copy their path IDs, English labels, or template route names into the user-facing answer.",
      "Create your own user-facing direction names in natural Chinese based on the user's real situation.",
      "Do not output generic or template-like action items. Tailor every recommendation to the user's stated constraints, projects, offers, relationship constraints, GitHub evidence, and missing information.",
      "If profileCompleteness is below 50, give only provisional advice and one follow-up question. Do not generate a future roadmap or concrete nextActions until profileCompleteness is at least 50.",
      "AirJelly taskQueue.byScene contains open tasks grouped by l1_scene for specialized agents. Use task progress, next plan, and memories as context before advice.",
      "Keep the tone like a helpful ChatGPT conversation: give useful advice now, explain why, and ask one useful follow-up question if more information is needed.",
      "Return concise Chinese unless the user's content is mainly English.",
    ].join(" "),
    schemaHint:
      '{"developmentDirection":"string","topRecommendation":{"pathId":"string","title":"string","reason":"string"},"rankings":[{"pathId":"string","title":"string","fitLabel":"string","reasons":["string"],"risks":["string"]}],"nextActions":{"next3Months":["string"],"next12Months":["string"]},"conversationalReply":"string","followUpQuestion":{"id":"string","prompt":"string","reason":"string","layer":"background|conflict|value-ranking|done"}}',
    user: JSON.stringify({
      profile,
      profileCompleteness,
      profileSummary,
      recentTranscript: transcript.slice(-6),
      marketLandscape,
      internalScoringSignals: {
        decisionWeightsUsed: comparison.decisionWeightsUsed || {},
        candidateDirections: comparison.candidateDirections || [],
        rankings: (comparison.rankings || []).slice(0, 6).map((ranking) => ({
          score: ranking.totalScore,
          fitLabel: ranking.fitLabel,
          reasons: ranking.reasons,
          risks: ranking.risks,
          decisionWeightHighlights: ranking.decisionWeightHighlights,
        })),
      },
      githubRepos: (githubSync.repos || []).slice(0, 4).map((repo) => ({
        repo: repo.repo,
        projectType: repo.projectType,
        techStack: repo.techStack,
        projectAnalysis: repo.projectAnalysis,
      })),
      airjellyTaskQueue: airjelly.taskQueue || null,
    }),
  });

  if (!result.available || !result.data) {
    return {
      ...emptyApiPlan,
      llmReason: result.reason || "LLM API did not return planning data.",
    };
  }

  const data = result.data;
  const allowFuturePlan = Number(profileCompleteness || 0) >= 50;
  const fallbackDirection = data.developmentDirection || "结合当前画像的职业发展方向";
  const rankings = Array.isArray(data.rankings)
    ? data.rankings.map((item, index) => ({
        pathId: item.pathId || `llm-plan-${index + 1}`,
        title: publicTitle(item.title, `${fallbackDirection} ${index + 1}`),
        totalScore: Number(item.totalScore || item.score || 0),
        fitLabel: item.fitLabel || "ChatGPT 判断",
        reasons: Array.isArray(item.reasons) ? item.reasons : [],
        risks: Array.isArray(item.risks) ? item.risks : [],
      }))
    : [];

  return {
    rankings,
    developmentDirection: data.developmentDirection || "",
    topRecommendation: data.topRecommendation
      ? {
          pathId: data.topRecommendation.pathId || "llm-top-recommendation",
          title: publicTitle(data.topRecommendation.title, fallbackDirection),
          reason: data.topRecommendation.reason || data.topRecommendation.summary || "",
          summary: data.topRecommendation.summary || data.topRecommendation.reason || "",
          llmModel: result.model,
        }
      : null,
    whyNotOthers: Array.isArray(data.whyNotOthers) ? data.whyNotOthers : [],
    nextActions: allowFuturePlan
      ? {
        next3Months: Array.isArray(data.nextActions?.next3Months)
        ? data.nextActions.next3Months
        : [],
        next12Months: Array.isArray(data.nextActions?.next12Months)
        ? data.nextActions.next12Months
        : [],
      }
      : {
        next3Months: [],
        next12Months: [],
      },
    conversationalReply: allowFuturePlan
      ? data.conversationalReply || ""
      : [
          data.conversationalReply || "",
          `当前档案完整度约 ${Math.round(Number(profileCompleteness || 0))}%，我可以先给临时判断和追问；短期/长期未来计划会在档案完整度超过 50% 后生成。`,
        ]
          .filter(Boolean)
          .join("\n\n"),
    followUpQuestion: data.followUpQuestion?.prompt
      ? {
          id: data.followUpQuestion.id || "llm-plan-follow-up",
          prompt: data.followUpQuestion.prompt,
          reason: data.followUpQuestion.reason || "继续补齐规划判断所需的信息。",
          layer: data.followUpQuestion.layer || "done",
          source: "llm-plan",
          llmModel: result.model,
        }
      : null,
    llmModel: result.model,
    llmAvailable: true,
  };
}
