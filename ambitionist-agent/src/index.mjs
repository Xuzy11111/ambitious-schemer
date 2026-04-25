import { readFile } from "node:fs/promises";
import process from "node:process";

import { AmbitionistOrchestrator } from "./orchestrator.mjs";
import { asJson, bulletList, compactPathRanking, section } from "./utils/format.mjs";

async function loadJson(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function renderInterview(result) {
  return [
    section("Status", result.status),
    section("Profile Summary", bulletList(result.profileSummary)),
    section("Interview Board", asJson(result.interviewBoard || {})),
    section("Resume Snapshot", asJson(result.resumeSnapshot || {})),
    result.airjelly ? section("AirJelly Context", asJson(result.airjelly)) : "",
    section(
      "Next Question",
      `${result.nextQuestion.prompt}\nReason: ${result.nextQuestion.reason}\nLayer: ${result.nextQuestion.layer}`,
    ),
    section("Contradictions", bulletList(result.contradictions)),
    result.githubSync ? section("GitHub Sync", asJson(result.githubSync)) : "",
    result.storage ? section("Storage", asJson(result.storage)) : "",
  ].join("\n");
}

function renderReady(result) {
  return [
    section("Status", result.status),
    section("Profile Summary", bulletList(result.profileSummary)),
    section("Resume Snapshot", asJson(result.resumeSnapshot || {})),
    section("Interview Board", asJson(result.interviewBoard || {})),
    result.airjelly ? section("AirJelly Context", asJson(result.airjelly)) : "",
    section("Contradictions", bulletList(result.contradictions || [])),
    section("Market Landscape", asJson(result.marketLandscape)),
    section("Path Ranking", compactPathRanking(result.comparison.rankings)),
    section("Top Recommendation", asJson(result.comparison.topRecommendation)),
    section("Why Not Others", asJson(result.comparison.whyNotOthers)),
    section("Next Actions", asJson(result.comparison.nextActions)),
    result.githubSync ? section("GitHub Sync", asJson(result.githubSync)) : "",
    result.storage ? section("Storage", asJson(result.storage)) : "",
    result.followUpQuestion
      ? section(
          "Optional Follow-up",
          `${result.followUpQuestion.prompt}\nReason: ${result.followUpQuestion.reason}`,
        )
      : "",
  ].join("\n");
}

async function main() {
  const command = process.argv[2] || "demo";
  const filePath = process.argv[3] || "./examples/hkust-case.json";
  const input = await loadJson(filePath);
  const orchestrator = new AmbitionistOrchestrator();
  const result = await orchestrator.runHeartbeatCycle(input);

  if (command === "plan" || command === "demo") {
    console.log(result.status === "ready" ? renderReady(result) : renderInterview(result));
    return;
  }

  if (command === "interview") {
    if (result.status === "ready") {
      const interviewView = {
        ...result,
        nextQuestion:
          result.followUpQuestion || {
            prompt: "当前信息已足够进入比较阶段。",
            reason: "访谈模块没有检测到新的高价值问题。",
            layer: "done",
          },
      };
      console.log(renderInterview(interviewView));
    } else {
      console.log(renderInterview(result));
    }
    return;
  }

  if (command === "profile") {
    console.log(
      [
        section("Profile", asJson(result.profile)),
        section("Resume Snapshot", asJson(result.resumeSnapshot || {})),
        section("Interview Board", asJson(result.interviewBoard || {})),
      ].join("\n"),
    );
    return;
  }

  console.log(asJson(result));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
