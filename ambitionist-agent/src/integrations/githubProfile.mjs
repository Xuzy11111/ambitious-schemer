function inferProjectType(repo) {
  const text = [repo.name, repo.description, ...(repo.topics || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("agent")) return "agent system";
  if (text.includes("infra")) return "infra tooling";
  if (text.includes("research")) return "research project";
  if (text.includes("backend")) return "backend service";
  if (text.includes("fullstack") || text.includes("full-stack")) return "full stack app";
  return "software project";
}

function inferInclination(repo) {
  const text = [repo.name, repo.description, ...(repo.topics || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("research") || text.includes("paper")) return "research";
  if (text.includes("infra") || text.includes("backend") || text.includes("tool")) return "engineering";
  if (text.includes("agent") || text.includes("product")) return "product-engineering";
  return "engineering";
}

function inferActivityLevel(repo) {
  if (repo.pushed_at) {
    const ageDays = Math.floor((Date.now() - Date.parse(repo.pushed_at)) / 86400000);
    if (ageDays <= 30) return "high";
    if (ageDays <= 120) return "medium";
  }

  if ((repo.stargazers_count || 0) >= 20) return "medium";
  return "low";
}

function normalizeRepo(repo) {
  return {
    repo: repo.full_name,
    projectType: inferProjectType(repo),
    techStack: [repo.language, ...(repo.topics || [])].filter(Boolean),
    inclination: inferInclination(repo),
    activityLevel: inferActivityLevel(repo),
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    url: repo.html_url,
    description: repo.description || "",
    updatedAt: repo.pushed_at || "",
    defaultBranch: repo.default_branch || "main",
  };
}

function githubHeaders(githubToken = "") {
  return {
    "User-Agent": "ambitionist-agent",
    ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {}),
  };
}

export async function fetchGithubProfileEvidence(
  githubUsername,
  { maxRepos = 6, githubToken = process.env.GITHUB_TOKEN || "" } = {},
) {
  if (!githubUsername) {
    return {
      available: false,
      reason: "missing github username",
      profile: null,
      repos: [],
    };
  }

  try {
    const [userResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${githubUsername}`, {
        headers: githubHeaders(githubToken),
      }),
      fetch(
        `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=${maxRepos}`,
        {
          headers: githubHeaders(githubToken),
        },
      ),
    ]);

    if (!userResponse.ok || !reposResponse.ok) {
      return {
        available: false,
        reason: `github api request failed: ${userResponse.status}/${reposResponse.status}`,
        profile: null,
        repos: [],
      };
    }

    const user = await userResponse.json();
    const repos = await reposResponse.json();

    return {
      available: true,
      reason: "",
      profile: {
        username: user.login,
        profileUrl: user.html_url,
        bio: user.bio || "",
        publicRepos: user.public_repos || 0,
        followers: user.followers || 0,
      },
      repos: Array.isArray(repos) ? repos.map(normalizeRepo) : [],
    };
  } catch (error) {
    return {
      available: false,
      reason: error.message,
      profile: null,
      repos: [],
    };
  }
}
