import { analyzeAirJellyData, buildSemanticQueries } from "./airjellyAnalysis.mjs";

const DEFAULT_OPEN_TASK_LIMIT = 5;
const DEFAULT_TOP_APP_LIMIT = 8;
const DEFAULT_MEMORY_LIMIT = 40;
const DEFAULT_SEMANTIC_MATCH_LIMIT = 6;
const DEFAULT_TASK_MEMORY_LIMIT = 3;

function emptySdkResult(errorMessage, extra = {}) {
  return {
    available: false,
    source: "sdk",
    error: errorMessage,
    errorType: extra.errorType || "unknown_error",
    signals: [],
    rawEvents: [],
    counterEvidence: [],
    interviewHints: [],
    semanticQueries: extra.semanticQueries || [],
    semanticSearchEnabled: extra.semanticSearchEnabled || false,
    warnings: extra.warnings || [],
    capabilities: extra.capabilities || null,
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

function classifySdkError(error, sdkModule) {
  if (!sdkModule || !error) {
    return "unknown_error";
  }

  if (sdkModule.AirJellyNotRunningError && error instanceof sdkModule.AirJellyNotRunningError) {
    return "not_running";
  }
  if (sdkModule.AirJellyConnectionError && error instanceof sdkModule.AirJellyConnectionError) {
    return "connection_error";
  }
  if (
    sdkModule.AirJellyMethodNotSupportedError &&
    error instanceof sdkModule.AirJellyMethodNotSupportedError
  ) {
    return "method_not_supported";
  }
  if (
    sdkModule.AirJellyApiVersionMismatchError &&
    error instanceof sdkModule.AirJellyApiVersionMismatchError
  ) {
    return "api_version_mismatch";
  }
  if (sdkModule.AirJellyRpcError && error instanceof sdkModule.AirJellyRpcError) {
    return "rpc_error";
  }

  return "unknown_error";
}

async function loadTaskMemories(client, tasks = []) {
  const settled = await Promise.allSettled(
    tasks.slice(0, DEFAULT_TASK_MEMORY_LIMIT).map(async (task) => {
      const [taskDetail, memories] = await Promise.all([
        client.getTask(task.id),
        client.getTaskMemories(task.id),
      ]);

      return {
        taskId: task.id,
        title: taskDetail?.title || task.title,
        description: taskDetail?.description || task.description,
        progressSummary: taskDetail?.progress_summary || task.progress_summary,
        nextPlan: taskDetail?.next_plan || taskDetail?.nextPlan || task.next_plan || task.nextPlan || "",
        scene: taskDetail?.l1_scene || taskDetail?.scene || task.l1_scene || task.scene || "unassigned",
        taskDetail,
        memories,
      };
    }),
  );

  return settled
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value);
}

async function createSdkSession() {
  const sdk = await import("@airjelly/sdk");
  const client = sdk.createClient();
  const health = await client.healthCheck();
  await client.assertCompatible();
  const capabilities = await client.getCapabilities();

  return { sdk, client, health, capabilities };
}

function buildDateWindow({ memoryWindowDays, eventWindowDays }) {
  const now = Date.now();
  return {
    now,
    memoryStartMs: now - memoryWindowDays * 24 * 60 * 60 * 1000,
    eventStartMs: now - eventWindowDays * 24 * 60 * 60 * 1000,
    startDate: new Date(now - eventWindowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: new Date(now).toISOString().slice(0, 10),
  };
}

export async function collectAirJellySdkSignals({
  profile,
  transcript = [],
  latestAnswer = "",
  options = {},
} = {}) {
  const semanticSearchEnabled = options.enableSemanticSearch === true;
  const warnings = [];
  let sdk;
  try {
    const memoryWindowDays = options.memoryWindowDays || 30;
    const eventWindowDays = options.eventWindowDays || 14;
    const { sdk: sdkModule, client, health, capabilities, now, memoryStartMs, eventStartMs, startDate, endDate } = {
      ...(await createSdkSession()),
      ...buildDateWindow({ memoryWindowDays, eventWindowDays }),
    };
    sdk = sdkModule;
    if (health?.ok === false) {
      warnings.push("AirJelly SDK health check did not report ok=true, so downstream data may be incomplete.");
    }
    const semanticQueries = buildSemanticQueries({
      profile,
      transcript,
      latestAnswer,
      maxQueries: options.semanticQueryLimit || 2,
    });
    if (semanticSearchEnabled) {
      warnings.push("searchMemory is enabled and may consume AirJelly embedding credit.");
    }

    const [openTasks, listMemories, events, topApps] = await Promise.all([
      client.getOpenTasks(DEFAULT_OPEN_TASK_LIMIT),
      client.listMemories({
        memory_types: ["event", "case", "procedure"],
        start_time_after: memoryStartMs,
        limit: DEFAULT_MEMORY_LIMIT,
      }),
      client.getEventsByDate(eventStartMs, now),
      client.getTopApps(startDate, endDate, DEFAULT_TOP_APP_LIMIT),
    ]);

    const taskMemoriesByTask = await loadTaskMemories(client, openTasks);
    const semanticMatches = semanticSearchEnabled
      ? (
          await Promise.allSettled(
            semanticQueries.map((query) =>
              client.searchMemory(query, {
                memory_types: ["event", "case", "procedure"],
                start_time_after: memoryStartMs,
                start_time_before: now,
                limit: DEFAULT_SEMANTIC_MATCH_LIMIT,
              }),
            ),
          )
        )
          .filter((item) => item.status === "fulfilled")
          .flatMap((item) => item.value)
      : [];

    const analyzed = analyzeAirJellyData({
      profile,
      latestAnswer,
      openTasks,
      taskMemoriesByTask,
      listMemories,
      events,
      topApps,
      semanticMatches,
      queryHistory: semanticQueries,
      source: "sdk",
      semanticSearchEnabled,
    });
    return {
      ...analyzed,
      warnings,
      capabilities: {
        apiVersion: capabilities.apiVersion,
        appVersion: capabilities.appVersion,
        methods: capabilities.methods,
      },
    };
  } catch (error) {
    return emptySdkResult(error.message, {
      errorType: classifySdkError(error, sdk),
      semanticSearchEnabled,
      warnings,
    });
  }
}
