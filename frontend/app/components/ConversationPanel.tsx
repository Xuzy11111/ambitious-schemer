"use client";

import { useMemo, useState } from "react";
import type { ChatMessage, ComparisonItem } from "../data/mockData";
import type { AgentStatus } from "../lib/agentDashboard";
import { ComparisonCard } from "./ComparisonCard";

function roleClass(role: ChatMessage["role"]) {
  if (role === "system") {
    return "mr-auto border-red-950 bg-[#0f0505]";
  }

  if (role === "assistant") {
    return "mr-auto border-zinc-900 bg-[#090909]";
  }

  return "ml-auto border-red-900 bg-[#160707]";
}

export function ConversationPanel({
  firstQuestion,
  dailyPrompt,
  messages,
  placeholder,
  insightNote,
  comparisons,
  status,
  llmApiKey,
  onLlmApiKeyChange,
  llmBaseUrl,
  onLlmBaseUrlChange,
  llmModel,
  onLlmModelChange,
  llmWireApi,
  onLlmWireApiChange,
  airjellyEnabled,
  onAirjellyEnabledChange,
  onSend,
}: {
  firstQuestion: string;
  dailyPrompt: string;
  messages: ChatMessage[];
  placeholder: string;
  insightNote: string;
  comparisons: ComparisonItem[];
  status: AgentStatus;
  llmApiKey: string;
  onLlmApiKeyChange: (value: string) => void;
  llmBaseUrl: string;
  onLlmBaseUrlChange: (value: string) => void;
  llmModel: string;
  onLlmModelChange: (value: string) => void;
  llmWireApi: string;
  onLlmWireApiChange: (value: string) => void;
  airjellyEnabled: boolean;
  onAirjellyEnabledChange: (value: boolean) => void;
  onSend: (content: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");

  const isBusy = status.phase === "analyzing" || status.phase === "github" || status.phase === "writing";
  const canSend = draft.trim().length > 0 && !isBusy;

  const composerHint = useMemo(() => {
    if (!draft.trim()) {
      return "未输入内容";
    }

    if (draft.includes("规划") || draft.includes("方向") || draft.includes("适合")) {
      return "这条消息可能触发路径分析";
    }

    return "这条消息会写入成长档案";
  }, [draft]);

  async function handleSend() {
    if (!canSend) {
      return;
    }

    const content = draft.trim();

    if (!content) {
      return;
    }

    setDraft("");
    await onSend(content);
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void handleSend();
  }

  return (
    <section className="grid gap-6">
      <section className="rounded-[32px] border border-red-950 bg-[#050505] shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
        <header className="border-b border-zinc-900 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.24em] text-red-300/70">
            对话模块
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            系统主动发问
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
            第一次登录先由系统发起问题，后续可以持续补充经历、项目、实习、论文和规划信息。
          </p>
        </header>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.55fr)_320px]">
          <div className="border-r border-zinc-900">
            <div className="border-b border-zinc-900 px-6 py-4">
              <div className="rounded-2xl border border-red-950 bg-[#0a0a0a] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-red-300/70">
                    当前系统问题
                  </p>
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-100">
                    {status.label}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-red-50/90">
                  {firstQuestion}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                  {status.detail}
                </p>
              </div>
            </div>

            <div className="flex max-h-[560px] flex-col gap-4 overflow-y-auto px-6 py-5">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`w-full max-w-[78%] rounded-[24px] border px-4 py-4 ${roleClass(message.role)}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <strong className="text-sm text-white">{message.title}</strong>
                    <span className="text-xs text-zinc-500">
                      {message.timestamp}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {message.content}
                  </p>
                </article>
              ))}
            </div>

            <div className="border-t border-zinc-900 px-6 py-5">
              <div className="rounded-[28px] border border-red-950 bg-[#070707] p-4">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={placeholder}
                  className="min-h-28 w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
                />
                <div className="mt-4 flex items-center justify-between gap-4">
                  <span className="text-xs text-zinc-500">{composerHint}</span>
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!canSend}
                    className="rounded-full bg-gradient-to-r from-red-700 via-red-500 to-orange-300 px-5 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isBusy ? "处理中" : "发送"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="grid content-start gap-4 px-5 py-5">
            <article className="rounded-3xl border border-red-950 bg-[#080808] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-red-300/70">
                日常补充提示
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {dailyPrompt}
              </p>
            </article>

            <article className="rounded-3xl border border-red-950 bg-[#080808] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-red-300/70">
                写入成长档案
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                {insightNote}
              </p>
            </article>

            <article className="rounded-3xl border border-red-950 bg-[#080808] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-red-300/70">
                实时流程
              </p>
              <div className="mt-3 grid gap-2 text-xs">
                {[
                  ["分析中", status.phase === "analyzing"],
                  ["GitHub 分析中", status.phase === "github"],
                  ["写入中", status.phase === "writing"],
                ].map(([label, active]) => (
                  <span
                    key={String(label)}
                    className={`rounded-full border px-3 py-2 ${
                      active
                        ? "border-red-500/40 bg-red-500/12 text-red-100"
                        : "border-zinc-900 bg-black/20 text-zinc-600"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-red-950 bg-[#080808] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-red-300/70">
                API 设置
              </p>
              <label className="mt-3 block text-xs text-zinc-500">
                LLM Key（必填，仅使用当前窗口输入，不读取本地配置）
              </label>
              <input
                value={llmApiKey}
                onChange={(event) => onLlmApiKeyChange(event.target.value)}
                type="password"
                placeholder="sk-..."
                className="mt-2 w-full rounded-2xl border border-zinc-900 bg-[#050505] px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-red-800"
              />
              <label className="mt-3 block text-xs text-zinc-500">
                Base URL
              </label>
              <input
                value={llmBaseUrl}
                onChange={(event) => onLlmBaseUrlChange(event.target.value)}
                placeholder="https://api.openai.com/v1"
                className="mt-2 w-full rounded-2xl border border-zinc-900 bg-[#050505] px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-red-800"
              />
              <label className="mt-3 block text-xs text-zinc-500">
                Model
              </label>
              <input
                value={llmModel}
                onChange={(event) => onLlmModelChange(event.target.value)}
                placeholder="gpt-4o-mini"
                className="mt-2 w-full rounded-2xl border border-zinc-900 bg-[#050505] px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-red-800"
              />
              <label className="mt-3 block text-xs text-zinc-500">
                Wire API
              </label>
              <select
                value={llmWireApi}
                onChange={(event) => onLlmWireApiChange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-zinc-900 bg-[#050505] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-red-800"
              >
                <option value="chat_completions">chat/completions</option>
                <option value="responses">responses</option>
              </select>
              <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-zinc-900 bg-[#050505] px-3 py-2 text-xs text-zinc-400">
                <span>接入 AirJelly 记忆</span>
                <input
                  type="checkbox"
                  checked={airjellyEnabled}
                  onChange={(event) => onAirjellyEnabledChange(event.target.checked)}
                  className="h-4 w-4 accent-red-500"
                />
              </label>
            </article>
          </aside>
        </div>
      </section>

      <ComparisonCard items={comparisons} />
    </section>
  );
}

