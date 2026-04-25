# AirJelly CLI — Full Reference

Complete capability mapping for the `airjelly` CLI.

## Capability Map (CLI ↔ SDK ↔ Server RPC)

| CLI Command | SDK Method | Server RPC Method | Cost/Side-Effect |
|---|---|---|---|
| `status` | `healthCheck()` | `GET /health` | — |
| `capabilities` | `getCapabilities()` | `GET /capabilities` | — |
| `memory events` | `getEventsByDate()` | `listEvents` | — |
| `memory search <q>` | `searchMemory()` | `searchMemory` | 💰 embedding credit |
| `memory list` | `listMemories()` | `listMemories` | — |
| `memory get <id>` | `getMemory()` | `getMemory` | — |
| `memory persons` | `listPersons()` | `listPersons` | — |
| `memory entity <id>` | `getEventsForEntity()` | `getEventsForEntity` | — |
| (internal) | `resolveScreenshotPaths()` | `resolveScreenshotPaths` | — |
| `task list` | `getTaskList()` | `listTasks` | — |
| `task get <id>` | `getTask()` | `getTask` | — |
| `task open` | `getOpenTasks()` | `listOpenTasks` | — |
| `task memories <id>` | `getTaskMemories()` | `getTaskMemories` | — |
| `task create <title>` | `createTask()` | `createTask` | 💰 embedding credit |
| `task update <id>` | `updateTask()` | `updateTask` | — |
| `task complete <id>` | `completeTask()` | `completeTask` | — |
| `task reopen <id>` | `reopenTask()` | `reopenTask` | — |
| `task snooze <id>` | `snoozeTask()` | `snoozeTask` | — |
| `task archive <id>` | `archiveTask()` | `archiveTask` | — |
| `task unarchive <id>` | `unarchiveTask()` | `unarchiveTask` | — |
| `apps today` | `getDailyAppUsage()` | `getDailyAppUsage` | — |
| `apps usage` | `getAppUsageRange()` | `getAppUsageRange` | — |
| `apps top` | `getTopApps()` | `getTopApps` | — |
| `apps sessions` | `getAppSessions()` | `getAppSessions` | — |
| (not in CLI) | `getAppIcons()` | `getAppIcons` | — |
| `reminder dismiss <id>` | `dismissReminder()` | `dismissReminder` | — |
| `reminder snooze <id>` | `snoozeReminder()` | `snoozeReminder` | — |
| `recording status` | `getRecordingStatus()` | `getRecordingStatus` | — |
| `recording permissions` | `getRecordingPermissions()` | `getRecordingPermissions` | — |
| `recording stats` | `getRecordingStats()` | `getRecordingStats` | — |
| (not in CLI) | `startRecording()` | `startRecording` | ⚠️ starts data capture |
| (not in CLI) | `stopRecording()` | `stopRecording` | ⚠️ stops ALL capture |
| `ui` | — | — | starts local HTTP server |

---

## All CLI Options (per command)

### `airjelly status`
No options. Returns `✓ AirJelly v<version> is running.` or `✗ Cannot connect to AirJelly. Is it running?`

### `airjelly capabilities [--json]`

### `airjelly memory search <query>`
| Option | Type | Default | Description |
|---|---|---|---|
| `--types <list>` | comma-separated | all | `profile,preference,entity,event,case,procedure` |
| `--app <name>` | string | — | Filter by source app |
| `--task <id>` | string | — | Filter by task ID |
| `--since <iso>` | ISO 8601 | — | Start time |
| `--until <iso>` | ISO 8601 | — | End time |
| `--limit <n>` | number | `10` | Max results (server cap: 30) |
| `--json` | flag | off | Raw JSON output |

### `airjelly memory list`
Same options as `memory search` except `--limit` defaults to `50` (server cap: 100).

### `airjelly memory get <id>`
`--json`

### `airjelly memory persons`
`--json`

### `airjelly memory entity <entityId>`
`--json`

### `airjelly memory events`
| Option | Default | Description |
|---|---|---|
| `--hours <n>` | `24` | Look-back window |
| `--limit <n>` | `50` | Max results |
| `--json` | off | — |

### `airjelly task list`
| Option | Default | Description |
|---|---|---|
| `--status <s>` | all | `open` or `completed` |
| `--limit <n>` | `20` | Max results |
| `--json` | off | — |

### `airjelly task get <id>`
`--json` · Supports ID prefix matching.

### `airjelly task open`
`--limit <n>` (default `20`) · `--json`

### `airjelly task memories <id>`
`--json` · screenshot paths are resolved to absolute paths.

### `airjelly task create <title>`
| Option | Default | Description |
|---|---|---|
| `--description <text>` | — | Task description |
| `--scene <name>` | — | `l1_scene` (e.g. `build`, `connect`) |
| `--due <iso>` | — | Due date (ISO 8601) |
| `--json` | off | — |

### `airjelly task update <id>`
At least one field required.
| Option | Description |
|---|---|
| `--title <text>` | New title |
| `--description <text>` | New description |
| `--scene <name>` | New l1_scene |
| `--next-step <item>` | Append next step (repeatable) |
| `--progress <text>` | New progress summary |
| `--due <iso>` | New due date |
| `--json` | — |

### `airjelly task complete <id>` / `task reopen <id>` / `task archive <id>` / `task unarchive <id>`
`--json`

### `airjelly task snooze <id>`
`--until <iso>` (required) · `--json`

### `airjelly apps today`
`--json`

### `airjelly apps usage`
`--since <date>` (default 7 days ago, `YYYY-MM-DD`) · `--until <date>` (default today) · `--json`

### `airjelly apps top`
`--since <date>` · `--until <date>` · `--limit <n>` (default `10`) · `--json`

### `airjelly apps sessions`
`--date <date>` (default today, `YYYY-MM-DD`) · `--json`

### `airjelly reminder dismiss <id>`
No options. ID is a number.

### `airjelly reminder snooze <id>`
`--minutes <n>` (required)

### `airjelly recording status` / `recording permissions` / `recording stats`
`--json`

### `airjelly ui`
`--port <n>` (default `17777`) · `--no-open`

---

## Intentionally Omitted Capabilities

These exist in the SDK but are **not** exposed by the CLI:

| Capability | Reason |
|---|---|
| `recording start` / `recording stop` | Side effects — stops all data collection |
| `apps icons` | Not useful in terminal |
| Memory writes (`editMemory`, `deleteMemory`) | Permanently excluded — prompt injection risk |
| Task deletion (`deleteTask`) | Permanently excluded — use `archive` |
| Reminder listing | IDs come from Desktop app only |
| External agent session methods | Removed in v1 |
| Daily feed (`getDailySummary` etc.) | Removed in v1 |

---

## Protocol Notes

- Server bound to `127.0.0.1:<random port>`. Port + token in `runtime.json` (chmod 600).
- HTTP envelope: `POST /rpc` with `{ method, args }` → `{ ok, data }` or `{ ok: false, error }`.
- Protocol version: `PUBLIC_API_VERSION = '1'`. Adding methods doesn't bump the version; changing semantics does.
- If AirJelly Desktop is old, unknown methods return `✗ Method not found`. Tell the user to upgrade.

---

## Support

- Bug reports / questions: **support@airjelly.ai**
- Security issues (private): **security@airjelly.ai**
