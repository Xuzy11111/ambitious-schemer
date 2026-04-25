import { checkAirJellyCliStatus, collectAirJellyCliSignals } from "./integrations/airjellyCli.mjs";
import { collectAirJellySdkSignals } from "./integrations/airjellySdk.mjs";
import { enrichGithubReposWithContentAnalysis } from "./integrations/githubProjectAnalysis.mjs";
import { fetchGithubProfileEvidence } from "./integrations/githubProfile.mjs";
import {
  extractProfileSignalsWithLlm,
  generateInterviewQuestionWithLlm,
  selectConversationHighlightsWithLlm,
} from "./integrations/llmDecisionSupport.mjs";
import { generateCareerPlanWithLlm } from "./integrations/planningDecisionSupport.mjs";
import { generateProfilePresentationWithLlm } from "./integrations/profilePresentationSupport.mjs";
import {
  generateInterviewStateWithLlm,
  generateProfileUpdateWithLlm,
} from "./integrations/profileStateSupport.mjs";
import { generateMarketContextWithLlm } from "./integrations/marketDecisionSupport.mjs";
import { DeepInterviewSkill } from "./skills/deepInterviewSkill.mjs";
import { ProfileUpdateSkill } from "./skills/profileUpdateSkill.mjs";
import { buildProfileRecord, JsonProfileRepository } from "./storage/profileRepository.mjs";
import { cloneProfile, DEFAULT_ORCHESTRATOR_STATE } from "./types.mjs";

function isPlanningRequest(text = "") {
  const normalized = String(text).toLowerCase();
  return [
    "建议",
    "规划",
    "计划",
    "怎么选",
    "如何选择",
    "适合",
    "路线",
    "路径",
    "应该",
    "recommend",
    "advice",
    "plan",
    "choose",
    "roadmap",
  ].some((keyword) => normalized.includes(keyword));
}

const READY_PROFILE_COMPLETENESS = 50;
const PLAN_REFRESH_TURN_INTERVAL = 3;

const FIRST_ONBOARDING_QUESTION = {
  id: "first-self-introduction",
  layer: "background",
  prompt:
    "先做一个简短自我介绍吧：你叫什么或希望我怎么称呼你？来自哪所学校、什么专业、预计哪一年毕业？如果方便，也请提供你的 GitHub 账号或主页链接，我会用它来整理你的项目和能力证据。",
  reason: "第一次进入系统先建立基础身份、决策时间窗口和公开项目证据。",
  source: "fixed-onboarding",
};

export class AmbitionistOrchestrator {
  constructor() {
    this.deepInterviewSkill = new DeepInterviewSkill();
    this.profileUpdateSkill = new ProfileUpdateSkill();
  }

  async persistIfEnabled({
    input,
    status,
    profile,
    profileSummary,
    resumeSnapshot,
    state,
    interviewBoard,
    githubSync,
    airjelly,
    contradictions,
  }) {
    if (!input.storage?.enabled) {
      return null;
    }

    const repository = new JsonProfileRepository(input.storage.dir);
    const combinedRawEvents = [...(input.rawEvents || []), ...(airjelly?.rawEvents || [])];
    const storageDecision = await selectConversationHighlightsWithLlm({
      transcript: input.transcript || [],
      profile,
      options: {
        enabled: input.storage?.llmDecisionEnabled ?? Boolean(input.llm?.enabled),
        llm: input.llm || {},
      },
    });
    const storagePath = await repository.save(
      buildProfileRecord({
        userId: input.userId || "anonymous",
        status,
        profile,
        profileSummary,
        resumeSnapshot,
        transcript: input.transcript || [],
        rawEvents: combinedRawEvents,
        state,
        interviewBoard,
        githubSync,
        airjelly,
        contradictions,
        storageDecision,
      }),
    );

    return {
      enabled: true,
      path: storagePath,
    };
  }

  async collectAirJellySignals({ profile, transcript = [], latestAnswer = "", options = {} } = {}) {
    if (options.enabled === false) {
      return {
        available: false,
        source: "disabled",
        signals: [],
        errors: [],
        warnings: ["AirJelly collection is disabled by frontend configuration."],
        capabilities: null,
        rawEvents: [],
        counterEvidence: [],
        interviewHints: [],
        semanticQueries: [],
        semanticSearchEnabled: false,
        contextSummary: {
          dominantMode: "unknown",
          modeScores: {},
          topApps: [],
          topTasks: [],
          focusProjects: [],
          semanticMatches: [],
        },
        taskQueue: {
          totalOpenTasks: 0,
          scenes: [],
          byScene: {},
          dispatchPlan: {},
        },
      };
    }

    const statusCheck = await checkAirJellyCliStatus();
    if (!statusCheck.available) {
      return {
        available: false,
        source: "cli-status",
        signals: [],
        errors: [statusCheck.error].filter(Boolean),
        warnings: ["AirJelly status check failed; open task queue was not loaded."],
        capabilities: null,
        rawEvents: [],
        counterEvidence: [],
        interviewHints: [],
        semanticQueries: [],
        semanticSearchEnabled: false,
        contextSummary: {
          dominantMode: "unknown",
          modeScores: {},
          topApps: [],
          topTasks: [],
          focusProjects: [],
          semanticMatches: [],
        },
        taskQueue: {
          totalOpenTasks: 0,
          scenes: [],
          byScene: {},
          dispatchPlan: {},
        },
      };
    }

    const sdkResult = await collectAirJellySdkSignals({
      profile,
      transcript,
      latestAnswer,
      options,
    });
    if (sdkResult.available) {
      return sdkResult;
    }

    const cliResult = await collectAirJellyCliSignals({
      profile,
      transcript,
      latestAnswer,
      options,
    });
    if (cliResult.available) {
      return cliResult;
    }

    return {
      available: false,
      source: "none",
      signals: [],
      errors: [sdkResult.error, cliResult.error].filter(Boolean),
      warnings: [...(sdkResult.warnings || []), ...(cliResult.warnings || [])],
      capabilities: sdkResult.capabilities || cliResult.capabilities || null,
      rawEvents: [],
      counterEvidence: [],
      interviewHints: [],
      semanticQueries: [],
      semanticSearchEnabled: false,
      contextSummary: {
        dominantMode: "unknown",
        modeScores: {},
        topApps: [],
        topTasks: [],
        focusProjects: [],
        semanticMatches: [],
      },
      taskQueue: {
        totalOpenTasks: 0,
        scenes: [],
        byScene: {},
        dispatchPlan: {},
      },
    };
  }

  async runInterviewStep({
    profile,
    askedQuestionIds,
    transcript = [],
    latestAnswer = "",
    latestQuestionId = "",
    airjellyContext = {},
    options = {},
  }) {
    if (!transcript.length && !latestAnswer) {
      return {
        completeness: 0,
        shouldAdviseNow: false,
        phase: "interviewing",
        nextQuestion: FIRST_ONBOARDING_QUESTION,
        extractedSignals: [],
        interviewBoard: {
          completeness: 0,
          currentLayer: "background",
          interviewerMode: "首轮自我介绍",
          missingChecklist: [
            { key: "identity", done: false, prompt: "姓名/称呼、学校、专业、毕业年份" },
            { key: "github", done: false, prompt: "GitHub 账号或主页链接" },
          ],
          firstTurnAgenda: [FIRST_ONBOARDING_QUESTION.prompt],
          proactiveQuestions: [FIRST_ONBOARDING_QUESTION],
          suggestedNextQuestion: FIRST_ONBOARDING_QUESTION,
          memoryGrounding: {
            available: Boolean(airjellyContext.available),
            source: airjellyContext.source || "none",
            taskQueue: airjellyContext.taskQueue || null,
          },
        },
      };
    }

    const llmInterviewState = await generateInterviewStateWithLlm({
      profile,
      askedQuestionIds,
      transcript,
      latestAnswer,
      latestQuestionId,
      airjelly: airjellyContext,
      options,
    });
    if (llmInterviewState) {
      return llmInterviewState;
    }

    const interviewState = this.deepInterviewSkill.evaluate(profile, askedQuestionIds, airjellyContext);
    const nextQuestion = interviewState.nextQuestion;
    const ruleSignals = (transcript || []).flatMap((turn) =>
      turn.questionId && turn.questionId !== "complete"
        ? this.deepInterviewSkill.extractSignals(turn.answer || "", turn.questionId)
        : [],
    );
    const llmSignals =
      latestQuestionId && latestQuestionId !== "complete"
        ? await extractProfileSignalsWithLlm({
            latestTurn: transcript.at(-1) || {
              questionId: latestQuestionId,
              question: nextQuestion?.prompt || "",
              answer: latestAnswer,
            },
            transcript,
            profile,
            options,
          })
        : [];
    const signalKey = (signal) => `${signal.field}:${JSON.stringify(signal.value)}`;
    const extractedSignals = [...new Map([...ruleSignals, ...llmSignals].map((signal) => [signalKey(signal), signal])).values()];

    return {
      completeness: interviewState.completeness,
      nextQuestion,
      extractedSignals,
      interviewBoard: interviewState.interviewBoard,
      shouldAdviseNow: false,
    };
  }

  async runHeartbeatCycle(input) {
    const state = {
      ...DEFAULT_ORCHESTRATOR_STATE,
      transcript: input.transcript || [],
      askedQuestionIds: (input.transcript || []).map((item) => item.questionId).filter(Boolean),
    };

    const profile = cloneProfile(input.knownProfile);
    const latestAnswer = input.transcript.at(-1)?.answer || input.userMessage || "";
    const latestQuestionId = input.transcript.at(-1)?.questionId || "";
    const airjelly = await this.collectAirJellySignals({
      profile,
      transcript: input.transcript || [],
      latestAnswer,
      options: input.airjelly || {},
    });

    const interviewStep = await this.runInterviewStep({
      profile,
      askedQuestionIds: state.askedQuestionIds,
      transcript: input.transcript || [],
      latestAnswer,
      latestQuestionId,
      airjellyContext: airjelly,
      options: {
        enabled: input.interview?.llmExtractionEnabled ?? Boolean(input.llm?.enabled),
        llm: input.llm || {},
      },
    });

    state.profileCompleteness = interviewStep.completeness;
    const githubUsername =
      input.knownProfile?.evidence?.onlinePresence?.githubUsername ||
      interviewStep.extractedSignals.find((item) => item.field === "evidence.onlinePresence.githubUsername")
        ?.value ||
      "";
    let githubSync =
      githubUsername && !(input.githubEvidence || []).length
        ? await fetchGithubProfileEvidence(githubUsername, {
            maxRepos: input.githubAnalysis?.maxRepos || 6,
            githubToken: input.githubAnalysis?.githubToken,
          })
        : {
            available: (input.githubEvidence || []).length > 0,
            reason: "",
            profile: null,
            repos: input.githubEvidence || [],
          };
    githubSync = {
      ...githubSync,
      repos: await enrichGithubReposWithContentAnalysis(githubSync.repos || [], {
        enabled: input.githubAnalysis?.enabled ?? Boolean(input.llm?.enabled),
        maxRepos: input.githubAnalysis?.analysisRepoLimit || 3,
        githubToken: input.githubAnalysis?.githubToken,
        llm: input.llm || {},
      }),
    };

    const ruleProfileUpdate = this.profileUpdateSkill.update({
      knownProfile: profile,
      extractedSignals: interviewStep.extractedSignals,
      rawEvents: [...(input.rawEvents || []), ...(airjelly.rawEvents || [])],
      githubEvidence: githubSync.repos || input.githubEvidence || [],
      githubProfile: githubSync.profile,
      airjellyContext: airjelly,
    });
    const llmProfileUpdate = await generateProfileUpdateWithLlm({
      knownProfile: profile,
      extractedSignals: interviewStep.extractedSignals,
      rawEvents: [...(input.rawEvents || []), ...(airjelly.rawEvents || [])],
      githubSync,
      airjelly,
      transcript: input.transcript || [],
      options: {
        enabled: input.interview?.llmExtractionEnabled ?? Boolean(input.llm?.enabled),
        llm: input.llm || {},
      },
    });
    const profileUpdate = llmProfileUpdate || ruleProfileUpdate;

    state.profileCompleteness = profileUpdate.completeness || interviewStep.completeness || 0;
    state.contradictions = profileUpdate.contradictions;
    state.latestSignals = [...interviewStep.extractedSignals, ...(airjelly.signals || [])];
    const profilePresentation = await generateProfilePresentationWithLlm({
      profile: profileUpdate.profile,
      profileSummary: profileUpdate.profileSummary,
      resumeSnapshot: profileUpdate.resumeSnapshot,
      latestSignals: state.latestSignals,
      transcript: input.transcript || [],
      githubSync,
      airjelly,
      options: {
        enabled: input.interview?.llmExtractionEnabled ?? Boolean(input.llm?.enabled),
        llm: input.llm || {},
      },
    });
    const profileSummary = profilePresentation?.profileSummary || profileUpdate.profileSummary;
    const resumeSnapshot = profilePresentation?.resumeSnapshot || profileUpdate.resumeSnapshot;

    const hasEnoughProfileForAdvice = state.profileCompleteness >= READY_PROFILE_COMPLETENESS;
    const latestIsPlanningRequest = isPlanningRequest(latestAnswer || input.userMessage);
    const isScheduledPlanRefresh =
      state.transcript.length > 0 &&
      state.transcript.length % PLAN_REFRESH_TURN_INTERVAL === 0;
    const shouldAdviseNow =
      Boolean(interviewStep.shouldAdviseNow) ||
      latestIsPlanningRequest ||
      (hasEnoughProfileForAdvice && isScheduledPlanRefresh);

    if (!shouldAdviseNow) {
      state.phase = "interviewing";
      const interviewBoard =
        interviewStep.interviewBoard ||
        this.deepInterviewSkill.buildInterviewBoard(
          profileUpdate.profile,
          state.askedQuestionIds,
          profileUpdate.contradictions,
          airjelly,
        );
      const nextQuestion =
        interviewStep.nextQuestion ||
        (await generateInterviewQuestionWithLlm({
          profile: profileUpdate.profile,
          candidateQuestion: this.deepInterviewSkill.planNextQuestion(
            profileUpdate.profile,
            state.askedQuestionIds,
            airjelly,
          ),
          transcript: input.transcript || [],
          githubSync,
          airjelly,
          options: {
            enabled: input.interview?.llmQuestionEnabled ?? Boolean(input.llm?.enabled),
            llm: input.llm || {},
          },
        }));
      interviewBoard.suggestedNextQuestion = nextQuestion;
      const storage = await this.persistIfEnabled({
        input,
        status: "needs_interview",
        profile: profileUpdate.profile,
        profileSummary,
        resumeSnapshot,
        state,
        interviewBoard,
        githubSync,
        airjelly,
        contradictions: profileUpdate.contradictions,
      });
      return {
        status: "needs_interview",
        state,
        airjelly,
        githubSync,
        nextQuestion,
        interviewBoard,
        profile: profileUpdate.profile,
        profileSummary,
        resumeSnapshot,
        ...(profilePresentation ? { profilePresentation } : {}),
        contradictions: profileUpdate.contradictions,
        ...(storage ? { storage } : {}),
      };
    }

    state.phase = "market_searching";
    const llmMarketContext = await generateMarketContextWithLlm({
      targetYear: input.targetYear,
      profile: profileUpdate.profile,
      transcript: input.transcript || [],
      githubSync,
      airjelly,
      options: {
        enabled: input.planning?.llmPlanEnabled ?? Boolean(input.llm?.enabled),
        llm: input.llm || {},
      },
    });
    const marketSearch = llmMarketContext.llmAvailable
      ? llmMarketContext
      : {
          marketLandscape: null,
          candidatePaths: [],
          searchMemory: {
            focusAreas: [],
            updateRule: "",
            updates: [],
          },
          llmAvailable: false,
          llmReason: llmMarketContext.llmReason,
        };

    state.phase = "comparing";
    const heuristicComparison = {
      rankings: [],
      topRecommendation: null,
      whyNotOthers: [],
      nextActions: {},
      decisionWeightsUsed: profileUpdate.profile.decisionWeights || {},
      candidateDirections: marketSearch.candidatePaths || [],
    };
    const comparison = await generateCareerPlanWithLlm({
      profile: profileUpdate.profile,
      profileSummary,
      transcript: input.transcript || [],
      marketLandscape: marketSearch.marketLandscape,
      comparison: heuristicComparison,
      githubSync,
      airjelly,
      profileCompleteness: state.profileCompleteness,
      options: {
        enabled: input.planning?.llmPlanEnabled ?? Boolean(input.llm?.enabled),
        llm: input.llm || {},
      },
    });

    state.phase = "done";
    const result = {
      status: "ready",
      state,
      airjelly,
      githubSync,
      profile: profileUpdate.profile,
      profileSummary,
      resumeSnapshot,
      ...(profilePresentation ? { profilePresentation } : {}),
      interviewBoard:
        interviewStep.interviewBoard ||
        this.deepInterviewSkill.buildInterviewBoard(
          profileUpdate.profile,
          state.askedQuestionIds,
          profileUpdate.contradictions,
          airjelly,
        ),
      followUpQuestion: comparison.followUpQuestion || null,
      contradictions: profileUpdate.contradictions,
      marketLandscape: marketSearch.marketLandscape,
      marketContext: marketSearch,
      comparison,
    };

    const storage = await this.persistIfEnabled({
      input,
      status: "ready",
      profile: profileUpdate.profile,
      profileSummary,
      resumeSnapshot,
      state,
      interviewBoard: result.interviewBoard,
      githubSync,
      airjelly,
      contradictions: profileUpdate.contradictions,
    });
    if (storage) {
      result.storage = storage;
    }

    return result;
  }
}
