import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HIGH_SIGNAL_QUESTION_IDS = [
  "bg-family-background",
  "bg-relationship-status",
  "bg-primary-goal",
  "bg-five-year-goal",
  "bg-domain",
  "conflict-money",
  "conflict-risk",
  "value-weight-scoring",
  "resolve-contradiction",
];

function safeUserId(userId = "anonymous") {
  return String(userId).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function scoreEventImportance(event = {}) {
  let score = 20;
  const type = String(event.type || "").toLowerCase();
  const text = [event.name, event.summary, event.title].filter(Boolean).join(" ").toLowerCase();

  if (["offer", "publication", "journal_publication", "paper", "award", "internship", "career_plan"].includes(type)) {
    score += 70;
  }
  if (["airjelly_behavior_pattern"].includes(type)) {
    score += 30;
  }
  if (["airjelly_task_focus"].includes(type)) {
    score += Math.min(35, (event.evidenceCount || 0) * 5);
  }
  if (["decision_weights", "future_goal", "profile_milestone"].includes(type)) {
    score += 80;
  }
  if (text.includes("phd") || text.includes("offer") || text.includes("publication") || text.includes("期刊")) {
    score += 15;
  }
  if (text.includes("weight") || text.includes("五年") || text.includes("career")) {
    score += 20;
  }

  return Math.min(100, score);
}

function pickKeyEvents(rawEvents = []) {
  return rawEvents
    .map((event) => ({
      ...event,
      importanceScore: scoreEventImportance(event),
    }))
    .filter((event) => event.importanceScore >= 60)
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 20);
}

function scoreTranscriptTurnImportance(turn = {}) {
  let score = 15;
  const questionId = String(turn.questionId || "");
  const text = [turn.question, turn.answer].filter(Boolean).join(" ").toLowerCase();

  if (HIGH_SIGNAL_QUESTION_IDS.includes(questionId)) {
    score += 55;
  }
  if (questionId.startsWith("airjelly-counter-")) {
    score += 45;
  }
  if (questionId.startsWith("airjelly-hint-")) {
    score += 25;
  }
  if (text.includes("github.com/") || text.includes("期刊") || text.includes("publication")) {
    score += 25;
  }
  if (
    text.includes("赚钱") ||
    text.includes("伴侣") ||
    text.includes("家人") ||
    text.includes("回国") ||
    text.includes("phd") ||
    text.includes("career")
  ) {
    score += 20;
  }
  if ((turn.answer || "").trim().length >= 80) {
    score += 10;
  }

  return Math.min(100, score);
}

function pickConversationHighlights(transcript = [], storageDecision = null) {
  const llmHighlightIds = new Set(
    (storageDecision?.highlights || []).map((item) => item.questionId).filter(Boolean),
  );
  return transcript
    .map((turn, index) => ({
      ...turn,
      order: index,
      importanceScore: Math.max(
        scoreTranscriptTurnImportance(turn),
        llmHighlightIds.has(turn.questionId) ? 90 : 0,
      ),
      storageReason:
        (storageDecision?.highlights || []).find((item) => item.questionId === turn.questionId)?.reason || "",
    }))
    .filter((turn) => turn.importanceScore >= 60)
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 10)
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...turn }) => turn);
}

function buildProgressSignals(profile, profileSummary = [], contradictions = []) {
  const weights = Object.entries(profile.decisionWeights || {})
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, value]) => ({ key, value }));

  return {
    primaryGoal: profile.careerGoal.primary || "",
    fiveYearGoal: profile.futureVision.fiveYearGoal || "",
    topDecisionWeights: weights,
    hiddenConcerns: profile.hiddenConcerns || [],
    profileSummary: profileSummary.slice(0, 8),
    contradictions: contradictions.slice(0, 6),
  };
}

function compactState(state = {}) {
  return {
    phase: state.phase || "unknown",
    profileCompleteness: state.profileCompleteness || 0,
    contradictions: (state.contradictions || []).slice(0, 6),
    askedQuestionIds: (state.askedQuestionIds || []).slice(-12),
    latestSignals: (state.latestSignals || []).slice(-12),
  };
}

function compactInterviewBoard(interviewBoard = {}) {
  return {
    completeness: interviewBoard.completeness || 0,
    currentLayer: interviewBoard.currentLayer || "unknown",
    interviewerMode: interviewBoard.interviewerMode || "",
    layerProgress: interviewBoard.layerProgress || {},
    missingChecklist: (interviewBoard.missingChecklist || []).slice(0, 8),
    pendingThemes: (interviewBoard.pendingThemes || []).slice(0, 5),
    suggestedNextQuestion: interviewBoard.suggestedNextQuestion || null,
    contradictionQuestion: interviewBoard.contradictionQuestion || null,
    memoryGrounding: interviewBoard.memoryGrounding || null,
  };
}

function compactGithubSync(githubSync = {}) {
  return {
    available: Boolean(githubSync.available),
    reason: githubSync.reason || "",
    profile: githubSync.profile
      ? {
          username: githubSync.profile.username,
          profileUrl: githubSync.profile.profileUrl,
          bio: githubSync.profile.bio,
        }
      : null,
    repos: (githubSync.repos || []).slice(0, 8).map((repo) => ({
      repo: repo.repo,
      projectType: repo.projectType,
      techStack: repo.techStack || [],
      inclination: repo.inclination || "",
      activityLevel: repo.activityLevel || "",
      readmeAvailable: Boolean(repo.readmeAvailable),
      sourceSampleCount: repo.sourceSampleCount || 0,
      projectAnalysis: repo.projectAnalysis
        ? {
            summary: repo.projectAnalysis.summary || "",
            roleSignals: repo.projectAnalysis.roleSignals || [],
            technicalDepth: repo.projectAnalysis.technicalDepth || "",
            productMaturity: repo.projectAnalysis.productMaturity || "",
            careerSignals: repo.projectAnalysis.careerSignals || [],
            risks: repo.projectAnalysis.risks || [],
          }
        : null,
    })),
  };
}

function compactAirjellyContext(airjelly = {}) {
  return {
    available: Boolean(airjelly.available),
    source: airjelly.source || "none",
    errorType: airjelly.errorType || "",
    error: airjelly.error || "",
    warnings: (airjelly.warnings || []).slice(0, 6),
    semanticSearchEnabled: Boolean(airjelly.semanticSearchEnabled),
    semanticQueries: (airjelly.semanticQueries || []).slice(0, 3),
    contextSummary: {
      dominantMode: airjelly.contextSummary?.dominantMode || "unknown",
      topApps: (airjelly.contextSummary?.topApps || []).slice(0, 3),
      topTasks: (airjelly.contextSummary?.topTasks || []).slice(0, 3),
      focusProjects: (airjelly.contextSummary?.focusProjects || []).slice(0, 3),
      semanticMatches: (airjelly.contextSummary?.semanticMatches || []).slice(0, 3),
    },
    counterEvidence: (airjelly.counterEvidence || []).slice(0, 4).map((item) => ({
      id: item.id,
      summary: item.summary,
      severity: item.severity,
    })),
    interviewHints: (airjelly.interviewHints || []).slice(0, 4),
    capabilities: airjelly.capabilities
      ? {
          apiVersion: airjelly.capabilities.apiVersion,
          appVersion: airjelly.capabilities.appVersion,
          methodCount: Array.isArray(airjelly.capabilities.methods)
            ? airjelly.capabilities.methods.length
            : 0,
        }
      : null,
  };
}

function buildStoredProfile(profile, keyEvents) {
  return {
    ...profile,
    rawEvents: keyEvents,
    evidence: {
      ...(profile.evidence || {}),
      airjelly: (profile.evidence?.airjelly || []).slice(0, 12),
    },
  };
}

function buildSynthesizedKeyEvents(profile) {
  const events = [];
  const topWeights = Object.entries(profile.decisionWeights || {})
    .filter(([, value]) => Number(value) > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (topWeights.length) {
    events.push({
      type: "decision_weights",
      name: "Decision weight profile",
      summary: topWeights.map(([key, value]) => `${key}=${value}`).join(", "),
    });
  }

  if (profile.futureVision?.fiveYearGoal) {
    events.push({
      type: "future_goal",
      name: "Five-year goal",
      summary: profile.futureVision.fiveYearGoal,
    });
  }

  if (profile.careerGoal?.primary) {
    events.push({
      type: "career_plan",
      name: "Current primary path",
      summary: profile.careerGoal.primary,
    });
  }

  return events;
}

export class JsonProfileRepository {
  constructor(baseDir = "./data/profiles") {
    this.baseDir = baseDir;
  }

  buildPath(userId) {
    return path.join(this.baseDir, `${safeUserId(userId)}.json`);
  }

  async save(record) {
    await mkdir(this.baseDir, { recursive: true });
    const outputPath = this.buildPath(record.userId);
    await writeFile(outputPath, JSON.stringify(record, null, 2), "utf8");
    return outputPath;
  }

  async load(userId) {
    const targetPath = this.buildPath(userId);
    const raw = await readFile(targetPath, "utf8");
    return JSON.parse(raw);
  }

  async loadOrNull(userId) {
    try {
      return await this.load(userId);
    } catch {
      return null;
    }
  }
}

export function buildProfileRecord({
  userId,
  status,
  profile,
  profileSummary,
  resumeSnapshot,
  transcript,
  rawEvents,
  state,
  interviewBoard,
  githubSync,
  airjelly,
  contradictions = [],
  storageDecision = null,
}) {
  const keyEvents = pickKeyEvents([...rawEvents, ...buildSynthesizedKeyEvents(profile)]);
  const storedProfile = buildStoredProfile(profile, keyEvents);
  const conversationHighlights = pickConversationHighlights(transcript, storageDecision);
  return {
    userId,
    updatedAt: new Date().toISOString(),
    status,
    profile: storedProfile,
    profileSummary,
    resumeSnapshot,
    transcript: conversationHighlights,
    conversationHighlights,
    rawEvents: keyEvents,
    keyEvents,
    progressSignals: buildProgressSignals(profile, profileSummary, contradictions),
    storageDecision: storageDecision
      ? {
          storageNotes: storageDecision.storageNotes || [],
          llmModel: storageDecision.llmModel || "",
        }
      : null,
    state: compactState(state),
    interviewBoard: compactInterviewBoard(interviewBoard),
    githubSync: compactGithubSync(githubSync),
    airjelly: compactAirjellyContext(airjelly),
  };
}
