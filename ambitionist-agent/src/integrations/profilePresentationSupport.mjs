import { callJsonLlm } from "./llmClient.mjs";

export async function generateProfilePresentationWithLlm({
  profile,
  profileSummary = [],
  resumeSnapshot = {},
  latestSignals = [],
  transcript = [],
  githubSync = {},
  airjelly = {},
  options = {},
}) {
  if (!options.enabled) return null;

  const result = await callJsonLlm({
    options: options.llm || {},
    temperature: 0.2,
    system: [
      "You are the user-facing profile organizer for a career planning product.",
      "Rewrite the structured profile into concise, natural Chinese that can be rendered directly in a dashboard.",
      "Use only facts from the provided profile, transcript, GitHub evidence, and extracted signals.",
      "Do not use demo personas, placeholders, English template labels, or invented career-path names.",
      "If evidence is missing, say what is missing in a concrete and non-generic way.",
    ].join(" "),
    schemaHint:
      '{"profileSummary":["string"],"resumeSnapshot":{"headline":"string","education":["string"],"highlights":["string"],"projects":[{"name":"string","type":"string","techStack":["string"],"narrative":"string","technicalDepth":"string","resumeBullets":["string"]}],"experiences":[{"type":"string","name":"string","summary":"string"}],"constraints":["string"],"nextEvidenceToCollect":["string"]}}',
    user: JSON.stringify({
      profile,
      existingProfileSummary: profileSummary,
      existingResumeSnapshot: resumeSnapshot,
      latestSignals,
      recentTranscript: transcript.slice(-6),
      githubRepos: (githubSync.repos || []).slice(0, 4).map((repo) => ({
        repo: repo.repo,
        projectType: repo.projectType,
        techStack: repo.techStack,
        projectAnalysis: repo.projectAnalysis,
      })),
      airjellySummary: airjelly.contextSummary || null,
      airjellyTaskQueue: airjelly.taskQueue || null,
    }),
  });

  if (!result.available || !result.data) {
    return null;
  }

  return {
    profileSummary: Array.isArray(result.data.profileSummary) ? result.data.profileSummary : profileSummary,
    resumeSnapshot: result.data.resumeSnapshot || resumeSnapshot,
    llmModel: result.model,
  };
}
