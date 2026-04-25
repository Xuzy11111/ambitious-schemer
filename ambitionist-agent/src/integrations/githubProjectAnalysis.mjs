import { callJsonLlm } from "./llmClient.mjs";

const SOURCE_EXTENSIONS = [".js", ".mjs", ".ts", ".tsx", ".py", ".go", ".java", ".rs", ".md"];
const MAX_README_CHARS = 6000;
const MAX_SOURCE_FILES = 4;
const MAX_SOURCE_CHARS_PER_FILE = 3500;
const GITHUB_FETCH_TIMEOUT_MS = 8000;

function repoApiHeaders(githubToken = "") {
  return {
    "User-Agent": "ambitionist-agent",
    ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
  };
}

function truncate(text = "", max = 1000) {
  return String(text).length > max ? `${String(text).slice(0, max)}\n...[truncated]` : String(text);
}

function fileScore(path = "") {
  const lower = path.toLowerCase();
  let score = 0;
  if (lower.includes("readme")) score += 20;
  if (lower.includes("src/")) score += 10;
  if (lower.includes("app.")) score += 8;
  if (lower.includes("index.")) score += 8;
  if (lower.includes("server.")) score += 8;
  if (lower.includes("agent")) score += 6;
  if (lower.includes("api")) score += 5;
  if (lower.includes("test")) score -= 8;
  if (lower.includes("dist/") || lower.includes("build/") || lower.includes("node_modules/")) score -= 30;
  return score;
}

function pickSourceFiles(tree = []) {
  return tree
    .filter((item) => item.type === "blob")
    .filter((item) => SOURCE_EXTENSIONS.some((ext) => item.path.toLowerCase().endsWith(ext)))
    .filter((item) => (item.size || 0) > 0 && (item.size || 0) <= 60000)
    .sort((a, b) => fileScore(b.path) - fileScore(a.path))
    .slice(0, MAX_SOURCE_FILES);
}

function decodeBase64(content = "") {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function fetchGithubJson(url, githubToken = "") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: repoApiHeaders(githubToken),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRepoReadme(repo, githubToken = "") {
  const payload = await fetchGithubJson(`https://api.github.com/repos/${repo.repo}/readme`, githubToken);
  if (!payload?.content) return "";
  return truncate(decodeBase64(payload.content), MAX_README_CHARS);
}

async function fetchSourceSamples(repo, githubToken = "") {
  const branch = repo.defaultBranch || "main";
  const tree = await fetchGithubJson(
    `https://api.github.com/repos/${repo.repo}/git/trees/${branch}?recursive=1`,
    githubToken,
  );
  if (!Array.isArray(tree?.tree)) return [];

  const files = pickSourceFiles(tree.tree);
  const samples = await Promise.all(
    files.map(async (file) => {
      const rawUrl = `https://raw.githubusercontent.com/${repo.repo}/${branch}/${file.path}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GITHUB_FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(rawUrl, {
          headers: repoApiHeaders(githubToken),
          signal: controller.signal,
        });
        if (!response.ok) return null;
        const content = await response.text();
        return {
          path: file.path,
          language: file.path.split(".").at(-1) || "",
          content: truncate(content, MAX_SOURCE_CHARS_PER_FILE),
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

  return samples.filter(Boolean);
}

function heuristicAnalysis(repo, readme = "", sourceSamples = []) {
  const combined = [repo.description, readme, ...sourceSamples.map((item) => item.content)]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
  const evidence = [];
  const strengths = [];
  const risks = [];

  if (combined.includes("llm") || combined.includes("agent") || combined.includes("openai")) {
    strengths.push("Shows agent/LLM product-building exposure.");
  }
  if (combined.includes("api") || combined.includes("server") || combined.includes("backend")) {
    strengths.push("Contains backend/API implementation signals.");
  }
  if (combined.includes("test") || combined.includes("spec")) {
    strengths.push("Includes some testing or validation signal.");
  } else {
    risks.push("Testing signal is unclear from sampled files.");
  }
  if (readme.length >= 500) {
    evidence.push("README explains project context with enough detail for resume extraction.");
  } else {
    risks.push("README is short or unavailable, so project narrative may need manual clarification.");
  }

  return {
    summary: repo.description || `${repo.repo} is a ${repo.projectType || "software project"}.`,
    roleSignals: strengths.length ? strengths : ["General software engineering project evidence."],
    technicalDepth: sourceSamples.length ? "medium" : "low",
    productMaturity: readme.length >= 500 ? "medium" : "early",
    resumeBullets: [
      `Built ${repo.repo} using ${(repo.techStack || []).slice(0, 4).join(", ") || "software engineering tools"}.`,
    ],
    careerSignals: [repo.inclination || "engineering"],
    risks,
    evidence,
  };
}

async function llmAnalyzeRepo({ repo, readme, sourceSamples, llm = {} }) {
  const result = await callJsonLlm({
    options: llm,
    system:
      "You analyze a computer science student's GitHub project for career planning. Focus on technical depth, project maturity, role fit, and resume-ready evidence. Avoid overclaiming.",
    schemaHint:
      '{"summary":"string","roleSignals":["string"],"technicalDepth":"low|medium|high","productMaturity":"early|medium|strong","resumeBullets":["string"],"careerSignals":["string"],"risks":["string"],"evidence":["string"]}',
    user: JSON.stringify({
      repo: {
        name: repo.repo,
        description: repo.description,
        techStack: repo.techStack,
        stars: repo.stars,
        forks: repo.forks,
        activityLevel: repo.activityLevel,
      },
      readme,
      sourceSamples,
    }),
  });

  if (!result.available || !result.data) {
    return {
      ...heuristicAnalysis(repo, readme, sourceSamples),
      llmAvailable: false,
      llmReason: result.reason,
    };
  }

  return {
    ...heuristicAnalysis(repo, readme, sourceSamples),
    ...result.data,
    llmAvailable: true,
    llmModel: result.model,
  };
}

export async function enrichGithubReposWithContentAnalysis(repos = [], options = {}) {
  if (!options.enabled || !repos.length) return repos;

  const githubToken = options.githubToken || process.env.GITHUB_TOKEN || "";
  const maxRepos = options.maxRepos || 3;
  const analyzedRepos = await Promise.all(
    repos.slice(0, maxRepos).map(async (repo) => {
      let readme = "";
      let sourceSamples = [];
      let projectAnalysis = null;

      try {
        [readme, sourceSamples] = await Promise.all([
          fetchRepoReadme(repo, githubToken),
          fetchSourceSamples(repo, githubToken),
        ]);
        projectAnalysis = await llmAnalyzeRepo({
          repo,
          readme,
          sourceSamples,
          llm: options.llm || {},
        });
      } catch (error) {
        projectAnalysis = {
          ...heuristicAnalysis(repo, readme, sourceSamples),
          llmAvailable: false,
          llmReason: error instanceof Error ? error.message : "github content analysis failed",
        };
      }

      return {
        ...repo,
        readmeAvailable: Boolean(readme),
        sourceSampleCount: sourceSamples.length,
        projectAnalysis,
      };
    }),
  );

  return [...analyzedRepos, ...repos.slice(maxRepos)];
}
