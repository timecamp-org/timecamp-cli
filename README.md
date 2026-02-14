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

## Global install (from repo)

To make `timecamp` available globally from this local repo:

```bash
npm link
```

Or, install it globally directly from the repo folder:

```bash
npm install -g .
```

## Usage

```bash
timecamp --help
```

Example commands:

```bash
export TIMECAMP_API_KEY="your-api-key"

# Start/stop/status
timecamp start --task "Project A" --note "Daily standup"
timecamp stop
timecamp status

# Time entries (defaults to today)
timecamp entries
timecamp entries --from 2026-02-01 --to 2026-02-04
timecamp entries --date 2026-02-04 --task 12345
timecamp entries --all-users --from 2026-02-01 --to 2026-02-04

# Add a time entry
timecamp add-entry --date 2026-02-04 --start 09:00 --end 10:30 --duration 5400 --task "Project A" --note "Daily standup"

# Update a time entry
timecamp update-entry --id 101234 --note "Updated description" --duration 3600

# Remove a time entry
timecamp remove-entry --id 101234

# List tasks (cached)
timecamp tasks
timecamp tasks --refresh
timecamp tasks --all-users
```

## Task selector

Use task id or any part of the task name:

- `--task 12345`
- `--task "Project A"`
- `--task "backend"`

If the selector matches multiple tasks, the command fails with a list of matches.

## Task cache

Tasks are cached in `~/.timecamp-cli/tasks-cache.json` and refreshed every 10 minutes.

## Compile executable (bun)

To build a standalone executable with Bun:

```bash
bun build ./bin/timecamp.js --compile --outfile timecamp
```

You can also cross-compile by adding a target:

```bash
bun build ./bin/timecamp.js --compile="bun-darwin-arm64" --outfile timecamp
```

## License

MIT