---
name: airjelly-cli
description: Build tools and scripts that use the AirJelly CLI (`airjelly` command) to query the user's memories, tasks, app usage, screen recording status, and reminders from the terminal or shell scripts. Use this skill whenever the user wants to: automate AirJelly queries in a shell script or Makefile, pipe AirJelly data into other CLI tools, build a quick prototype using shell commands, query their memories/tasks/app usage from a terminal workflow, or any time they mention `airjelly` CLI, `@airjelly/cli`, or want to "use the CLI". Also triggers for requests to "check my tasks from terminal", "get my memories as JSON", "build a bash script with AirJelly", or anything that combines AirJelly data with shell/terminal tooling.
---

# AirJelly CLI Skill

The `airjelly` CLI is a terminal client for AirJelly Desktop. It lets you query memories, tasks, app usage, reminders, and recording status directly from the shell — perfect for scripts, pipelines, and quick one-liners.

## Installation

```bash
# Recommended: bun (faster, matches the project toolchain)
bun add -g @airjelly/cli

# Or with npm
npm install -g @airjelly/cli

# Or with npx (no install needed)
npx @airjelly/cli status
```

After install, the `airjelly` binary is available globally.

**Prerequisite:** AirJelly Desktop must be running. Check with:
```bash
airjelly status
# ✓ AirJelly v0.5.0 is running.
```

---

## Quick Reference

| Group | Commands |
|---|---|
| Connection | `status`, `capabilities` |
| Memory | `memory search`, `memory list`, `memory get`, `memory events`, `memory persons`, `memory entity` |
| Tasks | `task list`, `task get`, `task open`, `task create`, `task update`, `task complete`, `task reopen`, `task snooze`, `task archive`, `task unarchive`, `task memories` |
| App Usage | `apps today`, `apps usage`, `apps top`, `apps sessions` |
| Reminders | `reminder dismiss`, `reminder snooze` |
| Recording | `recording status`, `recording permissions`, `recording stats` |
| Web UI | `ui` |

All commands support `--help` for inline docs. All commands support `--json` for machine-readable output.

---

## Commands

### `airjelly status`

Connectivity check. No args, no options.

```bash
airjelly status
# ✓ AirJelly v0.5.0 is running.
# ✗ Cannot connect to AirJelly. Is it running?
```

---

### `airjelly capabilities`

```bash
airjelly capabilities         # Human-readable: API version + app version + method list
airjelly capabilities --json  # Raw JSON
```

| Option | Default | Description |
|---|---|---|
| `--json` | off | Raw JSON output |

---

### `airjelly memory search <query>`

Semantic search across all memories. **💰 Consumes embedding credit on every call.**

```bash
airjelly memory search "TypeScript refactoring"
airjelly memory search "meeting with design team" --types event --limit 5
airjelly memory search "React patterns" --types case,procedure --since 2025-01-01T00:00:00
airjelly memory search "deploy" --app "Terminal" --task task_abc123
airjelly memory search "standup" --until 2025-04-01T00:00:00 --json
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--types <list>` | comma-separated | all | `profile,preference,entity,event,case,procedure` |
| `--app <name>` | string | — | Filter by source app |
| `--task <id>` | string | — | Filter by task ID |
| `--since <iso>` | ISO 8601 | — | Start time |
| `--until <iso>` | ISO 8601 | — | End time |
| `--limit <n>` | number | `10` | Max results (server cap: 30) |
| `--json` | flag | off | Raw JSON output |

---

### `airjelly memory list`

List memories without semantic search. **Free — no credit cost.**

```bash
airjelly memory list
airjelly memory list --types event,case --limit 20
airjelly memory list --app "VS Code" --since 2025-04-01T00:00:00 --json
```

Same options as `memory search`, except `--limit` defaults to `50` (server cap: 100).

---

### `airjelly memory get <id>`

```bash
airjelly memory get mem_abc123
airjelly memory get mem_abc123 --json
```

| Param/Option | Description |
|---|---|
| `<id>` | Memory ID (required) |
| `--json` | Raw JSON |

---

### `airjelly memory events`

Recent activity events (past N hours).

```bash
airjelly memory events
airjelly memory events --hours 48 --limit 100 --json
```

| Option | Default | Description |
|---|---|---|
| `--hours <n>` | `24` | Look-back window |
| `--limit <n>` | `50` | Max results |
| `--json` | off | — |

---

### `airjelly memory persons`

All people/entities AirJelly has observed.

```bash
airjelly memory persons
airjelly memory persons --json
```

| Option | Description |
|---|---|
| `--json` | Raw JSON |

---

### `airjelly memory entity <entityId>`

Events linked to a specific person entity. Get entity IDs from `memory persons`.

```bash
airjelly memory entity ent_abc123
airjelly memory entity ent_abc123 --json
```

| Param/Option | Description |
|---|---|
| `<entityId>` | Entity ID (required) |
| `--json` | Raw JSON |

---

### `airjelly task list`

```bash
airjelly task list
airjelly task list --status open --limit 10 --json
airjelly task list --status completed
```

| Option | Default | Description |
|---|---|---|
| `--status <s>` | all | `open` or `completed` |
| `--limit <n>` | `20` | Max results |
| `--json` | off | — |

---

### `airjelly task get <id>`

Supports ID prefix matching.

```bash
airjelly task get task_abc123
airjelly task get abc123 --json   # prefix match works
```

| Param/Option | Description |
|---|---|
| `<id>` | Task ID or prefix (required) |
| `--json` | — |

---

### `airjelly task open`

Shorthand for listing open tasks.

```bash
airjelly task open
airjelly task open --limit 5 --json
```

| Option | Default | Description |
|---|---|---|
| `--limit <n>` | `20` | Max results |
| `--json` | off | — |

---

### `airjelly task memories <id>`

Memories/events linked to a task. `--json` output includes screenshot absolute paths.

```bash
airjelly task memories task_abc123
airjelly task memories task_abc123 --json
```

---

### `airjelly task create <title>`

**💰 Consumes embedding credit on every call.**

```bash
airjelly task create "Write hackathon README"
airjelly task create "Deploy to production" --description "Push v2 to prod server" --scene build --due 2025-05-01T18:00:00
```

| Param/Option | Default | Description |
|---|---|---|
| `<title>` | (required) | Task title |
| `--description <text>` | — | Description |
| `--scene <name>` | — | `l1_scene` (e.g. `build`, `connect`, `explore`, `sustain`) |
| `--due <iso>` | — | Due date (ISO 8601) |
| `--json` | off | — |

---

### `airjelly task update <id>`

At least one updatable field is required.

```bash
airjelly task update task_abc123 --title "New title"
airjelly task update task_abc123 --description "Updated desc" --scene connect
airjelly task update task_abc123 --next-step "Write tests" --next-step "Update docs"
airjelly task update task_abc123 --progress "50% done, auth complete" --due 2025-06-01T00:00:00
```

| Option | Description |
|---|---|
| `--title <text>` | New title |
| `--description <text>` | New description |
| `--scene <name>` | New `l1_scene` |
| `--next-step <item>` | Append a next step (repeatable — can pass multiple times) |
| `--progress <text>` | New `progress_summary` |
| `--due <iso>` | New due date (ISO 8601) |
| `--json` | — |

---

### `airjelly task complete <id>` / `task reopen <id>`

```bash
airjelly task complete task_abc123
airjelly task reopen task_abc123 --json
```

---

### `airjelly task snooze <id>`

```bash
airjelly task snooze task_abc123 --until 2025-05-01T09:00:00
```

| Option | Description |
|---|---|
| `--until <iso>` | **Required.** Snooze until this time (ISO 8601) |
| `--json` | — |

---

### `airjelly task archive <id>` / `task unarchive <id>`

```bash
airjelly task archive task_abc123
airjelly task unarchive task_abc123
```

---

### `airjelly apps today`

Today's app usage summary.

```bash
airjelly apps today
airjelly apps today --json
```

---

### `airjelly apps usage`

App usage aggregated over a date range.

```bash
airjelly apps usage
airjelly apps usage --since 2025-04-01 --until 2025-04-23
airjelly apps usage --json
```

| Option | Default | Description |
|---|---|---|
| `--since <date>` | 7 days ago | `YYYY-MM-DD` |
| `--until <date>` | today | `YYYY-MM-DD` |
| `--json` | off | — |

---

### `airjelly apps top`

Top apps ranked by total time.

```bash
airjelly apps top
airjelly apps top --since 2025-04-01 --until 2025-04-23 --limit 5 --json
```

| Option | Default | Description |
|---|---|---|
| `--since <date>` | 7 days ago | — |
| `--until <date>` | today | — |
| `--limit <n>` | `10` | Top N |
| `--json` | off | — |

---

### `airjelly apps sessions`

Per-session breakdown for a given day.

```bash
airjelly apps sessions
airjelly apps sessions --date 2025-04-20 --json
```

| Option | Default | Description |
|---|---|---|
| `--date <date>` | today | `YYYY-MM-DD` |
| `--json` | off | — |

---

### `airjelly reminder dismiss <id>`

```bash
airjelly reminder dismiss 42
```

ID is a number. Obtain it from the AirJelly Desktop app or the AirJelly Agent.

---

### `airjelly reminder snooze <id>`

```bash
airjelly reminder snooze 42 --minutes 30
```

| Option | Description |
|---|---|
| `--minutes <n>` | **Required.** Snooze duration in minutes |

---

### `airjelly recording status`

```bash
airjelly recording status
airjelly recording status --json   # 'running' | 'stopped' | 'no_permission'
```

---

### `airjelly recording permissions`

```bash
airjelly recording permissions
airjelly recording permissions --json   # true | false
```

---

### `airjelly recording stats`

Screenshot count, disk usage, date range.

```bash
airjelly recording stats
airjelly recording stats --json
```

> Note: `start` and `stop` are not exposed via CLI (side effects). Use the SDK if needed.

---

### `airjelly ui`

Launch a local web console (interactive RPC explorer).

```bash
airjelly ui                         # Opens at 127.0.0.1:17777
airjelly ui --port 18888 --no-open  # Custom port, no auto browser open
```

| Option | Default | Description |
|---|---|---|
| `--port <n>` | `17777` | Listen port (`127.0.0.1` only) |
| `--no-open` | — | Don't auto-open browser |

The process stays alive until `Ctrl+C`. Proxies `GET /capabilities` and `POST /rpc` to AirJelly Desktop. Request body max: 1 MiB.

---

## JSON Output & Shell Pipelines

Every command supports `--json`. Combine with `jq` for powerful pipelines:

```bash
# Get all open task titles
airjelly task list --status open --json | jq '[.[].title]'

# Today's top 3 apps by seconds
airjelly apps today --json | jq 'sort_by(-.total_seconds) | .[0:3] | .[] | "\(.app_name): \(.total_seconds)s"'

# Search memories and extract content
airjelly memory search "debugging session" --json | jq '.[].content'

# Count events in the last 24 hours
airjelly memory events --hours 24 --json | jq 'length'

# Open tasks with their next steps
airjelly task list --status open --json | jq '.[] | {title, next_steps}'

# All open task IDs
airjelly task list --status open --json | jq -r '.[].id'

# Tasks active in last 7 days (completed or open)
airjelly task list --json | jq '[.[] | select(.last_active_at > (now - 604800) * 1000)]'

# App usage as CSV
airjelly apps usage --json | jq -r '.[] | [.date, .app_name, (.total_seconds|tostring)] | @csv'
```

---

## Common Patterns

### Daily briefing script

```bash
#!/usr/bin/env bash
echo "=== AirJelly Daily Briefing ==="

echo ""
echo "--- Open Tasks ---"
airjelly task open --limit 5

echo ""
echo "--- Top Apps Today ---"
airjelly apps today

echo ""
echo "--- Recent Activity (last 8h) ---"
airjelly memory events --hours 8 --limit 10
```

### Batch-create tasks from a file

```bash
#!/usr/bin/env bash
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  airjelly task create "$line" --scene build
  echo "Created: $line"
done < todos.txt
```

### Export memories to CSV

```bash
airjelly memory list --types event --limit 100 --json | \
  jq -r '["title","app","duration_seconds"],
         (.[] | [.title, .app_name, (.duration_seconds|tostring)]) |
         @csv' > memory_export.csv
```

### Weekly task report

```bash
#!/usr/bin/env bash
echo "# Weekly Task Report"
echo ""
echo "## Completed"
airjelly task list --status completed --json | \
  jq -r '.[] | "- \(.title)"'
echo ""
echo "## Still Open"
airjelly task list --status open --json | \
  jq -r '.[] | "- [\(.scheduler_state)] \(.title)"'
```

### Monitor recording status in CI

```bash
status=$(airjelly recording status --json | jq -r '.')
if [ "$status" != "running" ]; then
  echo "Warning: AirJelly recording is $status"
  exit 1
fi
```

### Complete all tasks matching a keyword

```bash
#!/usr/bin/env bash
airjelly task list --status open --json | \
  jq -r '.[] | select(.title | test("hackathon"; "i")) | .id' | \
  while read -r id; do
    echo "Completing: $id"
    airjelly task complete "$id"
  done
```

---

## Error Messages

| Message | Meaning | Fix |
|---|---|---|
| `✗ Cannot connect to AirJelly. Is it running?` | Desktop not running | Open AirJelly Desktop |
| `✗ Method not found` | Desktop version too old | Upgrade AirJelly Desktop |
| `Error: at least one field must be specified` | `task update` with no fields | Pass at least one `--title`/`--description`/etc. |
| `Error: --until is required` | `task snooze` without `--until` | Add `--until <iso>` |
| `Error: --minutes is required` | `reminder snooze` without `--minutes` | Add `--minutes <n>` |

---

## Credit Cost Summary

| Operation | Cost |
|---|---|
| `memory search <query>` | 💰 embedding credit per call |
| `task create <title>` | 💰 embedding credit per call |
| Everything else | Free |

---

## More Reference

- **Full Capability Map** (CLI ↔ SDK ↔ RPC) and **Intentionally Omitted** commands: see `references/full-reference.md`.

---

## Protocol Notes

- Server binds to `127.0.0.1:<random port>`. Port + token written to `runtime.json` (chmod 600).
- `POST /rpc` body: `{ method, args }` → response: `{ ok, data }` or `{ ok: false, error }`.
- Protocol version: `PUBLIC_API_VERSION = '1'`. Adding methods doesn't bump the version; changing method semantics does.
- If Desktop is old and a method doesn't exist, CLI shows a friendly "please upgrade" message.

---

## Support

- Bug reports / questions: **support@airjelly.ai**
- Security issues (private): **security@airjelly.ai**
