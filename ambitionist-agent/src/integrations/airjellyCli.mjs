import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { analyzeAirJellyData, buildSemanticQueries } from "./airjellyAnalysis.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_OPEN_TASK_LIMIT = 5;
const DEFAULT_TOP_APP_LIMIT = 8;
const DEFAULT_MEMORY_LIMIT = 40;
const DEFAULT_EVENT_LIMIT = 80;
const DEFAULT_SEMANTIC_MATCH_LIMIT = 6;
const DEFAULT_TASK_MEMORY_LIMIT = 3;

async function runAirJelly(args) {
  const { stdout } = await execFileAsync("airjelly", args, {
    maxBuffer: 1024 * 1024,
  });
  return stdout;
}

function emptyCliResult(errorMessage, extra = {}) {
  return {
    available: false,
    source: "cli",
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

function parseJsonOutput(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function classifyCliError(error) {
  if (!error?.message) {
    return "unknown_error";
  }
  if (error.message.includes("ENOENT")) {
    return "cli_not_installed";
  }
  if (error.message.includes("Cannot connect to AirJelly")) {
    return "not_running";
  }
  if (error.message.includes("Method not found")) {
    return "method_not_supported";
  }
  return "command_failed";
}

async function loadTaskMemories(tasks = []) {
  const settled = await Promise.allSettled(
    tasks.slice(0, DEFAULT_TASK_MEMORY_LIMIT).map(async (task) => {
      const [taskDetailRaw, memoriesRaw] = await Promise.all([
        runAirJelly(["task", "get", task.id, "--json"]),
        runAirJelly(["task", "memories", task.id, "--json"]),
      ]);
      const taskDetail = parseJsonOutput(taskDetailRaw, null);

      return {
        taskId: task.id,
        title: taskDetail?.title || task.title,
        description: taskDetail?.description || task.description,
        progressSummary: taskDetail?.progress_summary || task.progress_summary,
        nextPlan: taskDetail?.next_plan || taskDetail?.nextPlan || task.next_plan || task.nextPlan || "",
        scene: taskDetail?.l1_scene || taskDetail?.scene || task.l1_scene || task.scene || "unassigned",
        taskDetail,
        memories: parseJsonOutput(memoriesRaw, []),
      };
    }),
  );

  return settled
    .filter((item) => item.status === "fulfilled")
    .map((item) => item.value);
}

async function runAirJellyJson(args, fallback = null) {
  return parseJsonOutput(await runAirJelly(args), fallback);
}

async function checkAirJellyCliSession() {
  await runAirJelly(["status"]);
  const capabilities = await runAirJellyJson(["capabilities", "--json"], null);
  return { capabilities };
}

export async function checkAirJellyCliStatus() {
  try {
    await runAirJelly(["status"]);
    return {
      available: true,
      source: "cli",
      error: "",
    };
  } catch (error) {
    return {
      available: false,
      source: "cli",
      error: error.message,
      errorType: classifyCliError(error),
    };
  }
}

function buildDateWindow({ memoryWindowDays, eventWindowDays }) {
  const now = Date.now();
  return {
    now,
    memorySinceIso: new Date(now - memoryWindowDays * 24 * 60 * 60 * 1000).toISOString(),
    memoryUntilIso: new Date(now).toISOString(),
    eventWindowHours: eventWindowDays * 24,
    startDate: new Date(now - eventWindowDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: new Date(now).toISOString().slice(0, 10),
  };
}

export async function collectAirJellyCliSignals({
  profile,
  transcript = [],
  latestAnswer = "",
  options = {},
} = {}) {
  const semanticSearchEnabled = options.enableSemanticSearch === true;
  const warnings = [];
  try {
    const memoryWindowDays = options.memoryWindowDays || 30;
    const eventWindowDays = options.eventWindowDays || 14;
    const { capabilities } = await checkAirJellyCliSession();
    const { memorySinceIso, memoryUntilIso, eventWindowHours, startDate, endDate } = buildDateWindow({
      memoryWindowDays,
      eventWindowDays,
    });
    const semanticQueries = buildSemanticQueries({
      profile,
      transcript,
      latestAnswer,
      maxQueries: options.semanticQueryLimit || 2,
    });
    if (semanticSearchEnabled) {
      warnings.push("memory search is enabled in CLI mode and may consume AirJelly embedding credit.");
    }

    const [openTasksRaw, topAppsRaw, listMemoriesRaw, eventsRaw] = await Promise.all([
      runAirJelly(["task", "open", "--limit", String(DEFAULT_OPEN_TASK_LIMIT), "--json"]),
      runAirJelly([
        "apps",
        "top",
        "--since",
        startDate,
        "--until",
        endDate,
        "--limit",
        String(DEFAULT_TOP_APP_LIMIT),
        "--json",
      ]),
      runAirJelly([
        "memory",
        "list",
        "--types",
        "event,case,procedure",
        "--since",
        memorySinceIso,
        "--until",
        memoryUntilIso,
        "--limit",
        String(DEFAULT_MEMORY_LIMIT),
        "--json",
      ]),
      runAirJelly([
        "memory",
        "events",
        "--hours",
        String(eventWindowHours),
        "--limit",
        String(DEFAULT_EVENT_LIMIT),
        "--json",
      ]),
    ]);

    const openTasks = parseJsonOutput(openTasksRaw, []);
    const topApps = parseJsonOutput(topAppsRaw, []);
    const listMemories = parseJsonOutput(listMemoriesRaw, []);
    const events = parseJsonOutput(eventsRaw, []);
    const taskMemoriesByTask = await loadTaskMemories(Array.isArray(openTasks) ? openTasks : []);
    const semanticMatches = semanticSearchEnabled
      ? (
          await Promise.allSettled(
            semanticQueries.map((query) =>
              runAirJelly([
                "memory",
                "search",
                query,
                "--types",
                "event,case,procedure",
                "--since",
                memorySinceIso,
                "--until",
                memoryUntilIso,
                "--limit",
                String(DEFAULT_SEMANTIC_MATCH_LIMIT),
                "--json",
              ]).then((stdout) => parseJsonOutput(stdout, [])),
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
      source: "cli",
      semanticSearchEnabled,
    });
    return {
      ...analyzed,
      warnings,
      capabilities,
    };
  } catch (error) {
    return emptyCliResult(error.message, {
      errorType: classifyCliError(error),
      semanticSearchEnabled,
      warnings,
    });
  }
}
