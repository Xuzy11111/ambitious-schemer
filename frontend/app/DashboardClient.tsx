"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ConversationPanel } from "./components/ConversationPanel";
import { PlanBoard } from "./components/PlanBoard";
import { ProfileCard } from "./components/ProfileCard";
import { SearchUpdatePanel } from "./components/SearchUpdatePanel";
import { Sidebar } from "./components/Sidebar";
import type { SidebarSection } from "./data/mockData";
import { buildEmptyDashboardData, buildInitialAgentStatus } from "./lib/agentDashboard";

export default function DashboardClient() {
  const dashboardData = useMemo(() => buildEmptyDashboardData(), []);
  const [activeKey, setActiveKey] = useState<SidebarSection["key"]>("chat");
  const agentStatus = useMemo(() => buildInitialAgentStatus(), []);

  const activeSection = useMemo(() => {
    const sectionMap: Record<
      SidebarSection["key"],
      { eyebrow: string; title: string; subtitle: string; content: ReactNode }
    > = {
      chat: {
        eyebrow: "Conversation",
        title: "对话模块",
        subtitle: "系统先主动提问，再根据你后续补充的信息不断更新成长记忆。",
        content: (
          <ConversationPanel
            firstQuestion={dashboardData.conversation.firstQuestion}
            dailyPrompt={dashboardData.conversation.dailyPrompt}
            messages={dashboardData.conversation.messages}
            placeholder={dashboardData.conversation.placeholder}
            insightNote={dashboardData.conversation.insightNote}
            comparisons={dashboardData.conversation.comparisons}
            status={agentStatus}
            llmApiKey=""
            onLlmApiKeyChange={() => undefined}
            llmBaseUrl="https://api.openai.com/v1"
            onLlmBaseUrlChange={() => undefined}
            llmModel="gpt-4o-mini"
            onLlmModelChange={() => undefined}
            llmWireApi="chat_completions"
            onLlmWireApiChange={() => undefined}
            airjellyEnabled={true}
            onAirjellyEnabledChange={() => undefined}
            onSend={async () => undefined}
          />
        ),
      },
      profile: {
        eyebrow: "Archive",
        title: "成长档案",
        subtitle: "把对话里的高价值回答沉淀成长期画像，给后续判断方向和生成计划提供依据。",
        content: <ProfileCard profile={dashboardData.user} />,
      },
      search: {
        eyebrow: "Memory Update",
        title: "资料搜索更新",
        subtitle: "围绕你持续感兴趣的领域，周期性加入新的外部信息和 memory。",
        content: (
          <SearchUpdatePanel
            focusAreas={dashboardData.search.focusAreas}
            updateRule={dashboardData.search.updateRule}
            updates={dashboardData.search.updates}
          />
        ),
      },
      plan: {
        eyebrow: "Plan System",
        title: "计划模块",
        subtitle: "当你问到规划问题时生成短期和长期计划，并允许系统同步进度、用户手动调整。",
        content: (
          <PlanBoard
            summary={dashboardData.plan.summary}
            systemRule={dashboardData.plan.systemRule}
            shortTerm={dashboardData.plan.shortTerm}
            longTerm={dashboardData.plan.longTerm}
            recentAchievements={dashboardData.plan.recentAchievements}
            editableNote={dashboardData.plan.editableNote}
          />
        ),
      },
    };

    return sectionMap[activeKey];
  }, [activeKey, agentStatus, dashboardData]);

  return (
    <div className="grid min-h-dvh grid-cols-[280px_1fr] bg-[#020202] max-[920px]:grid-cols-1">
      <Sidebar
        sections={dashboardData.sidebarSections}
        activeKey={activeKey}
        user={dashboardData.user}
        onRegenerate={() => setActiveKey("chat")}
        onSelect={setActiveKey}
      />

      <main className="bg-[#020202] p-7 max-[920px]:p-4">
        <section className="mb-6 flex items-start justify-between gap-6 rounded-[32px] border border-red-950 bg-gradient-to-br from-[#140404] via-[#050505] to-[#0b0202] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)] max-[920px]:flex-col">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-red-300/70">
              {activeSection.eyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white">
              {activeSection.title}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
              {activeSection.subtitle}
            </p>
          </div>
          <div className="whitespace-nowrap rounded-full border border-red-900 bg-[#130606] px-4 py-2 text-sm text-red-100">
            {agentStatus.label}
          </div>
        </section>

        {activeSection.content}
      </main>
    </div>
  );
}

