import type {
  ChatMessage,
  ComparisonItem,
  PlanTask,
  ProfileSectionItem,
  SearchMemory,
  UserProfile,
} from "../data/mockData";
import { dashboardData } from "../data/mockData";

export type DashboardData = typeof dashboardData;

export type AgentStatus = {
  phase: "idle" | "analyzing" | "github" | "writing" | "done" | "error";
  label: string;
  detail: string;
};

export type AgentQuestion = {
  id: string;
  prompt: string;
  reason?: string;
  layer?: string;
};

export type AgentTranscriptTurn = {
  questionId: string;
  question: string;
  answer: string;
};

type AgentSignal = {
  field?: string;
  value?: string | number | boolean | Record<string, unknown> | null;
};

type AgentProfileRecord = {
  basicInfo?: {
    name?: string;
    school?: string;
    grade?: string;
    major?: string;
    targetGraduationYear?: number | null;
  };
  careerGoal?: {
    primary?: string;
    secondary?: string[];
    targetDomains?: string[];
    targetRoles?: string[];
  };
  futureVision?: {
    fiveYearGoal?: string;
    idealLifestyle?: string;
  };
  strengths?: Record<string, number>;
  rawEvents?: Array<{
    type?: string;
    name?: string;
    title?: string;
    summary?: string;
    detail?: string;
    content?: string;
    answer?: string;
    source?: string;
  }>;
  evidence?: {
    onlinePresence?: {
      githubFocus?: string[];
    };
  };
};

export type AgentApiResult = {
  status?: string;
  state?: {
    latestSignals?: AgentSignal[];
    profileCompleteness?: number;
  };
  nextQuestion?: AgentQuestion;
  followUpQuestion?: AgentQuestion;
  profile?: AgentProfileRecord;
  profileSummary?: string[];
  resumeSnapshot?: {
    headline?: string;
    education?: string[];
    highlights?: string[];
    projects?: Array<{
      name?: string;
      type?: string;
      techStack?: string[];
      narrative?: string;
      technicalDepth?: string;
      resumeBullets?: string[];
    }>;
    experiences?: Array<{
      type?: string;
      name?: string;
      summary?: string;
    }>;
    constraints?: string[];
  };
  marketLandscape?: {
    hotDomains?: string[];
    weakDomains?: string[];
    notes?: string[];
  };
  marketContext?: {
    searchMemory?: {
      focusAreas?: string[];
      updateRule?: string;
      updates?: Array<{
        source?: string;
        title?: string;
        description?: string;
        memoryTag?: string;
      }>;
    };
  };
  comparison?: {
    developmentDirection?: string;
    conversationalReply?: string;
    rankings?: Array<{
      pathId?: string;
      title?: string;
      totalScore?: number;
      fitLabel?: string;
      reasons?: string[];
      risks?: string[];
    }>;
    topRecommendation?: {
      title?: string;
      pathId?: string;
      reason?: string;
      summary?: string;
    };
    whyNotOthers?: Array<{
      title?: string;
      reason?: string;
    }>;
    nextActions?: {
      next3Months?: string[];
      next12Months?: string[];
    };
    followUpQuestion?: AgentQuestion | null;
    llmReason?: string;
  };
  githubSync?: {
    available?: boolean;
    repos?: Array<{
      repo?: string;
      projectType?: string;
      techStack?: string[];
      activityLevel?: string;
      readmeAvailable?: boolean;
      sourceSampleCount?: number;
      projectAnalysis?: {
        summary?: string;
        roleSignals?: string[];
        technicalDepth?: string;
        productMaturity?: string;
        resumeBullets?: string[];
        risks?: string[];
      };
    }>;
  };
  airjelly?: {
    available?: boolean;
    source?: string;
    error?: string;
    warnings?: string[];
    semanticSearchEnabled?: boolean;
    contextSummary?: {
      dominantMode?: string;
      topTasks?: Array<{ title?: string; name?: string }>;
      focusProjects?: string[];
    };
  };
  storage?: {
    enabled?: boolean;
    path?: string;
  };
};

export function nowLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

export function buildInitialAgentStatus(): AgentStatus {
  return {
    phase: "idle",
    label: "准备首问",
    detail: "系统会先主动生成问题，回答后会筛选重点并写入个人档案。",
  };
}

export function createUserMessage(content: string): ChatMessage {
  return {
    id: `user-${Date.now()}`,
    role: "user",
    title: "你",
    content,
    timestamp: nowLabel(),
  };
}

export function createAssistantMessage(content: string, idPrefix = "assistant"): ChatMessage {
  return {
    id: `${idPrefix}-${Date.now()}`,
    role: "assistant",
    title: "系统",
    content,
    timestamp: nowLabel(),
  };
}

function uniq(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function formatSignalValue(value: AgentSignal["value"]) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function signalLabel(field = "") {
  const labels: Record<string, string> = {
    "basicInfo.name": "姓名",
    "basicInfo.school": "学校",
    "basicInfo.grade": "年级",
    "basicInfo.targetGraduationYear": "毕业时间",
    "careerGoal.primary": "主目标",
    "careerGoal.secondary": "备选方向",
    "careerGoal.targetDomains": "兴趣领域",
    "careerGoal.targetRoles": "目标岗位",
    "futureVision.fiveYearGoal": "五年目标",
    "futureVision.idealLifestyle": "理想生活方式",
    "personalContext.familyBackground": "家庭背景",
    "personalContext.familySupportLevel": "家庭支持",
    "personalContext.relationshipStatus": "感情/陪伴约束",
    "constraints.financialPressure": "经济压力",
    "constraints.cityPreference": "城市偏好",
    "riskPreference.style": "风险偏好",
    "riskPreference.reversibilityNeed": "转向需求",
    hiddenConcerns: "隐性担忧",
    valueRanking: "价值排序",
  };

  if (field.startsWith("strengths.")) return `能力倾向：${field.replace("strengths.", "")}`;
  if (field.startsWith("decisionWeights.")) return `决策权重：${field.replace("decisionWeights.", "")}`;
  if (field.startsWith("evidence.onlinePresence.")) return "线上证据";
  return labels[field] || field || "重点内容";
}

function keyInsightsFromResult(result: AgentApiResult) {
  const fromSignals = (result.state?.latestSignals || [])
    .filter((signal) => signal.field !== "rawEvents")
    .map((signal) => {
      const value = formatSignalValue(signal.value);
      return value ? `${signalLabel(signal.field)}：${value}` : "";
    })
    .filter(Boolean);

  return uniq([...fromSignals, ...(result.profileSummary || [])]).slice(0, 5);
}

function buildReviewInsight(result: AgentApiResult) {
  const insights = keyInsightsFromResult(result);

  if (insights.length) {
    return insights.join("；");
  }

  if (result.state?.latestSignals) {
    return "本轮暂未筛出足够稳定的长期档案字段。";
  }

  return "暂无写入。发送回答后会显示筛选出的重点内容，并更新成长档案。";
}

export function buildEmptyDashboardData(): DashboardData {
  return {
    ...dashboardData,
    user: {
      name: "姓名待补充",
      stage: "阶段待补充",
      role: "职业方向待补充",
      ambition: "系统会通过主动提问逐步建立真实个人档案。",
      summary: "暂无个人档案。回答首个问题后，系统会筛选重点内容并写入这里。",
      stats: [
        { label: "档案完整度", value: "00%" },
        { label: "经历条目", value: "00" },
        { label: "项目沉淀", value: "00" },
        { label: "能力维度", value: "00" },
      ],
      experiences: [],
      projects: [],
      internships: [],
      papers: [],
      competencies: [],
    },
    conversation: {
      firstQuestion: "正在生成第一问...",
      dailyPrompt: "系统会根据你的回答筛选高价值信息，低信息密度内容不会进入长期档案。",
      messages: [],
      placeholder: "回答系统的问题，或补充你的经历、项目、实习、论文、GitHub 与规划困惑。",
      insightNote: "暂无写入。发送回答后会显示筛选出的重点内容，并更新成长档案。",
      comparisons: [],
    },
    search: {
      focusAreas: [],
      updateRule: "暂无搜索主题。等职业目标、兴趣领域或 GitHub 证据出现后再生成搜索更新。",
      updates: [],
    },
    plan: {
      summary: "暂无计划。画像信息足够后，系统会基于目标、约束和权重生成计划。",
      systemRule: "先完成访谈与档案沉淀，再进入路径比较和计划生成。",
      shortTerm: [],
      longTerm: [],
      recentAchievements: [],
      editableNote: "",
    },
  };
}

function toSectionItem(item: {
  title?: string;
  meta?: string;
  detail?: string;
  highlights?: string[];
}): ProfileSectionItem {
  return {
    title: item.title || "待命名条目",
    meta: item.meta || "系统归档",
    detail: item.detail || "等待更多证据补全。",
    highlights: item.highlights?.length ? item.highlights : ["自动归档"],
  };
}

function mapUserProfile(prev: UserProfile, result: AgentApiResult): UserProfile {
  const profile = result.profile || {};
  const basicInfo = profile.basicInfo || {};
  const careerGoal = profile.careerGoal || {};
  const strengths = profile.strengths || {};
  const resume = result.resumeSnapshot || {};
  const githubRepos = result.githubSync?.repos || [];
  const profileSummary = result.profileSummary || [];
  const hasRealProfile = Boolean(result.profile);
  const keyInsights = keyInsightsFromResult(result);
  const rawEvents = profile.rawEvents || [];
  const isType = (event: (typeof rawEvents)[number], types: string[]) =>
    types.some((type) => String(event.type || "").toLowerCase().includes(type));
  const eventToSectionItem = (event: (typeof rawEvents)[number], fallbackMeta: string) =>
    toSectionItem({
      title: event.name || event.title || event.type || "对话归档",
      meta: event.source || event.type || fallbackMeta,
      detail: event.summary || event.detail || event.content || event.answer,
      highlights: ["agent 写入"],
    });

  const projects = [
    ...rawEvents
      .filter((event) => isType(event, ["project", "项目"]))
      .map((event) => eventToSectionItem(event, "项目证据")),
    ...(resume.projects || []).map((project) =>
      toSectionItem({
        title: project.name,
        meta: [project.type, project.technicalDepth ? `技术深度 ${project.technicalDepth}` : ""]
          .filter(Boolean)
          .join(" / "),
        detail: project.narrative,
        highlights: uniq([...(project.techStack || []), ...(project.resumeBullets || [])]).slice(0, 5),
      }),
    ),
    ...githubRepos
      .filter((repo) => repo.projectAnalysis)
      .map((repo) =>
        toSectionItem({
          title: repo.repo,
          meta: [
            repo.projectType,
            repo.projectAnalysis?.technicalDepth
              ? `技术深度 ${repo.projectAnalysis.technicalDepth}`
              : "",
          ]
            .filter(Boolean)
            .join(" / "),
          detail: repo.projectAnalysis?.summary,
          highlights: uniq([
            ...(repo.techStack || []),
            ...(repo.projectAnalysis?.roleSignals || []),
          ]).slice(0, 5),
        }),
      ),
  ];

  const experiences = [
    ...keyInsights.map((insight, index) =>
      toSectionItem({
        title: `筛选重点 ${index + 1}`,
        meta: "重点内容",
        detail: insight,
        highlights: ["重点筛选", "进入档案"],
      }),
    ),
    ...(resume.experiences || [])
      .filter((event) => !isType(event, ["project", "项目", "internship", "实习", "research", "paper", "论文", "研究"]))
      .map((event) =>
        toSectionItem({
          title: event.name,
          meta: event.type,
          detail: event.summary || event.name,
          highlights: ["经历证据"],
        }),
      ),
    ...rawEvents
      .filter((event) => !isType(event, ["project", "项目", "internship", "实习", "research", "paper", "论文", "研究"]))
      .map((event) => eventToSectionItem(event, "真实档案")),
  ];
  const internships = rawEvents
    .filter((event) => isType(event, ["internship", "实习", "practice", "实践"]))
    .map((event) => eventToSectionItem(event, "实习 / 实践"));
  const papers = rawEvents
    .filter((event) => isType(event, ["research", "paper", "论文", "研究"]))
    .map((event) => eventToSectionItem(event, "论文 / 研究"));

  const competencies = uniq([
    ...(hasRealProfile ? [] : prev.competencies),
    ...Object.entries(strengths)
      .filter(([, value]) => Number(value) >= 7)
      .map(([key]) => key),
    ...((profile.evidence?.onlinePresence?.githubFocus || []) as string[]),
  ]).slice(0, 12);

  return {
    ...prev,
    name: basicInfo.name || (hasRealProfile ? "姓名待补充" : prev.name),
    stage:
      [basicInfo.school, basicInfo.grade, basicInfo.targetGraduationYear ? `${basicInfo.targetGraduationYear} 届` : ""]
        .filter(Boolean)
        .join(" / ") ||
      (hasRealProfile ? "阶段待补充" : prev.stage),
    role:
      result.comparison?.developmentDirection ||
      careerGoal.primary ||
      careerGoal.targetRoles?.[0] ||
      resume.headline ||
      (hasRealProfile ? "职业方向待补充" : prev.role),
    ambition:
      resume.highlights?.[0] ||
      profile.futureVision?.fiveYearGoal ||
      profile.futureVision?.idealLifestyle ||
      (hasRealProfile ? "继续通过对话补全长期目标、约束和价值排序。" : prev.ambition),
    summary: profileSummary.length
      ? profileSummary.join("；")
      : hasRealProfile
        ? "这是 agent 根据当前问答生成的真实个人档案；缺失字段会随着后续对话继续补齐。"
        : prev.summary,
    stats: [
      { label: "档案完整度", value: `${Math.round(result.state?.profileCompleteness ?? 0)}%` },
      { label: "经历条目", value: String(experiences.length || (hasRealProfile ? 0 : prev.experiences.length)).padStart(2, "0") },
      { label: "项目沉淀", value: String(projects.length || (hasRealProfile ? 0 : prev.projects.length)).padStart(2, "0") },
      { label: "能力维度", value: String(competencies.length).padStart(2, "0") },
    ],
    experiences: experiences.length
      ? experiences
      : hasRealProfile
        ? []
        : prev.experiences,
    projects: projects.length
      ? projects
      : hasRealProfile
        ? []
        : prev.projects,
    internships: internships.length ? internships : hasRealProfile ? [] : prev.internships,
    papers: papers.length ? papers : hasRealProfile ? [] : prev.papers,
    competencies,
  };
}

function mapComparisons(result: AgentApiResult, fallback: ComparisonItem[]): ComparisonItem[] {
  const rankings = result.comparison?.rankings || [];
  if (!rankings.length) return result.comparison ? [] : fallback;

  return rankings.slice(0, 3).map((item) => ({
    title: item.title || item.pathId || "未命名路径",
    fit: item.fitLabel || "系统判断",
    score: Math.round(Number(item.totalScore || 0)),
    reasons: item.reasons || [],
    risks: item.risks || [],
  }));
}

function mapSearchUpdates(result: AgentApiResult, fallback: SearchMemory[]) {
  const llmUpdates = result.marketContext?.searchMemory?.updates || [];
  if (llmUpdates.length) {
    return llmUpdates.map((update, index) => ({
      source: update.source || "ChatGPT",
      title: update.title || `搜索更新 ${index + 1}`,
      description: update.description || "",
      timestamp: "刚刚",
      memoryTag: update.memoryTag || update.title || "ChatGPT",
    }));
  }

  const landscape = result.marketLandscape;
  const repos = result.githubSync?.repos || [];
  const updates: SearchMemory[] = [];

  for (const domain of landscape?.hotDomains || []) {
    updates.push({
      source: "市场趋势",
      title: `${domain} 方向存在正向信号`,
      description: "由 MarketSearchSkill 根据目标领域和年份生成，用于路径比较。",
      timestamp: "刚刚",
      memoryTag: domain,
    });
  }

  for (const repo of repos.filter((item) => item.projectAnalysis).slice(0, 3)) {
    updates.push({
      source: "GitHub 分析",
      title: repo.repo || "GitHub 项目",
      description:
        repo.projectAnalysis?.summary ||
        `README=${repo.readmeAvailable ? "已读取" : "未读取"}，源码样本 ${repo.sourceSampleCount || 0} 个。`,
      timestamp: "刚刚",
      memoryTag: repo.projectType || "GitHub",
    });
  }

  return updates.length ? updates : fallback;
}

function mapPlanTasks(values: string[] = [], prefix: string): PlanTask[] {
  return values.map((value, index) => ({
    id: `${prefix}-${index}`,
    title: value,
    detail: "由 ChatGPT 根据当前画像、对话和约束生成。",
    done: false,
  }));
}

export function mapAgentResultToDashboard(
  current: DashboardData,
  result: AgentApiResult,
): DashboardData {
  const nextQuestion = result.nextQuestion || result.followUpQuestion;
  const comparisons = mapComparisons(result, current.conversation.comparisons);
  const shortTerm = mapPlanTasks(result.comparison?.nextActions?.next3Months || [], "short");
  const longTerm = mapPlanTasks(result.comparison?.nextActions?.next12Months || [], "long");
  const focusAreas = uniq([
    ...current.search.focusAreas,
    ...(result.marketContext?.searchMemory?.focusAreas || []),
    ...((result.profile?.careerGoal?.targetDomains || []) as string[]),
  ]).slice(0, 8);

  return {
    ...current,
    user: mapUserProfile(current.user, result),
    conversation: {
      ...current.conversation,
      firstQuestion: nextQuestion?.prompt || current.conversation.firstQuestion,
      dailyPrompt: nextQuestion?.reason || current.conversation.dailyPrompt,
      insightNote: buildReviewInsight(result),
      comparisons,
    },
    search: {
      ...current.search,
      focusAreas,
      updateRule:
        result.marketContext?.searchMemory?.updateRule ||
        (result.marketLandscape ? "ChatGPT 已根据当前画像生成新的搜索记忆上下文。" : current.search.updateRule),
      updates: mapSearchUpdates(result, current.search.updates),
    },
    plan: {
      ...current.plan,
      summary:
        result.comparison?.conversationalReply ||
        result.comparison?.developmentDirection ||
        result.comparison?.topRecommendation?.reason ||
        result.comparison?.topRecommendation?.summary ||
        current.plan.summary,
      systemRule: result.comparison?.topRecommendation
        ? result.comparison.topRecommendation.reason ||
          result.comparison.topRecommendation.summary ||
          result.comparison.conversationalReply ||
          current.plan.systemRule
        : current.plan.systemRule,
      shortTerm: shortTerm.length ? shortTerm : current.plan.shortTerm,
      longTerm: longTerm.length ? longTerm : current.plan.longTerm,
      recentAchievements: uniq([
        ...(result.profileSummary || []),
        ...(result.resumeSnapshot?.highlights || []),
        ...(result.githubSync?.repos || []).flatMap((repo) =>
          repo.projectAnalysis?.summary ? [repo.projectAnalysis.summary] : [],
        ),
        ...current.plan.recentAchievements,
      ]).slice(0, 6),
    },
  };
}

export function buildAssistantSummary(result: AgentApiResult) {
  const nextQuestion = result.nextQuestion || result.followUpQuestion;

  if (result.status === "ready" && result.comparison?.conversationalReply) {
    return [result.comparison.conversationalReply, nextQuestion?.prompt ? `我还需要追问一句：${nextQuestion.prompt}` : ""]
      .filter(Boolean)
      .join("\n\n");
  }

  if (result.status === "ready") {
    return result.comparison?.llmReason
      ? `ChatGPT 规划输出暂不可用：${result.comparison.llmReason}`
      : "ChatGPT 暂未返回可展示的规划回复。";
  }

  return nextQuestion?.prompt || "ChatGPT API 暂未返回可展示的下一步回复，请检查 LLM Key 或稍后重试。";
}
