const ENGINEERING_KEYWORDS = [
  "cursor",
  "terminal",
  "vs code",
  "xcode",
  "backend",
  "infra",
  "agent",
  "debug",
  "deploy",
  "refactor",
  "api",
  "docker",
  "typescript",
  "javascript",
  "python",
  "service",
  "build",
  "repo",
  "github",
];

const RESEARCH_KEYWORDS = [
  "research",
  "paper",
  "experiment",
  "benchmark",
  "evaluation",
  "ablation",
  "dataset",
  "train",
  "model",
  "phd",
  "readings",
  "reading",
  "论文",
  "实验",
  "研究",
];

const PRODUCT_KEYWORDS = [
  "product",
  "prd",
  "figma",
  "roadmap",
  "prototype",
  "用户",
  "增长",
  "需求",
  "交互",
  "市场",
];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(parts = []) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function increment(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

function keywordHits(text, keywords) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function classifyText(text) {
  return {
    engineering: keywordHits(text, ENGINEERING_KEYWORDS),
    research: keywordHits(text, RESEARCH_KEYWORDS),
    product: keywordHits(text, PRODUCT_KEYWORDS),
  };
}

function updateModeScores(modeScores, scoreMap, weight = 1) {
  for (const [key, value] of Object.entries(scoreMap)) {
    modeScores[key] = (modeScores[key] || 0) + value * weight;
  }
}

function normalizeTopApps(topApps = []) {
  return toArray(topApps)
    .map((app) => ({
      appName: app.app_name || app.appName || "",
      totalSeconds: app.total_seconds || app.totalSeconds || app.duration_seconds || 0,
      sessionCount: app.session_count || app.sessionCount || 0,
    }))
    .filter((item) => item.appName);
}

function extractRepoLikeNames(text = "") {
  const matches = text.match(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g) || [];
  return matches;
}

function extractProjectTokens(text = "") {
  const repoLike = extractRepoLikeNames(text);
  if (repoLike.length) {
    return repoLike;
  }

  const explicit = text.match(/([A-Za-z0-9_.-]+(?:agent|infra|backend|research|project|demo)[A-Za-z0-9_.-]*)/gi) || [];
  return explicit.slice(0, 3);
}

function buildDominantMode(modeScores) {
  const entries = Object.entries(modeScores).sort((a, b) => b[1] - a[1]);
  const [top] = entries;
  if (!top || top[1] <= 0) {
    return "unknown";
  }

  return top[0];
}

function inferStatedModes({ profile, latestAnswer = "" }) {
  const text = compactText([
    latestAnswer,
    profile.careerGoal.primary,
    ...(profile.careerGoal.targetDomains || []),
    ...(profile.careerGoal.secondary || []),
  ]);

  const modes = new Set();
  if (
    text.includes("phd") ||
    text.includes("research") ||
    text.includes("论文") ||
    text.includes("研究")
  ) {
    modes.add("research");
  }
  if (
    text.includes("product") ||
    text.includes("产品") ||
    text.includes("pm")
  ) {
    modes.add("product");
  }
  if (
    text.includes("engineer") ||
    text.includes("engineering") ||
    text.includes("backend") ||
    text.includes("infra") ||
    text.includes("agent") ||
    text.includes("开发") ||
    text.includes("工程")
  ) {
    modes.add("engineering");
  }

  return [...modes];
}

export function buildSemanticQueries({
  profile,
  latestAnswer = "",
  transcript = [],
  maxQueries = 2,
}) {
  const queries = [];
  const latestTranscriptAnswer = transcript.at(-1)?.answer || "";
  const domainQuery = [...(profile.careerGoal.targetDomains || []), ...(profile.careerGoal.secondary || [])]
    .filter(Boolean)
    .join(" ");

  if (latestAnswer.trim()) {
    queries.push(latestAnswer.trim());
  }

  if (latestTranscriptAnswer.trim() && latestTranscriptAnswer.trim() !== latestAnswer.trim()) {
    queries.push(latestTranscriptAnswer.trim());
  }

  if (domainQuery) {
    queries.push(`${profile.careerGoal.primary || "career choice"} ${domainQuery}`.trim());
  }

  if (profile.futureVision.fiveYearGoal) {
    queries.push(profile.futureVision.fiveYearGoal);
  }

  return [...new Set(queries.map((item) => item.trim()).filter(Boolean))].slice(0, maxQueries);
}

export function analyzeAirJellyData({
  profile,
  latestAnswer = "",
  openTasks = [],
  taskMemoriesByTask = [],
  listMemories = [],
  events = [],
  topApps = [],
  semanticMatches = [],
  queryHistory = [],
  source = "sdk",
  semanticSearchEnabled = false,
}) {
  const modeScores = {
    engineering: 0,
    research: 0,
    product: 0,
  };
  const taskTitles = [];
  const projectCounter = {};

  for (const app of normalizeTopApps(topApps)) {
    const text = compactText([app.appName]);
    updateModeScores(modeScores, classifyText(text), Math.max(1, app.totalSeconds / 1800));
  }

  for (const item of [...toArray(listMemories), ...toArray(events), ...toArray(semanticMatches)]) {
    const text = compactText([
      item.title,
      item.content,
      item.app_name,
      item.window_name,
      ...(item.keywords || []),
      ...(item.entities || []),
    ]);
    updateModeScores(modeScores, classifyText(text), 1);
    for (const project of extractProjectTokens(text)) {
      increment(projectCounter, project);
    }
  }

  for (const taskBundle of toArray(taskMemoriesByTask)) {
    if (taskBundle.title) {
      taskTitles.push(taskBundle.title);
    }

    const taskText = compactText([
      taskBundle.title,
      taskBundle.description,
      taskBundle.progressSummary,
      ...(taskBundle.memories || []).flatMap((memory) => [
        memory.title,
        memory.content,
        memory.app_name,
        memory.window_name,
        ...(memory.keywords || []),
      ]),
    ]);
    updateModeScores(modeScores, classifyText(taskText), 2);

    for (const project of extractProjectTokens(taskText)) {
      increment(projectCounter, project, 2);
    }
  }

  const topProjectNames = Object.entries(projectCounter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
  const dominantMode = buildDominantMode(modeScores);
  const normalizedTopApps = normalizeTopApps(topApps).slice(0, 5);
  const normalizedOpenTasks = toArray(openTasks);
  const normalizedTaskBundles = toArray(taskMemoriesByTask);
  const byScene = normalizedTaskBundles.reduce((acc, taskBundle) => {
    const scene = taskBundle.scene || taskBundle.taskDetail?.l1_scene || taskBundle.taskDetail?.scene || "unassigned";
    if (!acc[scene]) acc[scene] = [];
    acc[scene].push({
      taskId: taskBundle.taskId,
      title: taskBundle.title,
      description: taskBundle.description,
      progressSummary: taskBundle.progressSummary,
      nextPlan: taskBundle.nextPlan,
      scene,
      memoryCount: (taskBundle.memories || []).length,
      memories: taskBundle.memories || [],
    });
    return acc;
  }, {});
  const taskQueue = {
    totalOpenTasks: normalizedOpenTasks.length,
    scenes: Object.keys(byScene),
    byScene,
    dispatchPlan: Object.fromEntries(
      Object.entries(byScene).map(([scene, tasks]) => [
        scene,
        {
          agent: `${scene}-agent`,
          tasks: tasks.map((task) => ({
            taskId: task.taskId,
            title: task.title,
            progressSummary: task.progressSummary,
            nextPlan: task.nextPlan,
            memoryCount: task.memoryCount,
          })),
        },
      ]),
    ),
  };

  const rawEvents = [];
  if (dominantMode !== "unknown") {
    rawEvents.push({
      type: "airjelly_behavior_pattern",
      name: `Recent ${dominantMode} behavior pattern`,
      source: source,
      summary: `In the recent AirJelly record, the dominant observed mode is ${dominantMode}.`,
      evidence: {
        topApps: normalizedTopApps.map((item) => item.appName),
        topTasks: taskTitles.slice(0, 3),
      },
    });
  }

  for (const taskBundle of toArray(taskMemoriesByTask).slice(0, 3)) {
    rawEvents.push({
      type: "airjelly_task_focus",
      name: taskBundle.title || "Observed active task",
      source: source,
      summary: taskBundle.progressSummary || taskBundle.description || "AirJelly observed sustained task activity.",
      taskId: taskBundle.taskId,
      evidenceCount: (taskBundle.memories || []).length,
    });
  }

  for (const projectName of topProjectNames) {
    rawEvents.push({
      type: "airjelly_project_focus",
      name: projectName,
      source: source,
      summary: `AirJelly repeatedly observed work around ${projectName}.`,
    });
  }

  for (const match of toArray(semanticMatches).slice(0, 2)) {
    rawEvents.push({
      type: "airjelly_semantic_match",
      name: match.title || "Semantic memory match",
      source: source,
      summary: match.content || "AirJelly semantic search returned a related memory.",
      memoryId: match.id,
    });
  }

  const signals = [];
  if (toArray(openTasks).length >= 3) {
    signals.push({
      field: "hiddenConcerns",
      value: "actively juggling multiple goals",
    });
  }

  if (dominantMode === "engineering") {
    signals.push({
      field: "strengths.engineering",
      value: 7,
    });
    signals.push({
      field: "careerGoal.targetDomains",
      value: "engineering",
    });
  }

  if (dominantMode === "research") {
    signals.push({
      field: "strengths.research",
      value: 7,
    });
  }

  const statedModes = inferStatedModes({ profile, latestAnswer });
  const counterEvidence = [];
  if (statedModes.includes("research") && dominantMode === "engineering") {
    counterEvidence.push({
      id: "airjelly-research-vs-engineering",
      summary: "User says they want research or PhD, but recent AirJelly evidence is dominated by engineering delivery.",
      prompt: `我看到你最近 30 天的大部分行为都更像工程交付：常见工具是 ${normalizedTopApps
        .map((item) => item.appName)
        .slice(0, 3)
        .join(" / ") || "工程工具"}，高频任务包括 ${taskTitles.slice(0, 2).join(" / ") || "持续推进的构建任务"}。你现在说想走研究/PhD，这更像长期理想，还是你真实偏好其实已经在往工程侧变化？`,
      severity: "medium",
    });
  }

  if (statedModes.includes("product") && dominantMode === "engineering") {
    counterEvidence.push({
      id: "airjelly-product-vs-engineering",
      summary: "User says they may want product, but recent AirJelly evidence is still deeply engineering-heavy.",
      prompt: `你刚提到想往产品走，但 AirJelly 里最近持续出现的是工程型工作轨迹，比如 ${taskTitles
        .slice(0, 2)
        .join(" / ") || "长期工程任务"}。你是真的想切产品，还是目前只是对产品更感兴趣，但主能力仍在工程？`,
      severity: "medium",
    });
  }

  if (
    (profile.hiddenConcerns || []).includes("wants_fast_income") &&
    dominantMode === "research"
  ) {
    counterEvidence.push({
      id: "airjelly-income-vs-research",
      summary: "User says they want faster monetization, but recent AirJelly work is closer to long-cycle research behavior.",
      prompt: `你强调过想更快变现，但最近 AirJelly 记录更像长期研究投入。这个阶段你是愿意为长期上限忍受更慢回报，还是你其实需要更快看到收入结果？`,
      severity: "medium",
    });
  }

  const interviewHints = [];
  if (topProjectNames.length && !(profile.careerGoal.targetDomains || []).length) {
    interviewHints.push({
      id: "airjelly-domain-from-projects",
      prompt: `我看到你最近持续围绕 ${topProjectNames.join(" / ")} 在投入，你更想把自己定义成工程型、研究型，还是产品型选手？`,
      reason: "AirJelly 最近的项目重心能帮助系统更快锁定用户真实方向。",
    });
  }

  if (taskTitles.length && !profile.futureVision.fiveYearGoal) {
    interviewHints.push({
      id: "airjelly-future-vs-current-work",
      prompt: `你最近明显在做 ${taskTitles[0]} 这类事情。它更像你未来 5 年想持续深挖的方向，还是只是当前阶段的临时选择？`,
      reason: "需要判断最近行为和长期目标是否一致。",
    });
  }

  return {
    available: true,
    source,
    signals,
    rawEvents,
    semanticQueries: queryHistory,
    semanticSearchEnabled,
    contextSummary: {
      dominantMode,
      modeScores,
      topApps: normalizedTopApps,
      topTasks: taskTitles.slice(0, 5),
      focusProjects: topProjectNames,
      semanticMatches: toArray(semanticMatches)
        .slice(0, 5)
        .map((item) => ({ id: item.id, title: item.title })),
    },
    taskQueue,
    counterEvidence,
    interviewHints,
  };
}
