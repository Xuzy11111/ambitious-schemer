export type SidebarSection = {
  key: "chat" | "profile" | "search" | "plan";
  label: string;
  hint: string;
};

export type ComparisonItem = {
  title: string;
  fit: string;
  score: number;
  reasons: string[];
  risks: string[];
};

export type ProfileSectionItem = {
  title: string;
  meta: string;
  detail: string;
  highlights: string[];
};

export type ChatMessage = {
  id: string;
  role: "system" | "user" | "assistant";
  title: string;
  content: string;
  timestamp: string;
};

export type SearchMemory = {
  source: string;
  title: string;
  description: string;
  timestamp: string;
  memoryTag: string;
};

export type PlanTask = {
  id: string;
  title: string;
  detail: string;
  done: boolean;
};

export type RoadmapStep = {
  step: string;
  title: string;
  detail: string;
  status: "done" | "current" | "pending";
};

export type TrendItem = {
  name: string;
  change: string;
  description: string;
};

export type InterviewItem = {
  title: string;
  time: string;
  note: string;
  status: string;
};

export type UserProfile = {
  name: string;
  stage: string;
  role: string;
  ambition: string;
  summary: string;
  stats: { label: string; value: string }[];
  experiences: ProfileSectionItem[];
  projects: ProfileSectionItem[];
  internships: ProfileSectionItem[];
  papers: ProfileSectionItem[];
  competencies: string[];
};

export const dashboardData: {
  user: UserProfile;
  sidebarSections: SidebarSection[];
  conversation: {
    firstQuestion: string;
    dailyPrompt: string;
    messages: ChatMessage[];
    placeholder: string;
    insightNote: string;
    comparisons: ComparisonItem[];
  };
  search: {
    focusAreas: string[];
    updateRule: string;
    updates: SearchMemory[];
  };
  plan: {
    summary: string;
    systemRule: string;
    shortTerm: PlanTask[];
    longTerm: PlanTask[];
    recentAchievements: string[];
    editableNote: string;
  };
} = {
  user: {
    name: "姓名待补充",
    stage: "阶段待补充",
    role: "职业方向待补充",
    ambition: "等待 ChatGPT 根据真实对话整理长期目标。",
    summary: "暂无个人档案。请先完成对话，系统会用 ChatGPT 整理可展示内容。",
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
  sidebarSections: [
    { key: "chat", label: "对话模块", hint: "主动提问与日常补充" },
    { key: "profile", label: "成长档案", hint: "沉淀长期画像" },
    { key: "search", label: "资料搜索更新", hint: "围绕兴趣领域增量记忆" },
    { key: "plan", label: "计划模块", hint: "短期与长期行动规划" },
  ],
  conversation: {
    firstQuestion: "正在请求 ChatGPT 生成第一问...",
    dailyPrompt: "ChatGPT 会根据你的真实回答继续追问和整理档案。",
    messages: [],
    placeholder: "回答系统的问题，或补充你的经历、项目、实习、论文、GitHub 与规划困惑。",
    insightNote: "暂无写入。发送回答后会显示 ChatGPT 整理出的重点内容。",
    comparisons: [],
  },
  search: {
    focusAreas: [],
    updateRule: "暂无搜索主题。等 ChatGPT 从对话中整理出目标领域后再更新。",
    updates: [],
  },
  plan: {
    summary: "暂无计划。提出规划问题后，ChatGPT 会基于当前档案生成。",
    systemRule: "计划内容以 ChatGPT 返回为准，不再展示演示预设。",
    shortTerm: [],
    longTerm: [],
    recentAchievements: [],
    editableNote: "",
  },
};

