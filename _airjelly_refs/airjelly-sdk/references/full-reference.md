# AirJelly SDK — Full Reference

Complete capability mapping and all method signatures for `@airjelly/sdk`.

## Capability Map (SDK ↔ CLI ↔ Server RPC)

| SDK Method | CLI Command | Server RPC Method | Cost/Side-Effect |
|---|---|---|---|
| `healthCheck()` | `status` | `GET /health` | — |
| `getCapabilities()` | `capabilities` | `GET /capabilities` | — |
| `assertCompatible()` | — | `GET /capabilities` + version check | throws on mismatch |
| `rpc<T>()` | — | any method | raw escape hatch |
| `getEventsByDate()` | `memory events` | `listEvents` | — |
| `searchMemory()` | `memory search` | `searchMemory` | 💰 embedding credit |
| `listMemories()` | `memory list` | `listMemories` | — |
| `getMemory()` | `memory get` | `getMemory` | — |
| `resolveScreenshotPaths()` | (internal) | `resolveScreenshotPaths` | — |
| `listPersons()` | `memory persons` | `listPersons` | — |
| `getEventsForEntity()` | `memory entity` | `getEventsForEntity` | — |
| `getTask()` | `task get` | `getTask` | — |
| `getTaskList()` | `task list` | `listTasks` | — |
| `getOpenTasks()` | `task open` | `listOpenTasks` | — |
| `getTaskMemories()` | `task memories` | `getTaskMemories` | — |
| `createTask()` | `task create` | `createTask` | 💰 embedding credit |
| `updateTask()` | `task update` | `updateTask` | — |
| `completeTask()` | `task complete` | `completeTask` | — |
| `reopenTask()` | `task reopen` | `reopenTask` | — |
| `snoozeTask()` | `task snooze` | `snoozeTask` | — |
| `archiveTask()` | `task archive` | `archiveTask` | — |
| `unarchiveTask()` | `task unarchive` | `unarchiveTask` | — |
| `getDailyAppUsage()` | `apps today` | `getDailyAppUsage` | — |
| `getAppUsageRange()` | `apps usage` | `getAppUsageRange` | — |
| `getTopApps()` | `apps top` | `getTopApps` | — |
| `getAppSessions()` | `apps sessions` | `getAppSessions` | — |
| `getAppIcons()` | (not in CLI) | `getAppIcons` | — |
| `dismissReminder()` | `reminder dismiss` | `dismissReminder` | — |
| `snoozeReminder()` | `reminder snooze` | `snoozeReminder` | — |
| `getRecordingStatus()` | `recording status` | `getRecordingStatus` | — |
| `getRecordingPermissions()` | `recording permissions` | `getRecordingPermissions` | — |
| `getRecordingStats()` | `recording stats` | `getRecordingStats` | — |
| `startRecording()` | (not in CLI) | `startRecording` | ⚠️ starts data capture |
| `stopRecording()` | (not in CLI) | `stopRecording` | ⚠️ stops ALL capture |

---

## All 34 Method Signatures

```ts
// Connection & metadata (4)
rpc<T = unknown>(method: string, args?: unknown[]): Promise<T>
healthCheck(): Promise<HealthCheckResult>
getCapabilities(): Promise<CapabilitiesResult>   // cached internally
assertCompatible(): Promise<CapabilitiesResult>  // throws AirJellyApiVersionMismatchError

// Tasks — read (4)
getTask(id: string): Promise<TaskData | null>
getTaskList(params?: GetTasksParams): Promise<TaskData[]>
getOpenTasks(limit?: number): Promise<TaskData[]>          // default limit 20
getTaskMemories(taskId: string): Promise<TaskMemoryData[]>

// Tasks — write (7)
createTask(input: CreateTaskInput): Promise<TaskData | null>
updateTask(id: string, input: UpdateTaskInput): Promise<TaskData | null>
completeTask(id: string): Promise<TaskData | null>
reopenTask(id: string): Promise<TaskData | null>
snoozeTask(id: string, untilMs: number): Promise<TaskData | null>
archiveTask(id: string): Promise<TaskData | null>
unarchiveTask(id: string): Promise<TaskData | null>

// Memory (5)
searchMemory(query: string, options?: MemorySearchOptions): Promise<MemoryItem[]>
listMemories(options?: MemoryListOptions): Promise<MemoryItem[]>
getMemory(id: string): Promise<MemoryItem | null>
resolveScreenshotPaths(ids: string[]): Promise<Record<string, string>>
getEventsByDate(startTimeMs: number, endTimeMs: number): Promise<EventMemoryData[]>

// Knowledge / People (2)
listPersons(): Promise<PersonEntity[]>
getEventsForEntity(entityId: string): Promise<PersonEvent[]>

// App Usage (5)
getDailyAppUsage(date: string): Promise<AppUsageAggregation[]>              // date: YYYY-MM-DD
getAppUsageRange(startDate: string, endDate: string): Promise<DailyAppUsageAggregation[]>
getTopApps(startDate: string, endDate: string, limit?: number): Promise<AppUsageAggregation[]>
getAppSessions(date: string): Promise<AppUsageSession[]>
getAppIcons(appNames: string[]): Promise<Record<string, string | null>>

// Reminders (2)
dismissReminder(id: number): Promise<void>
snoozeReminder(id: number, durationMinutes: number): Promise<void>

// Screen Recording (5)
getRecordingStatus(): Promise<ScreenRecordingStatus>
getRecordingPermissions(): Promise<boolean>
getRecordingStats(): Promise<RecordingStats>
startRecording(): Promise<ScreenRecordingStatus>   // ⚠️ side effect
stopRecording(): Promise<ScreenRecordingStatus>    // ⚠️ side effect
```

---

## Protocol Notes

- Server bound to `127.0.0.1:<random port>`. Port + token auto-discovered from `runtime.json`.
- `createClient()` — no args means auto-discover. Pass `{ port, token }` to override.
- `SUPPORTED_API_VERSIONS = ['1']`. Adding methods doesn't bump the version.
- Method not found → `AirJellyMethodNotSupportedError` (user needs to upgrade Desktop).

---

## Intentionally Unavailable

| Capability | Reason |
|---|---|
| Memory writes (`editMemory`, `deleteMemory`) | Permanently excluded — prompt injection risk |
| Task deletion (`deleteTask`) | Permanently excluded — use `archiveTask` |
| Reminder listing | No public endpoint — IDs come from Desktop app |
| External agent session methods | Removed in v1 |
| Daily feed (`getDailySummary` etc.) | Removed in v1 |

---

## Support

- Bug reports / questions: **support@airjelly.ai**
- Security issues (private): **security@airjelly.ai**
