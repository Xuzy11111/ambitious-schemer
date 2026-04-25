# Technical Route

## Product Goal

Build a long-term decision engine for computer science students facing graduation choices such as:

- direct job
- domestic master's
- overseas master's
- PhD
- research path
- engineering path
- AI / infra / agent / product direction choice

The key difference from a one-shot career report is continuous recalibration:

- understand the person
- track new growth evidence
- model world changes
- re-run recommendation logic at each critical node

## Why This Architecture

The repo uses a modular skill architecture because the hackathon story is strongest when the "brain" is visible and explainable.

The flow is:

1. `DeepInterviewSkill`
2. `ProfileUpdateSkill`
3. `MarketSearchSkill`
4. `PathCompareSkill`
5. `orchestrator`

This gives three benefits:

1. You can demo each intelligence module independently.
2. The orchestration logic is explicit, so the judges see "not just chatting".
3. It is easy to swap mock search with real APIs later.

## Core Technical Design

### 1. DeepInterviewSkill

Purpose:

- discover missing profile fields
- detect contradictions
- surface hidden motivations
- rank values and tradeoffs

Interview is divided into three layers:

1. background capture
2. conflict excavation
3. value ranking

Output:

- next best question
- reason for asking
- extracted signals from answers
- completeness score
- interview board with proactive questions and missing checklist

The interview module is intentionally proactive. It should explicitly ask for:

- future development goal
- family background and economic support
- relationship status and whether it affects geography
- GitHub username or profile URL
- hidden fears behind the stated choice

It now also has a memory-grounded branch:

- before each turn, read recent AirJelly memories and task memories
- if needed, run semantic recall with `searchMemory()`
- generate a stronger follow-up from `counterEvidence` or `interviewHints`
- ask "why are you saying A when your last 30 days look like B?"

### 2. ProfileUpdateSkill

Purpose:

- convert raw answers, milestones, GitHub evidence, and AirJelly signals into a stable structured profile

Two layers are stored:

- `rawEvents`: dynamic evidence like projects, awards, internships, offers, new interests
- `profileSummary`: longer-term stable traits like risk preference, money pressure, research inclination, city preference

Output:

- normalized `userProfile`
- contradictions
- summary bullet points
- profile completeness score
- render-ready `resumeSnapshot`
- storage-ready profile record

This module is the center of the second board: the personal archive.

It turns dialogue and GitHub evidence into:

- structured portrait JSON
- a compact resume headline
- projects and highlights
- growth evidence that can be persisted and reloaded
- AirJelly-derived `rawEvents` that look more like resume evidence than opaque memory blobs

### 3. MarketSearchSkill

Purpose:

- represent the "world changed" part of the story

For the hackathon, the system uses controlled time snapshots:

- `2020`
- `2022`
- `2024`
- `2026`

Each snapshot contains:

- hot directions
- weak directions
- hiring demand
- research climate
- compensation patterns
- macro risks

This is intentionally a semi-mocked external world model, because:

1. it is stable in a live demo
2. it clearly shows time progression
3. it can later be replaced with real job feeds, GitHub trends, papers, or policy feeds

The third board is intentionally left as an interface in code rather than a hard-coded crawler implementation. This is done through `MarketDataProvider`, so your teammate can plug in crawled market data later without touching the first two boards.

### 4. PathCompareSkill

Purpose:

- compare candidate routes instead of returning one magic answer

Fixed dimensions:

- long-term upside
- short-term cash generation
- risk
- constraint match
- reversibility
- switching cost

The comparator computes:

- weighted scores
- recommendation rationale
- why other paths lost
- action plan

This is the most "decision-system" part of the project.

### 5. Orchestrator

Purpose:

- run the heartbeat-style auto progression

State machine:

1. `interviewing`
2. `profile_updating`
3. `market_searching`
4. `comparing`
5. `done`

Fallback:

- if profile data is insufficient, jump back to interview
- if conflict is high, ask a disambiguation question
- if user adds new evidence, re-run from profile update onward

AirJelly-enhanced order:

1. read latest transcript state
2. query AirJelly recent context
3. build interview question from memory-backed evidence if available
4. update profile using both self-report and observed behavior
5. continue to market search and comparison when ready

## AirJelly Technical Route

The code supports both SDK and CLI integration.

### SDK route

Best for product code.

Planned usage:

- `getOpenTasks()`
- `listMemories()`
- `getEventsByDate()`
- `getTaskMemories()`
- `getTopApps()`
- `searchMemory()` for semantic recall before each interview turn

Value:

- understand what the student is actually spending time on
- detect engineering vs research vs exploration tendency
- read continuous work context instead of one-shot self-reporting
- convert observed work traces into interview prompts and profile evidence

### CLI route

Best for fast demos and terminal-native workflows.

Planned usage:

- `airjelly status`
- `airjelly task open --json`
- `airjelly task memories <id> --json`
- `airjelly apps top --json`
- `airjelly memory list --json`
- `airjelly memory events --json`
- `airjelly memory search "<query>" --json`

Value:

- zero product-side SDK binding during demo
- easy to show real machine context
- useful as fallback when SDK is not installed

## Suggested Frontend Contract

Input payload:

```json
{
  "userId": "frank-demo",
  "targetYear": 2024,
  "userMessage": "I am not sure whether I should do a PhD or take a safer path.",
  "knownProfile": {},
  "transcript": [],
  "rawEvents": [],
  "githubEvidence": [],
  "candidatePaths": [],
  "storage": {
    "enabled": true,
    "dir": "./data/profiles"
  }
}
```

Output payload:

```json
{
  "status": "needs_interview | ready",
  "nextQuestion": {},
  "interviewBoard": {},
  "profile": {},
  "resumeSnapshot": {},
  "marketLandscape": {},
  "comparison": {},
  "recommendation": {},
  "storage": {}
}
```

## File Responsibilities

- `src/index.mjs`: local demo entrypoint.
- `src/orchestrator.mjs`: heartbeat coordinator.
- `src/types.mjs`: canonical data shapes and defaults.
- `src/skills/deepInterviewSkill.mjs`: layered questioning, proactive onboarding logic, and interview board generation.
- `src/skills/profileUpdateSkill.mjs`: merges answers, GitHub evidence, and AirJelly-derived raw events into profile JSON and a resume-like snapshot.
- `src/skills/marketSearchSkill.mjs`: builds candidate path cards using time snapshots and a pluggable market provider.
- `src/skills/pathCompareSkill.mjs`: scores and ranks paths.
- `src/integrations/githubProfile.mjs`: fetches public GitHub profile and repo signals.
- `src/integrations/airjellySdk.mjs`: rich AirJelly SDK collector for memories, task memories, top apps, and semantic recall.
- `src/integrations/airjellyCli.mjs`: AirJelly CLI fallback collector with matching output shape.
- `src/integrations/airjellyAnalysis.mjs`: converts raw AirJelly records into `signals`, `rawEvents`, `counterEvidence`, and `interviewHints`.
- `src/contracts/marketDataProvider.mjs`: interface for the third board's crawler/search data source.
- `src/storage/profileRepository.mjs`: JSON persistence for profile, summary, resume snapshot, and sync metadata.
- `src/data/trendSnapshots.mjs`: external-world simulation data.
- `src/utils/scoring.mjs`: utility scoring math.
- `src/utils/format.mjs`: terminal output formatting helpers.

## How To Extend After The Hackathon

1. Replace timeline snapshots with real feeds:
   GitHub trends, job boards, papers, policy/news.
2. Add real LLM calls:
   prompt each skill with the current structured state and parse JSON.
3. Add GitHub ingestion:
   repo language mix, star growth, commit activity, README semantics.
4. Add longitudinal memory:
   keep profile deltas over time, not just current summary.
5. Add explicit scenario simulation:
   "If I choose offer A, where do I stand in year 2 and year 5?"
6. Add deeper AirJelly layers:
   `getTaskList()` for task history, `getAppSessions()` for session rhythm, and `listPersons()` / `getEventsForEntity()` for mentor/collaborator context.
