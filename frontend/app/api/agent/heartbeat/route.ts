import { statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveFromFrontendRoot(inputPath: string) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
}

const AGENT_ROOT = resolveFromFrontendRoot(
  process.env.AMBITIONIST_AGENT_ROOT || "../ambitionist-agent",
);
const ORCHESTRATOR_PATH = path.join(AGENT_ROOT, "src/orchestrator.mjs");
const PROFILE_STORAGE_DIR = path.join(AGENT_ROOT, "data/profiles");
const nativeImport = new Function("moduleUrl", "return import(moduleUrl)") as (
  moduleUrl: string,
) => Promise<{ AmbitionistOrchestrator: new () => { runHeartbeatCycle: (input: unknown) => Promise<unknown> } }>;

type HeartbeatRequest = {
  userId?: string;
  userMessage?: string;
  knownProfile?: unknown;
  transcript?: unknown[];
  rawEvents?: unknown[];
  githubEvidence?: unknown[];
  candidatePaths?: unknown[];
  targetYear?: number;
  llm?: Record<string, unknown>;
  githubAnalysis?: Record<string, unknown>;
  airjelly?: Record<string, unknown>;
  planning?: Record<string, unknown>;
  storage?: Record<string, unknown>;
};

async function loadOrchestrator() {
  const moduleUrl = pathToFileURL(ORCHESTRATOR_PATH).href;
  const cacheBuster =
    process.env.NODE_ENV === "development"
      ? `?mtime=${statSync(ORCHESTRATOR_PATH).mtimeMs}`
      : "";
  const mod = await nativeImport(`${moduleUrl}${cacheBuster}`);
  return new mod.AmbitionistOrchestrator();
}

function buildAgentInput(body: HeartbeatRequest) {
  const bodyLlm = body.llm || {};
  const bodyApiKey = typeof bodyLlm.apiKey === "string" ? bodyLlm.apiKey.trim() : "";
  const bodyBaseUrl = typeof bodyLlm.baseUrl === "string" ? bodyLlm.baseUrl.trim() : "";
  const bodyModel = typeof bodyLlm.model === "string" ? bodyLlm.model.trim() : "";
  const bodyWireApi = typeof bodyLlm.wireApi === "string" ? bodyLlm.wireApi.trim() : "";
  const hasLlmKey = Boolean(bodyApiKey);

  return {
    userId: body.userId || "frontend-demo-user",
    targetYear: body.targetYear || 2024,
    userMessage: body.userMessage || "",
    knownProfile: body.knownProfile || {},
    transcript: body.transcript || [],
    rawEvents: body.rawEvents || [],
    githubEvidence: body.githubEvidence || [],
    candidatePaths: body.candidatePaths || [],
    llm: {
      ...bodyLlm,
      apiKey: bodyApiKey,
      ...(bodyBaseUrl ? { baseUrl: bodyBaseUrl } : {}),
      ...(bodyModel ? { model: bodyModel } : {}),
      ...(bodyWireApi ? { wireApi: bodyWireApi } : {}),
      enabled: hasLlmKey,
    },
    githubAnalysis: {
      enabled: true,
      analysisRepoLimit: 3,
      ...(body.githubAnalysis || {}),
    },
    airjelly: {
      enableSemanticSearch: true,
      memoryWindowDays: 30,
      eventWindowDays: 14,
      semanticQueryLimit: 2,
      ...(body.airjelly || {}),
    },
    interview: {
      llmQuestionEnabled: hasLlmKey,
      llmExtractionEnabled: hasLlmKey,
    },
    planning: {
      llmPlanEnabled: hasLlmKey,
      ...(body.planning || {}),
    },
    storage: {
      enabled: true,
      dir: PROFILE_STORAGE_DIR,
      llmDecisionEnabled: hasLlmKey,
      ...(body.storage || {}),
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HeartbeatRequest;
    const orchestrator = await loadOrchestrator();
    const result = await orchestrator.runHeartbeatCycle(buildAgentInput(body));

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agent error";
    console.error("[agent heartbeat] request failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
