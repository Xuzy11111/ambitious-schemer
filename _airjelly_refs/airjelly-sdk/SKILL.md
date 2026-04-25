---
name: airjelly-sdk
description: Build Node.js / TypeScript applications and scripts that use the AirJelly SDK (`@airjelly/sdk`) to programmatically access the user's memories, tasks, app usage, people, screen recordings, and reminders. Use this skill whenever the user wants to: write TypeScript/JavaScript code that calls AirJelly, build a Node.js app or script on top of AirJelly data, integrate AirJelly into an existing codebase, use the SDK client directly (not the CLI), or when they mention `@airjelly/sdk`, `createClient`, `AirJellyClient`, or want to "use the SDK". Also triggers for requests like "write a script to pull my tasks", "build an app using AirJelly data", "query AirJelly from Node", "TypeScript AirJelly integration", or anything requiring programmatic/API-level access to AirJelly.
---

# AirJelly SDK Skill

`@airjelly/sdk` is the official TypeScript client for AirJelly Desktop. It connects to the local AirJelly server over HTTP and exposes all 34 methods as typed async functions — memories, tasks, app usage, people, reminders, and screen recording.

## Installation

```bash
# bun (recommended)
bun add @airjelly/sdk

# npm / pnpm / yarn also work
npm install @airjelly/sdk
```

**Prerequisite:** AirJelly Desktop must be running. The SDK auto-discovers the port and token from `runtime.json` — no manual config needed.

---

## Connecting

```typescript
import { createClient, loadRuntime, AirJellyNotRunningError } from '@airjelly/sdk'

// Auto-discover port + token from runtime.json (recommended)
const client = createClient()

// Or pass explicit port/token (e.g. from your own config)
const client = createClient({ port: 17234, token: 'your-token' })

// Verify API compatibility before making calls
await client.assertCompatible()  // throws AirJellyApiVersionMismatchError if incompatible

// Raw runtime info (port, token, pid, version)
const runtime = loadRuntime()
console.log(runtime.port, runtime.pid)
```

---

## Error Handling

Always wrap SDK calls in try/catch. Five error classes cover all failure modes:

```typescript
import {
  AirJellyNotRunningError,              // runtime.json not found — Desktop not open
  AirJellyConnectionError,              // TCP connection failed
  AirJellyRpcError,                     // Server returned { ok: false }
  AirJellyMethodNotSupportedError,      // Method not found (old Desktop version) → .method
  AirJellyApiVersionMismatchError,      // Protocol version incompatible → .serverVersion / .supportedVersions
} from '@airjelly/sdk'

try {
  const tasks = await client.getOpenTasks()
} catch (err) {
  if (err instanceof AirJellyNotRunningError) {
    console.error('AirJelly Desktop is not running.')
  } else if (err instanceof AirJellyConnectionError) {
    console.error('Connection failed — Desktop may have crashed.')
  } else if (err instanceof AirJellyMethodNotSupportedError) {
    console.error(`Method ${err.method} not available — upgrade AirJelly Desktop.`)
  } else if (err instanceof AirJellyApiVersionMismatchError) {
    console.error(`API version mismatch. Server: ${err.serverVersion}, supported: ${err.supportedVersions}`)
  } else if (err instanceof AirJellyRpcError) {
    console.error('RPC error:', err.message)
  } else {
    throw err
  }
}
```

---

## All 34 Methods

### Connection & Metadata (4)

```typescript
// Health check — returns { ok, version }
const health = await client.healthCheck()
// HealthCheckResult: { ok: boolean, version: string }

// API/app version + list of available RPC methods (result is cached internally)
const caps = await client.getCapabilities()
// CapabilitiesResult: { apiVersion, appVersion, methods: string[] }

// Assert compatible + return capabilities (throws AirJellyApiVersionMismatchError on mismatch)
await client.assertCompatible()

// Raw RPC call — escape hatch for any method
const result = await client.rpc<MyType>('someMethod', [arg1, arg2])
```

---

### Tasks — Read (4)

```typescript
// Get a task by ID
const task = await client.getTask('task_abc123')        // TaskData | null

// List tasks with filters
const tasks = await client.getTaskList({
  status: 'open',             // 'open' | 'completed' | ['open', 'completed']
  l1_scene: 'build',
  origin: 'manual',
  limit: 20,
  last_active_at_after: Date.now() - 7 * 24 * 60 * 60 * 1000,
  start_time_after: Date.now() - 30 * 86400_000,
  updated_at_after: Date.now() - 86400_000,
  scheduler_state: 'running', // or ['running', 'waiting']
  scheduler_archived: 0,
})

// Open tasks shorthand (default limit: 20)
const open = await client.getOpenTasks(10)

// Memories/events linked to a task (includes screenshot paths)
const memories = await client.getTaskMemories('task_abc123')  // TaskMemoryData[]
```

---

### Tasks — Write (7)

> ⚠️ `createTask` triggers embedding — **consumes credit**.

```typescript
// Create a task
const task = await client.createTask({
  title: 'Launch hackathon project',           // required
  description: 'Build and ship by midnight',
  l1_scene: 'build',
  due_date: new Date('2025-05-01T23:59:00').getTime(),  // epoch ms; 0 = no due date
})

// Update — only these 6 fields are writable; system fields are silently ignored
await client.updateTask('task_abc123', {
  title: 'Updated title',
  description: 'New description',
  l1_scene: 'connect',
  next_steps: ['Write tests', 'Deploy'],
  progress_summary: '70% done',
  due_date: new Date('2025-06-01').getTime(),
})

// Lifecycle
await client.completeTask('task_abc123')
await client.reopenTask('task_abc123')
await client.snoozeTask('task_abc123', Date.now() + 60 * 60 * 1000)  // snooze 1 hour
await client.archiveTask('task_abc123')
await client.unarchiveTask('task_abc123')
```

---

### Memory (5)

> ⚠️ `searchMemory` triggers embedding — **consumes credit**. All other memory methods are free.

```typescript
// Semantic search (credit cost; default limit 10, max 30)
const results = await client.searchMemory('TypeScript refactoring session', {
  memory_types: ['event', 'case'],   // 'profile'|'preference'|'entity'|'event'|'case'|'procedure'
  app_name: 'VS Code',
  task_id: 'task_abc123',
  start_time_after: Date.now() - 30 * 86400_000,
  start_time_before: Date.now(),
  limit: 10,
})

// List without semantic search (no credit cost; default limit 50, max 100)
const list = await client.listMemories({
  memory_types: ['event'],
  app_name: 'Terminal',
  start_time_after: Date.now() - 7 * 86400_000,
  limit: 100,
})

// Get single memory by ID
const memory = await client.getMemory('mem_abc123')     // MemoryItem | null

// Resolve screenshot IDs → absolute file paths
const paths = await client.resolveScreenshotPaths(['ss_abc123', 'ss_def456'])
// { 'ss_abc123': '/Users/you/.../screenshot.png', ... }

// Activity events in a time window
const events = await client.getEventsByDate(
  Date.now() - 24 * 60 * 60 * 1000,   // start (epoch ms)
  Date.now()                            // end (epoch ms)
)
```

---

### People / Knowledge Graph (2)

```typescript
// All people AirJelly has observed
const persons = await client.listPersons()
// PersonEntity[]: { id, entity_name, entity_aliases, content, merge_count, event_count }

// Events linked to a person entity
const events = await client.getEventsForEntity('ent_abc123')
// PersonEvent[]: { title, content, app_name, activity_type, outcome, source_screenshots }

// Resolve screenshot IDs from PersonEvent.source_screenshots
const paths = await client.resolveScreenshotPaths(events[0].source_screenshots)
```

---

### App Usage (5)

```typescript
// Today's usage by app
const today = await client.getDailyAppUsage('2025-04-23')
// AppUsageAggregation[]: [{ app_name, total_seconds, session_count }, ...]

// Date range aggregated by day × app
const range = await client.getAppUsageRange('2025-04-01', '2025-04-23')
// DailyAppUsageAggregation[]: [{ date, app_name, total_seconds, session_count }, ...]

// Top apps by total time
const top = await client.getTopApps('2025-04-01', '2025-04-23', 10)
// AppUsageAggregation[]

// Per-session breakdown for a day
const sessions = await client.getAppSessions('2025-04-23')
// AppUsageSession[]: [{ app_name, window_name, start_time, end_time, duration_seconds }, ...]

// App icons as base64 data URIs (or null if unavailable)
const icons = await client.getAppIcons(['VS Code', 'Slack', 'Terminal'])
// { 'VS Code': 'data:image/png;base64,...', 'Slack': null }
```

---

### Reminders (2)

> Reminder IDs are numbers — obtained from the AirJelly Desktop app or the AirJelly Agent. There is no list endpoint.

```typescript
await client.dismissReminder(42)
await client.snoozeReminder(42, 30)    // snooze 30 minutes
```

---

### Screen Recording (5)

```typescript
// Current recording state
const status = await client.getRecordingStatus()
// 'running' | 'stopped' | 'no_permission'

// Whether screen capture permission is granted
const hasPermission = await client.getRecordingPermissions()  // boolean

// Storage stats
const stats = await client.getRecordingStats()
// { totalScreenshots, totalSize (bytes), oldestDate, newestDate, byDate[] }

// ⚠️ SIDE EFFECTS — use with care
await client.startRecording()   // starts screenshot + VLM pipeline
await client.stopRecording()    // stops ALL AirJelly data collection
```

---

## TypeScript Types

All exported types (connection, memory, people, tasks, app usage, recording, error classes) are documented in **`references/types.md`**. Import them directly from `@airjelly/sdk`:

```typescript
import type {
  TaskData, MemoryItem, PersonEntity, AppUsageAggregation,
  CreateTaskInput, UpdateTaskInput, MemorySearchOptions,
  ScreenRecordingStatus, RecordingStats,
  // ...
} from '@airjelly/sdk'
```

---

## Patterns & Recipes

### Graceful startup with version check

```typescript
import { createClient, AirJellyNotRunningError, AirJellyApiVersionMismatchError } from '@airjelly/sdk'

async function connect() {
  const client = createClient()
  try {
    await client.assertCompatible()
    return client
  } catch (err) {
    if (err instanceof AirJellyNotRunningError) {
      throw new Error('Please open AirJelly Desktop and try again.')
    }
    if (err instanceof AirJellyApiVersionMismatchError) {
      throw new Error(`AirJelly Desktop needs to be updated (server API v${err.serverVersion}).`)
    }
    throw err
  }
}
```

### Productivity dashboard

```typescript
const client = createClient()
const today = new Date().toISOString().split('T')[0]

const [tasks, topApps, events] = await Promise.all([
  client.getOpenTasks(20),
  client.getTopApps(today, today, 5),
  client.getEventsByDate(Date.now() - 8 * 3600_000, Date.now()),
])

console.log('Open tasks:', tasks.length)
console.log('Top app today:', topApps[0]?.app_name, `(${Math.round((topApps[0]?.total_seconds ?? 0) / 60)}m)`)
console.log('Events last 8h:', events.length)
```

### Search memories and fetch linked screenshots

```typescript
const results = await client.searchMemory('debugging session', { limit: 5 })

for (const item of results) {
  if (item.screenshot_paths.length > 0) {
    const resolved = await client.resolveScreenshotPaths(item.screenshot_paths)
    console.log(item.title, '→', Object.values(resolved))
  }
}
```

### Auto-create tasks from a list

```typescript
const todos = ['Write unit tests', 'Update README', 'Deploy to staging']

for (const title of todos) {
  const task = await client.createTask({ title, l1_scene: 'build' })
  console.log(`Created: ${task?.id} — ${task?.title}`)
}
```

### Find all tasks worked on this week

```typescript
const weekAgo = Date.now() - 7 * 86400_000

const tasks = await client.getTaskList({
  last_active_at_after: weekAgo,
  status: ['open', 'completed'],
})

console.log(`Tasks active this week: ${tasks.length}`)
tasks.forEach(t => console.log(`  [${t.status}] ${t.title}`))
```

### Export app usage to CSV

```typescript
import { writeFileSync } from 'fs'

const data = await client.getAppUsageRange('2025-04-01', '2025-04-23')
const csv = [
  'date,app_name,total_seconds,session_count',
  ...data.map(r => `${r.date},${r.app_name},${r.total_seconds},${r.session_count}`)
].join('\n')

writeFileSync('app_usage.csv', csv)
```

### Build a knowledge graph snapshot

```typescript
const persons = await client.listPersons()

const graph = await Promise.all(
  persons.map(async (person) => {
    const events = await client.getEventsForEntity(person.id)
    return { person, events }
  })
)

graph.forEach(({ person, events }) => {
  console.log(`${person.entity_name} (${events.length} events)`)
  events.forEach(e => console.log(`  · ${e.title} [${e.activity_type}]`))
})
```

### Memory timeline for a specific app

```typescript
const memories = await client.listMemories({
  memory_types: ['event'],
  app_name: 'Figma',
  start_time_after: Date.now() - 30 * 86400_000,
  limit: 100,
})

memories
  .sort((a, b) => a.start_time - b.start_time)
  .forEach(m => {
    const date = new Date(m.start_time).toLocaleDateString()
    console.log(`[${date}] ${m.title} (${Math.round(m.duration_seconds / 60)}m)`)
  })
```

### Check recording before collecting screenshots

```typescript
const status = await client.getRecordingStatus()

if (status !== 'running') {
  console.warn(`Recording is ${status}. Screenshots may be unavailable.`)
}

const events = await client.getEventsByDate(
  Date.now() - 3600_000,
  Date.now()
)

const allIds = events.flatMap(e => e.screenshot_paths)
if (allIds.length > 0) {
  const paths = await client.resolveScreenshotPaths(allIds)
  console.log(`Found ${Object.keys(paths).length} screenshots`)
}
```

---

## More Reference

- **Full Capability Map** (SDK ↔ CLI ↔ RPC) and all **34 method signatures**: see `references/full-reference.md`.
- **All TypeScript type definitions** (with field-level comments): see `references/types.md`.

---

## Important Constraints

| What | Constraint |
|---|---|
| `searchMemory` limit | Default 10, server max **30** |
| `listMemories` limit | Default 50, server max **100** |
| Memory writes | **Not available** — memories are read-only via SDK |
| Task deletion | **Not available** — use `archiveTask` instead |
| Reminder listing | **Not available** — IDs come from Desktop app/agent |
| `startRecording` / `stopRecording` | Use with care — `stopRecording` halts all data collection |
| External agent methods | **Removed** in v1 |
| Daily feed methods | **Removed** in v1 |

---

## Protocol Notes

- Server binds to `127.0.0.1:<random port>`. Port + token written to `runtime.json` (chmod 600).
- `createClient()` with no args auto-reads `runtime.json`. Pass `{ port, token }` to override.
- `SUPPORTED_API_VERSIONS = ['1']`. Adding methods doesn't bump the version; changing semantics does.
- Method not found → `AirJellyMethodNotSupportedError` with `.method` field → tell user to upgrade Desktop.

---

## Support

- Bug reports / questions: **support@airjelly.ai**
- Security issues (private): **security@airjelly.ai**
