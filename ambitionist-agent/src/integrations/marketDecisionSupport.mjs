import { callJsonLlm } from "./llmClient.mjs";

export async function generateMarketContextWithLlm({
  profile,
  transcript = [],
  targetYear,
  githubSync = {},
  airjelly = {},
  options = {},
}) {
  if (!options.enabled) {
    return {
      marketLandscape: null,
      candidatePaths: [],
      llmAvailable: false,
      llmReason: "LLM API is not enabled.",
    };
  }

  const result = await callJsonLlm({
    options: options.llm || {},
    temperature: 0.25,
    system: [
      "You generate the market and route context for a career-planning answer.",
      "Do not use a fixed path library. Create candidate directions from the user's real profile, constraints, projects, and current market context.",
      "Use natural Chinese user-facing direction titles.",
      "Avoid generic route names like Direct Job, Overseas MS, Top PhD, Balanced PhD, or Agent Startup.",
      "Return concise evidence that can be used by the planning model.",
    ].join(" "),
    schemaHint:
      '{"marketLandscape":{"hotDomains":["string"],"weakDomains":["string"],"notes":["string"],"hiringMood":"string","researchClimate":"string"},"candidatePaths":[{"pathId":"string","title":"string","category":"string","tags":["string"],"marketReasons":["string"],"risks":["string"]}],"searchMemory":{"focusAreas":["string"],"updateRule":"string","updates":[{"source":"string","title":"string","description":"string","memoryTag":"string"}]}}',
    user: JSON.stringify({
      targetYear,
      profile,
      recentTranscript: transcript.slice(-6),
      githubRepos: (githubSync.repos || []).slice(0, 4).map((repo) => ({
        repo: repo.repo,
        projectType: repo.projectType,
        techStack: repo.techStack,
        projectAnalysis: repo.projectAnalysis,
      })),
      airjellySummary: airjelly.contextSummary || null,
      airjellyTaskQueue: airjelly.taskQueue || null,
    }),
  });

  if (!result.available || !result.data?.marketLandscape) {
    return {
      marketLandscape: null,
      candidatePaths: [],
      llmAvailable: false,
      llmReason: result.reason || "LLM API did not return market context.",
    };
  }

  return {
    marketLandscape: result.data.marketLandscape,
    candidatePaths: Array.isArray(result.data.candidatePaths) ? result.data.candidatePaths : [],
    searchMemory: {
      focusAreas: Array.isArray(result.data.searchMemory?.focusAreas) ? result.data.searchMemory.focusAreas : [],
      updateRule: result.data.searchMemory?.updateRule || "",
      updates: Array.isArray(result.data.searchMemory?.updates) ? result.data.searchMemory.updates : [],
    },
    llmAvailable: true,
    llmModel: result.model,
  };
}
