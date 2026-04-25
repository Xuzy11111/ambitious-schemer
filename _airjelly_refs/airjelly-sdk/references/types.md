# AirJelly SDK — Type Definitions

All TypeScript types exported from `@airjelly/sdk`, with full field definitions.

## Import

```ts
import type {
  // Connection
  RuntimeInfo, ConnectionOptions, RpcResult, HealthCheckResult, CapabilitiesResult,
  // Memory
  EventMemoryData, MemoryItem, MemoryType, MemorySearchOptions, MemoryListOptions,
  // Knowledge
  PersonEntity, PersonEvent,
  // Tasks
  TaskData, TaskMemoryData, TaskStatus, SchedulerStatus,
  GetTasksParams, CreateTaskInput, UpdateTaskInput,
  // App Usage
  AppUsageAggregation, DailyAppUsageAggregation, AppUsageSession,
  // Recording
  ScreenRecordingStatus, RecordingStats,
} from '@airjelly/sdk'
```

---

## Connection / Protocol (5 types)

```ts
interface RuntimeInfo {
  port: number
  token: string
  pid: number
  version: string
}

interface ConnectionOptions {
  port: number
  token: string
}

interface RpcResult<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

interface HealthCheckResult {
  ok: boolean
  version: string
}

interface CapabilitiesResult {
  apiVersion: string   // protocol version — bumped only on breaking changes
  appVersion: string   // same as HealthCheckResult.version
  methods: string[]    // names of all registered RPC methods
}
```

---

## Memory (5 types)

```ts
type MemoryType = 'profile' | 'preference' | 'entity' | 'event' | 'case' | 'procedure'

interface EventMemoryData {
  id: string
  title: string
  content: string
  app_name: string
  window_name: string
  start_time: number           // epoch ms
  end_time: number             // epoch ms
  duration_seconds: number
  keywords: string[]
  entities: string[]
  screenshot_paths: string[]   // already resolved to absolute paths
  created_at: number           // epoch ms
}

interface MemoryItem {
  id: string
  memory_type: string          // MemoryType value
  title: string
  content: string
  keywords: string[]
  entities: string[]
  screenshot_paths: string[]   // raw IDs — use resolveScreenshotPaths() for absolute paths
  app_name: string
  window_name: string
  app_names: string[]
  start_time: number           // epoch ms
  end_time: number             // epoch ms
  duration_seconds: number
  task_id: string
  event_time: number           // epoch ms
  created_at: number           // epoch ms
}

interface MemorySearchOptions {
  memory_types?: MemoryType[]
  task_id?: string
  app_name?: string
  start_time_after?: number    // epoch ms
  start_time_before?: number   // epoch ms
  limit?: number               // default 10, server max 30
}

interface MemoryListOptions {
  memory_types?: MemoryType[]
  task_id?: string
  app_name?: string
  start_time_after?: number    // epoch ms
  start_time_before?: number   // epoch ms
  limit?: number               // default 50, server max 100
}
```

---

## Knowledge / People (2 types)

```ts
interface PersonEntity {
  id: string
  entity_name: string
  entity_aliases: string[]
  content: string              // summary of what AirJelly knows about this person
  merge_count: number          // how many times records were merged
  event_count: number
  created_at: number           // epoch ms
}

interface PersonEvent {
  id: string
  title: string
  content: string
  app_name: string
  window_name: string
  start_time: number           // epoch ms
  created_at: number           // epoch ms
  activity_type: string
  outcome: string
  project_context: string
  source_screenshots: string[] // raw screenshot IDs — pass to resolveScreenshotPaths()
}
```

---

## Tasks (7 types)

```ts
type TaskStatus = 'open' | 'completed'
type SchedulerStatus = 'running' | 'blocked' | 'waiting' | 'queued'

interface TaskData {
  id: string
  title: string
  description: string
  status: TaskStatus
  l1_scene: string             // e.g. 'build', 'connect', 'explore', 'sustain'
  entities: string[]
  app_names: string[]
  keywords: string[]
  start_time: number           // epoch ms — when task was first active
  end_time: number             // epoch ms
  total_duration_seconds: number
  last_active_at: number       // epoch ms
  event_count: number
  progress_summary: string
  next_steps: string[]
  origin: string               // 'auto' | 'manual'
  due_date: number             // epoch ms, 0 = no due date
  scheduler_state: SchedulerStatus
  is_commitment: number        // 1 | 0
  snoozed_until: number        // epoch ms
  blocked_reason: string
  scheduler_archived: number   // 1 | 0
  created_at: number           // epoch ms
  updated_at: number           // epoch ms
}

interface TaskMemoryData {
  id: string
  memory_type: string
  title: string
  content: string
  keywords: string[]
  entities: string[]
  screenshot_paths: string[]   // raw IDs — use resolveScreenshotPaths()
  app_name: string
  window_name: string
  app_names: string[]
  start_time: number           // epoch ms
  end_time: number             // epoch ms
  duration_seconds: number
  task_id: string
  event_time: number           // epoch ms
  created_at: number           // epoch ms
}

interface GetTasksParams {
  status?: TaskStatus | TaskStatus[]
  origin?: string
  l1_scene?: string
  limit?: number
  last_active_at_after?: number       // epoch ms
  last_active_at_before?: number      // epoch ms
  start_time_after?: number           // epoch ms
  start_time_before?: number          // epoch ms
  updated_at_after?: number           // epoch ms
  updated_at_before?: number          // epoch ms
  scheduler_state?: SchedulerStatus | SchedulerStatus[]
  scheduler_archived?: number         // 1 | 0
}

interface CreateTaskInput {
  title: string                       // required
  description?: string
  l1_scene?: string
  start_time?: number                 // epoch ms, defaults to now
  due_date?: number                   // epoch ms, 0 = no due date
}

interface UpdateTaskInput {
  // Only these 6 fields can be updated. System fields are silently ignored.
  title?: string
  description?: string
  l1_scene?: string
  next_steps?: string[]
  progress_summary?: string
  due_date?: number                   // epoch ms, 0 = clear due date
}
```

---

## App Usage (3 types)

```ts
interface AppUsageAggregation {
  app_name: string
  total_seconds: number
  session_count: number
}

interface DailyAppUsageAggregation {
  date: string             // YYYY-MM-DD
  app_name: string
  total_seconds: number
  session_count: number
}

interface AppUsageSession {
  id: number
  app_name: string
  bundle_id: string | null
  window_name: string | null
  start_time: string       // ISO 8601 string
  end_time: string | null  // ISO 8601 string
  duration_seconds: number
  date: string             // YYYY-MM-DD
  created_at: string       // ISO 8601 string
}
```

---

## Screen Recording (2 types)

```ts
type ScreenRecordingStatus = 'running' | 'stopped' | 'no_permission'

interface RecordingStats {
  totalScreenshots: number
  totalSize: number          // bytes
  oldestDate: string | null  // YYYY-MM-DD
  newestDate: string | null  // YYYY-MM-DD
  byDate: Array<{
    date: string             // YYYY-MM-DD
    count: number
    size: number             // bytes
  }>
}
```

---

## Error Classes (5)

All extend `Error` and have a `.name` property. Use `instanceof` to distinguish them.

```ts
// AirJelly Desktop not running — runtime.json not found
class AirJellyNotRunningError extends Error {}

// TCP connection failed (Desktop running but unreachable)
class AirJellyConnectionError extends Error {}

// Server returned { ok: false } — RPC-level error
class AirJellyRpcError extends Error {}

// Method not registered on server — upgrade AirJelly Desktop
class AirJellyMethodNotSupportedError extends Error {
  method: string   // which method was missing
}

// Protocol version incompatible
class AirJellyApiVersionMismatchError extends Error {
  serverVersion: string
  supportedVersions: readonly string[]
}
```

### Standard error handling pattern

```ts
import {
  AirJellyNotRunningError,
  AirJellyConnectionError,
  AirJellyRpcError,
  AirJellyMethodNotSupportedError,
  AirJellyApiVersionMismatchError,
} from '@airjelly/sdk'

try {
  await client.someMethod()
} catch (err) {
  if (err instanceof AirJellyNotRunningError) {
    // Ask user to open AirJelly Desktop
  } else if (err instanceof AirJellyConnectionError) {
    // Network-level failure
  } else if (err instanceof AirJellyMethodNotSupportedError) {
    console.error(`${err.method} not available — please upgrade AirJelly Desktop`)
  } else if (err instanceof AirJellyApiVersionMismatchError) {
    console.error(`Server API v${err.serverVersion}, SDK supports ${err.supportedVersions.join(', ')}`)
  } else if (err instanceof AirJellyRpcError) {
    // Server-side error
  } else {
    throw err  // unexpected — rethrow
  }
}
```
