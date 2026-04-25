"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ConversationPanel } from "./components/ConversationPanel";
import { type CubeFace, CubeViewSwitcher } from "./components/CubeContainer";
import { PlanBoard } from "./components/PlanBoard";
import { ProfileCard } from "./components/ProfileCard";
import { SearchUpdatePanel } from "./components/SearchUpdatePanel";
import {
  buildAssistantSummary,
  buildEmptyDashboardData,
  buildInitialAgentStatus,
  createAssistantMessage,
  createUserMessage,
  mapAgentResultToDashboard,
  type AgentApiResult,
  type AgentQuestion,
  type AgentTranscriptTurn,
} from "./lib/agentDashboard";

const faceTitles: Record<
  CubeFace,
  { eyebrow: string; title: string; subtitle: string }
> = {
  front: {
    eyebrow: "Conversation",
    title: "对话模块",
    subtitle: "系统先主动提问，再根据你后续补充的信息不断更新成长记忆。",
  },
  right: {
    eyebrow: "Archive",
    title: "成长档案",
    subtitle: "把对话里的高价值回答沉淀成长期画像，给后续判断方向和生成计划提供依据。",
  },
  back: {
    eyebrow: "Memory Update",
    title: "资料搜索更新",
    subtitle: "围绕你持续感兴趣的领域，周期性加入新的外部信息和 memory。",
  },
  left: {
    eyebrow: "Plan System",
    title: "计划模块",
    subtitle: "当你问到规划问题时生成短期和长期计划，并允许系统同步进度、用户手动调整。",
  },
};

const faceOrder: CubeFace[] = ["front", "right", "back", "left"];

function parseFace(value: string | null): CubeFace | null {
  if (value === "front" || value === "right" || value === "back" || value === "left") {
    return value;
  }

  return null;
}

function getDirection(from: CubeFace, to: CubeFace) {
  const fromIndex = faceOrder.indexOf(from);
  const toIndex = faceOrder.indexOf(to);
  const diff = (toIndex - fromIndex + faceOrder.length) % faceOrder.length;

  return diff === 1 || diff === 2 ? "right" : "left";
}

export default function DashboardCubeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDashboard = useMemo(() => buildEmptyDashboardData(), []);
  const hasLoadedInitialQuestion = useRef(false);
  const isAgentRequestInFlight = useRef(false);
  const [activeFace, setActiveFace] = useState<CubeFace>(
    () => parseFace(searchParams.get("face")) || "front",
  );
  const [transitionKey, setTransitionKey] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<"left" | "right">("right");
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [messages, setMessages] = useState(initialDashboard.conversation.messages);
  const [transcript, setTranscript] = useState<AgentTranscriptTurn[]>([]);
  const knownProfileRef = useRef<Record<string, unknown>>({});
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("https://api.openai.com/v1");
  const [llmModel, setLlmModel] = useState("gpt-4o-mini");
  const [llmWireApi, setLlmWireApi] = useState<"chat_completions" | "responses">("chat_completions");
  const [airjellyEnabled, setAirjellyEnabled] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<AgentQuestion>({
    id: "frontend-initial",
    prompt: initialDashboard.conversation.firstQuestion,
    reason: initialDashboard.conversation.dailyPrompt,
    layer: "background",
  });
  const [agentStatus, setAgentStatus] = useState(buildInitialAgentStatus);

  function handleFaceChange(face: CubeFace) {
    if (face === activeFace) {
      return;
    }

    setTransitionDirection(getDirection(activeFace, face));
    setActiveFace(face);
    setTransitionKey((value) => value + 1);
    router.replace(`/dashboard?face=${face}`, { scroll: false });
  }

  const requestAgent = useCallback(async ({
    content,
    nextTranscript,
    nextKnownProfile = knownProfileRef.current,
  }: {
    content: string;
    nextTranscript: AgentTranscriptTurn[];
    nextKnownProfile?: Record<string, unknown>;
  }) => {
    const response = await fetch("/api/agent/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: "frontend-demo-user",
        userMessage: content,
        knownProfile: nextKnownProfile,
        transcript: nextTranscript,
        storage: {
          enabled: true,
          llmDecisionEnabled: true,
        },
        githubAnalysis: {
          enabled: true,
          analysisRepoLimit: 3,
        },
        llm: {
          enabled: Boolean(llmApiKey.trim()),
          apiKey: llmApiKey.trim(),
          baseUrl: llmBaseUrl.trim(),
          model: llmModel.trim(),
          wireApi: llmWireApi,
        },
        airjelly: {
          enabled: airjellyEnabled,
          enableSemanticSearch: airjellyEnabled,
          memoryWindowDays: 30,
          eventWindowDays: 14,
          semanticQueryLimit: 2,
        },
      }),
    });
    const payload = (await response.json()) as {
      ok: boolean;
      result?: AgentApiResult;
      error?: string;
    };

    if (!response.ok || !payload.ok || !payload.result) {
      throw new Error(payload.error || "Agent API request failed");
    }

    return payload.result;
  }, [airjellyEnabled, llmApiKey, llmBaseUrl, llmModel, llmWireApi]);

  const applyAgentResult = useCallback((result: AgentApiResult) => {
    const nextQuestion = result.nextQuestion || result.followUpQuestion;

    setDashboard((current) => mapAgentResultToDashboard(current, result));
    knownProfileRef.current = (result.profile || {}) as Record<string, unknown>;
    if (nextQuestion?.prompt) {
      setCurrentQuestion(nextQuestion);
    }

    return nextQuestion;
  }, []);

  useEffect(() => {
    if (hasLoadedInitialQuestion.current) {
      return;
    }
    hasLoadedInitialQuestion.current = true;

    async function loadInitialQuestion() {
      setAgentStatus({
        phase: "analyzing",
        label: "生成首问",
        detail: "正在让 agent 根据空白档案生成第一条高信息量问题。",
      });

      try {
        const result = await requestAgent({
          content: "",
          nextTranscript: [],
          nextKnownProfile: {},
        });
        const nextQuestion = applyAgentResult(result);
        const prompt =
          nextQuestion?.prompt ||
          result.nextQuestion?.prompt ||
          "ChatGPT API 暂时没有返回首问。请检查 LLM Key 或稍后重试。";

        setMessages([
          createAssistantMessage(prompt, "initial-question"),
        ]);
        setAgentStatus({
          phase: "idle",
          label: "等待回答",
          detail: "系统已主动发问。你的回答会被筛选重点，并写入个人档案。",
        });
      } catch (error) {
        setAgentStatus({
          phase: "error",
          label: "首问生成失败",
          detail: error instanceof Error ? error.message : "Agent API 调用失败。",
        });
        setMessages([
          createAssistantMessage(
            `ChatGPT API 暂时没有返回首问：${error instanceof Error ? error.message : "Agent API 调用失败。"}`,
            "initial-question-fallback",
          ),
        ]);
      }
    }

    void loadInitialQuestion();
  }, [applyAgentResult, requestAgent]);

  const handleSend = useCallback(async (content: string) => {
    if (isAgentRequestInFlight.current) {
      return;
    }
    isAgentRequestInFlight.current = true;
    const userMessage = createUserMessage(content);
    const nextTranscript = [
      ...transcript,
      {
        questionId: currentQuestion.id,
        question: currentQuestion.prompt,
        answer: content,
      },
    ];
    const timers = [
      window.setTimeout(
        () =>
          setAgentStatus({
            phase: "github",
            label: "GitHub 分析中",
            detail: "正在同步公开项目、README 和源码样本。",
          }),
        350,
      ),
      window.setTimeout(
        () =>
          setAgentStatus({
            phase: "writing",
            label: "写入中",
            detail: "正在判断哪些对话内容值得进入长期个人资料库。",
          }),
        1200,
      ),
    ];

    setMessages((prev) => [...prev, userMessage]);
    setTranscript(nextTranscript);
    setAgentStatus({
      phase: "analyzing",
      label: "分析中",
      detail: "正在分析回答并更新个人档案。",
    });

    try {
      const result = await requestAgent({
        content,
        nextTranscript,
        nextKnownProfile: knownProfileRef.current,
      });
      applyAgentResult(result);
      setMessages((prev) => [...prev, createAssistantMessage(buildAssistantSummary(result))]);
      setAgentStatus({
        phase: "done",
        label: "已完成",
        detail: result.storage?.enabled
          ? "个人档案已根据本轮回答更新。"
          : "分析完成，等待下一轮补充。",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Agent API 调用失败。";
      setAgentStatus({
        phase: "error",
        label: "接入异常",
        detail: errorMessage,
      });
      setMessages((prev) => [
        ...prev,
        createAssistantMessage(
          `这次没有成功连上 agent 后端：${errorMessage}`,
          "agent-error",
        ),
      ]);
    } finally {
      isAgentRequestInFlight.current = false;
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    }
  }, [applyAgentResult, currentQuestion.id, currentQuestion.prompt, requestAgent, transcript]);

  const handleRegenerateAdvice = useCallback(() => {
    void handleSend("请基于当前档案、对话记录和约束，重新生成建议、档案整理和短长期计划。");
    setActiveFace("front");
    router.replace("/dashboard?face=front", { scroll: false });
  }, [handleSend, router]);

  const summaryLabel =
    dashboard.user.role && dashboard.user.role !== "职业方向待补充"
      ? dashboard.user.role
      : agentStatus.label;

  const currentTitle = faceTitles[activeFace];

  const activeContent = useMemo<Record<CubeFace, ReactNode>>(
    () => ({
      front: (
        <ConversationPanel
          firstQuestion={dashboard.conversation.firstQuestion}
          dailyPrompt={dashboard.conversation.dailyPrompt}
          messages={messages}
          placeholder={dashboard.conversation.placeholder}
          insightNote={dashboard.conversation.insightNote}
          comparisons={dashboard.conversation.comparisons}
          status={agentStatus}
          llmApiKey={llmApiKey}
          onLlmApiKeyChange={setLlmApiKey}
          llmBaseUrl={llmBaseUrl}
          onLlmBaseUrlChange={setLlmBaseUrl}
          llmModel={llmModel}
          onLlmModelChange={setLlmModel}
          llmWireApi={llmWireApi}
          onLlmWireApiChange={(value) => setLlmWireApi(value as "chat_completions" | "responses")}
          airjellyEnabled={airjellyEnabled}
          onAirjellyEnabledChange={setAirjellyEnabled}
          onSend={handleSend}
        />
      ),
      right: <ProfileCard profile={dashboard.user} />,
      back: (
        <SearchUpdatePanel
          focusAreas={dashboard.search.focusAreas}
          updateRule={dashboard.search.updateRule}
          updates={dashboard.search.updates}
        />
      ),
      left: (
        <PlanBoard
          summary={dashboard.plan.summary}
          systemRule={dashboard.plan.systemRule}
          shortTerm={dashboard.plan.shortTerm}
          longTerm={dashboard.plan.longTerm}
          recentAchievements={dashboard.plan.recentAchievements}
          editableNote={dashboard.plan.editableNote}
        />
      ),
    }),
    [agentStatus, airjellyEnabled, dashboard, handleSend, llmApiKey, llmBaseUrl, llmModel, llmWireApi, messages]
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[#020202]">
      <header className="sticky top-0 z-50 border-b border-red-950/30 bg-[#020202]/90 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-full border border-red-950/70 bg-[linear-gradient(135deg,rgba(7,7,7,0.95),rgba(24,4,4,0.85))] px-4 py-2 transition hover:border-red-800"
            >
              <span className="text-sm text-zinc-400">返回</span>
              <span className="text-xl font-semibold tracking-tight text-white">
                Ambitious
              </span>
            </Link>
          </div>

          <CubeViewSwitcher
            activeFace={activeFace}
            onFaceChange={handleFaceChange}
          />

          <button
            type="button"
            onClick={handleRegenerateAdvice}
            disabled={agentStatus.phase === "analyzing" || agentStatus.phase === "github" || agentStatus.phase === "writing"}
            className="rounded-[16px] border border-red-900/60 bg-[linear-gradient(135deg,rgba(10,10,10,0.98),rgba(28,6,6,0.88))] px-4 py-2 text-sm text-zinc-400 transition-all duration-300 hover:border-red-800 hover:text-white hover:shadow-[0_0_18px_rgba(220,38,38,0.12)]"
          >
            重新生成建议
          </button>
        </div>
      </header>

      <section className="px-6 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[32px] border border-red-950 bg-[linear-gradient(135deg,#120303_0%,#050505_48%,#080202_100%)] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:56px_56px]" />
              <div className="absolute -top-8 right-12 h-28 w-28 rounded-full bg-red-900/12 blur-2xl" />
              <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-red-700/40 to-transparent" />
              <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-red-950/50 to-transparent" />
            </div>

            <div className="relative flex items-start justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-3 rounded-full border border-red-950/80 bg-black/35 px-4 py-2 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                  <p className="text-[11px] uppercase tracking-[0.3em] text-red-300/70">
                    {currentTitle.eyebrow}
                  </p>
                </div>
                <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white">
                  {currentTitle.title}
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-400">
                  {currentTitle.subtitle}
                </p>
              </div>
              <div className="whitespace-nowrap rounded-full border border-red-900/70 bg-[linear-gradient(135deg,rgba(19,6,6,0.95),rgba(10,10,10,0.86))] px-4 py-2 text-sm text-red-100 shadow-[inset_0_0_20px_rgba(220,38,38,0.08)]">
                {summaryLabel}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 px-6 pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="page-cube-stage">
            <section
              key={`${activeFace}-${transitionKey}`}
              className={`page-cube-panel relative overflow-hidden rounded-[36px] border border-red-950/60 bg-[linear-gradient(180deg,#050505_0%,#030303_100%)] p-1 shadow-[0_40px_100px_rgba(0,0,0,0.55)] ${
                transitionDirection === "right"
                  ? "page-cube-in-right"
                  : "page-cube-in-left"
              }`}
            >
              <div
                aria-hidden="true"
                className={`page-cube-depth ${
                  transitionDirection === "right"
                    ? "page-cube-depth-left"
                    : "page-cube-depth-right"
                }`}
              />

              <div className="pointer-events-none absolute inset-0 page-cube-face">
                <div className="absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
                <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-red-950/50 to-transparent" />
                <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-red-950/35 to-transparent" />
                <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-red-950/35 to-transparent" />
              </div>

              <div className="page-cube-face relative max-h-[calc(100vh-250px)] overflow-y-auto overscroll-contain rounded-[32px] bg-[#020202] p-6">
                {activeContent[activeFace]}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
