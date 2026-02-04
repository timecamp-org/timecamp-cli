# Timecamp CLI

Create simple cli app to make timecamp actions using timecamp api.

It should be easy to run using node, pnpm, bun, etc.

Actions:
- start a timer
- stop a timer
- get the current timer
- add time entry
- remove time entry
- modify time entry
- get time entries for specific date range (default is today)
- get tasks list

Tasks param should be able to use task_id or task_name or part of the name. If match is returning multiple tasks fail the script.

Cache tasks list from api and refresh every 10 minutes. If cache is expired, refresh it on next run and replace the cache.

Add simple and user friendly README.md file.

Fail script if not TIMECAMP_API_KEY is set.

Output to std.

Don't make interactive mode, just use flags and args.

Make it as simple as possible in code.

Use this library https://www.npmjs.com/package/timecamp-api

Add gitignore.