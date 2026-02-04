# TimeCamp CLI

Simple CLI app to perform TimeCamp API actions from the terminal.

## Requirements

- Node.js 16+
- `TIMECAMP_API_KEY` set in your environment

## Install

```bash
npm install
```

You can also use `pnpm install` or `bun install`.

## Usage

```bash
node bin/timecamp.js --help
```

Example commands:

```bash
export TIMECAMP_API_KEY="your-api-key"

# Start/stop/status
node bin/timecamp.js start --task "Project A" --note "Daily standup"
node bin/timecamp.js stop
node bin/timecamp.js status

# Time entries (defaults to today)
node bin/timecamp.js entries
node bin/timecamp.js entries --from 2026-02-01 --to 2026-02-04
node bin/timecamp.js entries --date 2026-02-04 --task 12345

# Add a time entry
node bin/timecamp.js add-entry --date 2026-02-04 --start 09:00 --end 10:30 --duration 5400 --task "Project A"

# Update a time entry
node bin/timecamp.js update-entry --id 101234 --description "Updated description" --duration 3600

# Remove a time entry
node bin/timecamp.js remove-entry --id 101234

# List tasks (cached)
node bin/timecamp.js tasks
node bin/timecamp.js tasks --refresh
```

## Task selector

Use task id or any part of the task name:

- `--task 12345`
- `--task "Project A"`
- `--task "backend"`

If the selector matches multiple tasks, the command fails with a list of matches.

## Task cache

Tasks are cached in `~/.timecamp-cli/tasks-cache.json` and refreshed every 10 minutes.
