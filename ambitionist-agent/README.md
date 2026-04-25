# Ambitionist Agent

`Ambitionist Agent` is a hackathon-ready decision engine for "Ye Xin Jia", a long-horizon graduation and career-planning system for computer science students.

Its job is not to give a one-shot suggestion. Its job is to run a loop:

`interview -> profile -> search -> compare -> recommendation -> re-interview`

This repository focuses on the system brain:

- `DeepInterviewSkill`
- `ProfileUpdateSkill`
- `MarketSearchSkill`
- `PathCompareSkill`
- `orchestrator`

## What Problem It Solves

This project is designed for a narrow and strong use case:

- computer science students
- facing graduation decisions
- choosing among job / master's / PhD / research / engineering / AI / product / startup paths
- under real constraints such as money, family, geography, risk preference, and changing market conditions

The system differs from a normal chatbot in three ways:

1. It actively asks for missing decision variables instead of waiting passively.
2. It turns dialogue and external evidence into a persistent profile and resume-like snapshot.
3. It compares candidate paths using explicit rules instead of vague motivational text.

It is also explicitly weight-aware. The system does not treat all user needs as equally important. It can collect and use weights such as:

- money urgency
- partner distance aversion
- family distance aversion
- domain passion
- return-home expectation
- market prospect priority

## Full Technical Route

The complete technical route is:

1. Collect current state:
   user message, transcript, known profile, GitHub evidence, raw events, selected year.
2. Pull real-world personal context:
   AirJelly SDK or CLI reads recent memories, tasks, events, and app usage.
3. Run `DeepInterviewSkill`:
   decide the next best question, including memory-grounded counter-evidence questions.
4. Run `ProfileUpdateSkill`:
   normalize user self-report plus GitHub plus AirJelly behavior into structured profile JSON, including explicit decision weights.
5. Run `MarketSearchSkill`:
   get market landscape from a provider interface.
6. Run `PathCompareSkill`:
   score candidate paths using explicit dimensions and personalized weights.
7. Persist output:
   save profile, key events, conversation highlights, progress signals, and compact sync metadata if storage is enabled.

In short:

`user input + AirJelly + GitHub -> interview -> profile archive -> market landscape -> path comparison`

## Architecture

### Main runtime flow

```text
index.mjs
  -> orchestrator.runHeartbeatCycle(input)
    -> AirJelly integration (SDK first, CLI fallback)
    -> DeepInterviewSkill
    -> GitHub integration
    -> ProfileUpdateSkill
    -> MarketSearchSkill
    -> PathCompareSkill
    -> optional JSON storage
```

### Boards in the product story

#### 1. Dialogue / interview board

Owned by:

- `DeepInterviewSkill`
- `orchestrator`
- AirJelly memory-grounding layer

Purpose:

- ask for missing variables
- challenge inconsistent self-report
- generate the next best question
- maintain interview progress and priority
- collect weighted priorities instead of only plain preferences

#### 2. Personal profile / growth archive board

Owned by:

- `ProfileUpdateSkill`
- `githubProfile`
- `profileRepository`
- AirJelly raw event conversion layer

Purpose:

- store structured user profile
- keep only high-value `rawEvents`
- build a render-ready resume snapshot
- accumulate evidence over time
- preserve progress milestones instead of dumping all low-signal chatter

#### 3. External market / crawler board

Owned by:

- `MarketSearchSkill`
- `MarketDataProvider` interface

Purpose:

- read external world changes
- feed path comparison with market conditions

This repo intentionally leaves the crawler/search implementation as an interface so another teammate can plug it in later.

## Skill Overview

### `DeepInterviewSkill`

File:

- `src/skills/deepInterviewSkill.mjs`

Purpose:

- decide what to ask next
- prioritize missing fields
- surface hidden conflicts
- generate contradiction-driven questions
- generate AirJelly-backed questions before each turn

What it asks about:

- name / school / grade / graduation year
- GitHub username or profile URL
- five-year goal and ideal lifestyle
- family support and financial pressure
- relationship status and geography constraints
- job / master's / PhD preference
- target domains
- value ranking
- 0-10 weights for key priorities, including money urgency, partner distance aversion, family distance aversion, domain passion, return-home expectation, and market prospect priority
- hidden fears and reversibility preference

What it outputs:

- `nextQuestion`
- `interviewBoard`
- `completeness`
- extracted field-level signals from the latest answer

How it works:

1. Look at `knownProfile`
2. Check which fields are missing
3. If AirJelly provides `counterEvidence` or `interviewHints`, prefer those questions first
4. When asking for weights, push the user to score concrete tradeoffs instead of saying everything matters equally
5. Otherwise pick the highest-priority question from the built-in question bank

How to use it:

- direct usage inside `orchestrator.runInterviewStep(...)`
- input:
  - `profile`
  - `askedQuestionIds`
  - `airjellyContext`
- output:
  - interview question and board data for UI rendering

### `ProfileUpdateSkill`

File:

- `src/skills/profileUpdateSkill.mjs`

Purpose:

- merge self-report and observed evidence into a stable profile
- separate long-term traits from noisy short-term traces
- build a `resumeSnapshot`
- generate contradictions

What it consumes:

- extracted interview signals
- raw user events
- GitHub repos and GitHub profile
- AirJelly signals
- AirJelly raw events
- AirJelly counter-evidence summaries
- user-declared decision weights

What it outputs:

- `profile`
- `profileSummary`
- `resumeSnapshot`
- `contradictions`
- `completeness`
- stable `decisionWeights` that downstream scoring can consume directly

How to use it:

- called from `orchestrator` after interview and integrations
- input is one structured object:

```js
profileUpdateSkill.update({
  knownProfile,
  extractedSignals,
  rawEvents,
  githubEvidence,
  githubProfile,
  airjellyContext,
})
```

### `MarketSearchSkill`

File:

- `src/skills/marketSearchSkill.mjs`

Purpose:

- transform market landscape into path-level adjustments
- keep the "world changed" part of the story separate from interview and profile logic
- leave a clean provider hook so real crawler or job-board data can replace static snapshots later

Current implementation:

- uses curated snapshots in `src/data/trendSnapshots.mjs`
- reads data via the `MarketDataProvider` interface, not directly
- enriches each candidate path with `marketReasons` plus `adjustments.personalBoost` and `adjustments.marketBoost`

What it outputs:

- `marketLandscape`
- `candidatePaths` enriched with market and personal boost reasons

How to use it:

```js
marketSearchSkill.search({
  targetYear,
  profile,
  candidatePaths,
})
```

Plug-in surface intentionally left open:

- replace `StaticSnapshotMarketProvider` with a crawler-backed provider
- feed in job board data, lab trend data, or macro snapshots through the same `getLandscape(...)` contract
- keep the skill logic stable while swapping the market source underneath

### `PathCompareSkill`

File:

- `src/skills/pathCompareSkill.mjs`

Purpose:

- compare multiple graduation paths
- output one best route plus why other paths lose
- use both profile facts and explicit user weights

Comparison dimensions:

- long-term potential
- short-term monetization
- risk control
- constraint match
- reversibility
- switching cost

The final path scoring is not generic. It now uses:

- baseline comparison dimensions
- profile facts
- hidden concerns
- explicit `decisionWeights`
- weight-aware summaries so recommendation text explains which priorities actually drove the answer

What it outputs:

- `rankings`
- `topRecommendation`
- `whyNotOthers`
- `nextActions`
- `decisionWeightsUsed`

How to use it:

```js
pathCompareSkill.compare({
  profile,
  candidatePaths,
})
```

## Orchestrator

File:

- `src/orchestrator.mjs`

Purpose:

- coordinate the entire pipeline
- implement the heartbeat-style auto-progression
- persist output when requested
- choose AirJelly SDK first and fall back to CLI only when needed

State machine:

1. `interviewing`
2. `profile_updating`
3. `market_searching`
4. `comparing`
5. `done`

Current runtime order:

1. Clone and normalize profile defaults
2. Pull AirJelly context with SDK-first, CLI-fallback collection
3. Generate next question through `DeepInterviewSkill`
4. Fetch GitHub evidence if GitHub username is available
5. Merge everything through `ProfileUpdateSkill`
6. If profile completeness is low, return `needs_interview`
7. Else run market search and path compare
8. Persist only high-signal profile state if storage is enabled

Public usage:

```js
const orchestrator = new AmbitionistOrchestrator()
const result = await orchestrator.runHeartbeatCycle(input)
```

Useful internal entrypoints:

- `collectAirJellySignals(...)`: standardized AirJelly acquisition with normalized return shape
- `runInterviewStep(...)`: interview-only turn planning plus latest signal extraction
- `persistIfEnabled(...)`: profile archive write with importance filtering and compact storage payloads

## AirJelly Integration

The project supports two AirJelly modes:

### 1. SDK mode

Files:

- `src/integrations/airjellySdk.mjs`
- `src/integrations/airjellyAnalysis.mjs`

Used APIs:

- `healthCheck()`
- `assertCompatible()`
- `getOpenTasks()`
- `getTaskMemories()`
- `listMemories()`
- `getEventsByDate()`
- `getTopApps()`
- `searchMemory()` optionally

Important:

- semantic recall is now treated as a credit-consuming feature
- it should be explicitly enabled when desired
- default input should keep it off for safer hackathon demos

What happens before each interview turn:

1. Run `healthCheck()` and `assertCompatible()` before any data pull
2. Read capability metadata through `getCapabilities()`
3. Read open tasks
4. Read recent memories
5. Read recent events
6. Read top apps
7. Read task memories for top tasks
8. Optionally run semantic search using latest answer plus current profile domains, with an explicit time window and opt-in switch
9. Convert all of that into:
   - `signals`
   - `rawEvents`
   - `counterEvidence`
   - `interviewHints`
   - `contextSummary`

The SDK integration is now more normalized:

- connection health is checked before use
- compatibility is asserted before data methods are called
- capability metadata can be returned
- warnings can be returned
- error types are normalized for the caller
- semantic search uses the same bounded time window as list-based reads

### 2. CLI mode

Files:

- `src/integrations/airjellyCli.mjs`
- `src/integrations/airjellyAnalysis.mjs`

Used commands:

- `airjelly status`
- `airjelly capabilities --json`
- `airjelly task list --status open --json`
- `airjelly task memories <id> --json`
- `airjelly apps top --json`
- `airjelly memory list --json`
- `airjelly memory events --json`
- `airjelly memory search "<query>" --json`

This is a fallback when SDK is not installed.

The CLI integration also now:

- checks `status` first
- can read `capabilities --json`
- uses canonical JSON-producing commands instead of looser terminal-only variants
- keeps `memory search` opt-in instead of mandatory
- constrains `memory search` to the same time window as `memory list`
- returns normalized warnings and error types

### AirJelly analysis layer

File:

- `src/integrations/airjellyAnalysis.mjs`

Purpose:

- unify SDK and CLI output into the same structure
- infer recent dominant mode:
  - `engineering`
  - `research`
  - `product`
- convert memories to `rawEvents`
- generate contradiction prompts

This is where the project now supports:

1. memory-grounded interviewing
2. memory -> rawEvents
3. counter-evidence prompting

## GitHub Integration

File:

- `src/integrations/githubProfile.mjs`

Purpose:

- fetch public GitHub profile and repos
- infer project type, inclination, activity level
- optionally fetch README and representative source files
- optionally call an OpenAI-compatible LLM API to summarize technical depth, product maturity, resume bullets, career signals, and risks

Used APIs:

- `GET https://api.github.com/users/:username`
- `GET https://api.github.com/users/:username/repos`
- `GET https://api.github.com/repos/:owner/:repo/readme`
- `GET https://api.github.com/repos/:owner/:repo/git/trees/:branch?recursive=1`
- raw GitHub file URLs for small source samples

What it returns:

- normalized profile info
- normalized repo evidence for profile and resume generation
- `projectAnalysis` when README/source analysis is enabled

LLM configuration:

Do not hardcode API keys in input files, source code, or committed environment files. The public frontend expects each user to paste their own API key in the API settings panel at runtime.

Runtime requests may pass `llm.apiKey` from the UI:

```json
{
  "llm": {
    "enabled": true,
    "apiKey": "user-provided-key"
  },
  "githubAnalysis": {
    "enabled": true,
    "analysisRepoLimit": 3
  },
  "interview": {
    "llmQuestionEnabled": true
  },
  "storage": {
    "enabled": true,
    "llmDecisionEnabled": true
  }
}
```

If `GITHUB_TOKEN` is present, GitHub requests use it for higher rate limits. Private repository analysis is not required for the default product flow.

## Storage Layer

Files:

- `src/storage/profileRepository.mjs`

Purpose:

- persist profile records as JSON
- persist only key long-term information instead of every small raw record

What gets stored:

- `profile`
- `profileSummary`
- `resumeSnapshot`
- filtered `transcript`
- `conversationHighlights`
- filtered `rawEvents`
- `keyEvents`
- `progressSignals`
- compact `state`
- compact `interviewBoard`
- compact `githubSync`
- compact `airjelly`

Storage policy:

- long-term important events are kept
- low-value noisy events are filtered out
- each event is scored for importance before storage
- synthesized key events such as decision weights, five-year goal, and current primary path are always considered for storage
- only high-signal transcript turns are kept as conversation highlights
- if `storage.llmDecisionEnabled` or global `llm.enabled` is true, an LLM can promote stable high-value conversation turns into long-term storage
- AirJelly / GitHub / orchestrator state are stored as summaries rather than full working payloads

How to enable:

Set this in input:

```json
{
  "storage": {
    "enabled": true,
    "dir": "./data/profiles"
  }
}
```

## Reserved Interfaces

These are the main extension points intentionally left in the project.

### `MarketDataProvider`

File:

- `src/contracts/marketDataProvider.mjs`

Purpose:

- abstract the third board
- allow crawler output, job board output, or research trend output to plug in later
- keep `MarketSearchSkill` independent from the actual upstream data source

Current implementation:

- `StaticSnapshotMarketProvider`

Future implementations can include:

- `CrawlerMarketProvider`
- `JobBoardMarketProvider`
- `ResearchTrendProvider`
- `RegionalPolicyMarketProvider`

Expected method:

```js
async getLandscape({
  targetYear,
  targetDomains,
  targetRoles,
  profile,
})
```

### Example input contract

Defined by:

- `src/types.mjs`

Typical shape:

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
  },
  "airjelly": {
    "enableSemanticSearch": false,
    "memoryWindowDays": 30,
    "eventWindowDays": 14,
    "semanticQueryLimit": 2
  }
}
```

### Example output contract

The orchestrator returns either:

- `needs_interview`
- `ready`

Common output fields:

- `status`
- `nextQuestion`
- `interviewBoard`
- `profile`
- `profileSummary`
- `resumeSnapshot`
- `contradictions`
- `airjelly`
- `githubSync`
- `storage`

Important profile fields now include:

- `decisionWeights`
- filtered long-term `rawEvents`
- AirJelly-derived behavior evidence
- `conversationHighlights`

If `status === "ready"`, it also includes:

- `marketLandscape`
- `comparison`
- `followUpQuestion`

## Project Structure

- `package.json`: local scripts and Node requirements.
- `src/index.mjs`: CLI entrypoint for demo output.
- `src/orchestrator.mjs`: main runtime coordinator.
- `src/types.mjs`: default schema and helpers.
- `src/skills/deepInterviewSkill.mjs`: interview skill.
- `src/skills/profileUpdateSkill.mjs`: profile-building skill.
- `src/skills/marketSearchSkill.mjs`: market-search skill.
- `src/skills/pathCompareSkill.mjs`: path-comparison skill.
- `src/integrations/githubProfile.mjs`: GitHub evidence fetcher.
- `src/integrations/airjellySdk.mjs`: SDK-based AirJelly collector.
- `src/integrations/airjellyCli.mjs`: CLI-based AirJelly collector.
- `src/integrations/airjellyAnalysis.mjs`: AirJelly normalization and contradiction logic.
- `src/contracts/marketDataProvider.mjs`: market provider interface.
- `src/storage/profileRepository.mjs`: JSON storage.
- `src/data/trendSnapshots.mjs`: mock market data and default paths.
- `src/utils/scoring.mjs`: scoring helpers.
- `src/utils/format.mjs`: terminal formatting helpers.
- `examples/hkust-case.json`: balanced PhD demo case.
- `examples/onboarding-empty.json`: cold-start interview case.
- `docs/TECHNICAL_ROUTE.md`: longer design explanation.

## Quick Start

This repo runs on plain Node 22.

```bash
cd "/Users/zhiyuan/Documents/黑客松/ambitionist-agent"
node ./src/index.mjs demo ./examples/hkust-case.json
```

You can also run:

```bash
node ./src/index.mjs plan ./examples/hkust-case.json
node ./src/index.mjs interview ./examples/hkust-case.json
node ./src/index.mjs profile ./examples/hkust-case.json
node ./src/index.mjs interview ./examples/onboarding-empty.json
```

## Demo Guide

### Demo 1: proactive onboarding

```bash
node ./src/index.mjs interview ./examples/onboarding-empty.json
```

Shows:

- missing checklist
- proactive interview agenda
- weight-aware questions
- next question
- storage path

### Demo 2: profile and recommendation

```bash
node ./src/index.mjs demo ./examples/hkust-case.json
```

Shows:

- profile summary
- resume snapshot
- AirJelly context
- weight-aware recommendation inputs
- market landscape
- ranked path comparison
- final recommendation

### Demo 3: profile-only view

```bash
node ./src/index.mjs profile ./examples/hkust-case.json
```

Shows:

- normalized structured profile
- resume snapshot
- interview board

## AirJelly APIs Worth Adding Next

These are the next best APIs to plug in, and where they should go.

- `getTask(id)`
  - layer: `orchestrator` or future task-analysis layer
  - use: enrich one important ongoing task before a targeted follow-up

- `getTaskList(params)`
  - layer: AirJelly integration layer
  - use: distinguish short-term execution from long-term strategic effort

- `getAppSessions(date)`
  - layer: AirJelly integration layer
  - use: recover session rhythm, focus switching, and fragmentation

- `listPersons()` / `getEventsForEntity()`
  - layer: future social-context layer
  - use: understand mentors, collaborators, advisors, and repeated people context

- `getRecordingStatus()` / `getRecordingStats()`
  - layer: demo ops / health layer
  - use: confirm the AirJelly data source is live during a demo

## Notes

- `MarketSearchSkill` currently uses curated snapshots so the demo is stable.
- `PathCompareSkill` is intentionally rule-based so judges can see explicit logic.
- `DeepInterviewSkill` and `ProfileUpdateSkill` are already structured so an LLM can be inserted later without changing the architecture.
