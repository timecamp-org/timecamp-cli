#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const path = require("path");
const { TimeCampAPI } = require("timecamp-api");

const TEN_MINUTES_MS = 10 * 60 * 1000;
const CACHE_DIR = path.join(os.homedir(), ".timecamp-cli");
const TASKS_CACHE_PATH = path.join(CACHE_DIR, "tasks-cache.json");

function exitWithError(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function printJson(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(date) {
  const value = date ? new Date(date) : new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function normalizeTime(value) {
  if (!value) return undefined;
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
  throw new Error(`Invalid time format: ${value}. Use HH:MM or HH:MM:SS.`);
}

function parseDurationSeconds(value) {
  if (value === undefined || value === null) return undefined;
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = raw.match(/^(\d+)([hms])$/i);
  if (!match) {
    throw new Error(
      `Invalid duration: ${value}. Use seconds or 1h/30m/45s format.`
    );
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "h") return amount * 3600;
  if (unit === "m") return amount * 60;
  return amount;
}

function computeDurationSeconds(date, startTime, endTime) {
  const start = new Date(`${date}T${startTime}`);
  const end = new Date(`${date}T${endTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Unable to parse start/end time for duration.");
  }
  const diff = end.getTime() - start.getTime();
  if (diff < 0) {
    throw new Error("End time must be after start time.");
  }
  return Math.floor(diff / 1000);
}

function readTasksCache() {
  try {
    const raw = fs.readFileSync(TASKS_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tasks)) return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

function writeTasksCache(tasks) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const payload = {
    fetchedAt: Date.now(),
    tasks,
  };
  fs.writeFileSync(TASKS_CACHE_PATH, JSON.stringify(payload, null, 2));
}

function isCacheFresh(cache) {
  return cache && Date.now() - cache.fetchedAt < TEN_MINUTES_MS;
}

function parseArgs(argv) {
  const flags = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const [key, inlineValue] = arg.slice(2).split("=");
      if (inlineValue !== undefined) {
        flags[key] = inlineValue;
        continue;
      }

      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
      continue;
    }

    if (arg === "-h") {
      flags.help = true;
      continue;
    }

    if (arg === "-v") {
      flags.version = true;
      continue;
    }

    positionals.push(arg);
  }

  return { flags, positionals };
}

function getFlag(flags, ...names) {
  for (const name of names) {
    if (flags[name] !== undefined) return flags[name];
  }
  return undefined;
}

function getApi() {
  const apiKey = process.env.TIMECAMP_API_KEY;
  if (!apiKey) {
    exitWithError("Missing TIMECAMP_API_KEY environment variable.");
  }
  return new TimeCampAPI(apiKey, { clientName: "timecamp-cli" });
}

async function fetchTasks(api) {
  const response = await api.tasks.getActiveUserTasks({
    user: "me",
    includeFullBreadcrumb: true,
  });

  if (!response || response.success === false) {
    const message =
      response?.message || response?.error || "Failed to fetch tasks.";
    throw new Error(message);
  }

  return response.data || [];
}

async function getTasks(api, { refresh = false } = {}) {
  if (!refresh) {
    const cache = readTasksCache();
    if (isCacheFresh(cache)) return cache.tasks;
  }

  const tasks = await fetchTasks(api);
  writeTasksCache(tasks);
  return tasks;
}

function resolveTask(tasks, query) {
  if (!query) return null;
  const trimmed = String(query).trim();
  const isNumeric = /^\d+$/.test(trimmed);
  const normalized = trimmed.toLowerCase();

  if (isNumeric) {
    const id = Number(trimmed);
    const direct = tasks.find((task) => Number(task.task_id) === id);
    if (direct) return direct;
  }

  const matches = tasks.filter((task) =>
    String(task.name || "").toLowerCase().includes(normalized)
  );

  if (matches.length === 0) {
    throw new Error(`No task matches "${query}".`);
  }

  if (matches.length > 1) {
    const preview = matches
      .slice(0, 10)
      .map((task) => `- ${task.task_id}: ${task.name}`)
      .join("\n");
    throw new Error(
      `Task query matched multiple tasks:\n${preview}\nRefine your query.`
    );
  }

  return matches[0];
}

function printUsage() {
  process.stdout.write(`TimeCamp CLI

Usage:
  timecamp <command> [options]

Commands:
  start --task <id|name> --note <text>         Start a timer
  stop                                        Stop the current timer
  status                                      Show current timer status
  entries [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--task <id|name>]
                                              List time entries (default today)
  add-entry --date YYYY-MM-DD --start HH:MM --end HH:MM --duration 3600
            [--note <text>] [--task <id|name>]
                                              Add a time entry
  update-entry --id <entryId> [--date YYYY-MM-DD] [--start HH:MM]
               [--end HH:MM] [--duration 3600] [--note <text>]
               [--task <id|name>]
                                              Update a time entry
  remove-entry --id <entryId>                 Remove a time entry
  tasks [--refresh] [--raw]                   List tasks (cached 10 min)

Options:
  --help, -h                                  Show help
  --version, -v                               Show version

Notes:
  - TIMECAMP_API_KEY must be set in the environment.
  - Duration accepts seconds or 1h/30m/45s format.
  - Task selectors accept task_id or part of the task name.
`);
}

async function handleStart(api, flags) {
  const taskQuery = getFlag(flags, "task", "task_id", "task-id");
  const note = getFlag(flags, "note", "description");
  const startedAt = getFlag(flags, "started_at", "started-at");

  const payload = {};
  if (taskQuery) {
    const tasks = await getTasks(api, { refresh: Boolean(flags.refresh) });
    const task = resolveTask(tasks, taskQuery);
    payload.task_id = Number(task.task_id);
  }
  if (startedAt) payload.started_at = startedAt;

  let response;
  if (note) {
    const serviceName =
      typeof api.timer.getClientName === "function"
        ? api.timer.getClientName()
        : "timecamp-cli";
    const requestPayload = {
      action: "start",
      task_id: payload.task_id,
      started_at: payload.started_at || formatDateTime(),
      note,
      service: serviceName,
    };
    response = await api.timer.makeRequest("POST", "timer", {
      json: requestPayload,
    });
  } else {
    response =
      Object.keys(payload).length > 0
        ? await api.timer.start(payload)
        : await api.timer.start();
  }
  printJson(response);
}

async function handleStop(api, flags) {
  const stoppedAt = getFlag(flags, "stopped_at", "stopped-at");
  const payload = {};
  if (stoppedAt) payload.stopped_at = stoppedAt;
  const response =
    Object.keys(payload).length > 0 ? await api.timer.stop(payload) : await api.timer.stop();
  printJson(response);
}

async function handleStatus(api) {
  const response = await api.timer.status();
  printJson(response);
}

async function handleEntries(api, flags) {
  const today = formatDate(new Date());
  const date = getFlag(flags, "date");
  let from = getFlag(flags, "from", "date_from", "date-from");
  let to = getFlag(flags, "to", "date_to", "date-to");

  if (date) {
    from = date;
    to = date;
  } else {
    if (!from && to) from = to;
    if (!to && from) to = from;
    if (!from && !to) {
      from = today;
      to = today;
    }
  }

  const taskQuery = getFlag(flags, "task", "task_id", "task-id");
  const params = {
    user_id: "me",
    user_ids: "me",
    date_from: from,
    date_to: to,
  };

  if (taskQuery) {
    const tasks = await getTasks(api, { refresh: Boolean(flags.refresh) });
    const task = resolveTask(tasks, taskQuery);
    params.task_id = String(task.task_id);
  }

  const response = await api.timeEntries.get(params);
  printJson(response);
}

async function handleAddEntry(api, flags) {
  const today = formatDate(new Date());
  const date = getFlag(flags, "date") || today;
  const startRaw = getFlag(flags, "start", "start_time", "start-time");
  const endRaw = getFlag(flags, "end", "end_time", "end-time");

  if (!startRaw || !endRaw) {
    throw new Error("add-entry requires --start and --end.");
  }

  const startTime = normalizeTime(startRaw);
  const endTime = normalizeTime(endRaw);
  let duration = parseDurationSeconds(getFlag(flags, "duration"));
  if (duration === undefined) {
    duration = computeDurationSeconds(date, startTime, endTime);
  }

  const entry = {
    date,
    duration,
    start_time: startTime,
    end_time: endTime,
  };

  const note = getFlag(flags, "note", "description");
  if (note) entry.description = note;

  const taskQuery = getFlag(flags, "task", "task_id", "task-id");
  if (taskQuery) {
    const tasks = await getTasks(api, { refresh: Boolean(flags.refresh) });
    const task = resolveTask(tasks, taskQuery);
    entry.task_id = Number(task.task_id);
  }

  const response = await api.timeEntries.create(entry);
  printJson(response);
}

async function handleUpdateEntry(api, flags, positionals) {
  const idValue = getFlag(flags, "id") || positionals[0];
  if (!idValue || !/^\d+$/.test(String(idValue))) {
    throw new Error("update-entry requires --id <entryId>.");
  }

  const data = {};
  const date = getFlag(flags, "date");
  const startRaw = getFlag(flags, "start", "start_time", "start-time");
  const endRaw = getFlag(flags, "end", "end_time", "end-time");

  if (date) data.date = date;

  if (startRaw || endRaw) {
    if (!startRaw || !endRaw) {
      throw new Error("update-entry requires both --start and --end.");
    }
    const startTime = normalizeTime(startRaw);
    const endTime = normalizeTime(endRaw);
    data.start_time = startTime;
    data.end_time = endTime;

    if (data.date) {
      data.duration = computeDurationSeconds(data.date, startTime, endTime);
    }
  }

  const durationValue = getFlag(flags, "duration");
  if (durationValue !== undefined) {
    data.duration = parseDurationSeconds(durationValue);
  }

  const note = getFlag(flags, "note", "description");
  if (note) data.description = note;

  const taskQuery = getFlag(flags, "task", "task_id", "task-id");
  if (taskQuery) {
    const tasks = await getTasks(api, { refresh: Boolean(flags.refresh) });
    const task = resolveTask(tasks, taskQuery);
    data.task_id = Number(task.task_id);
  }

  if (Object.keys(data).length === 0) {
    throw new Error("update-entry requires at least one field to update.");
  }

  const response = await api.timeEntries.update(Number(idValue), data);
  printJson(response);
}

async function handleRemoveEntry(api, flags, positionals) {
  const idValue = getFlag(flags, "id") || positionals[0];
  if (!idValue || !/^\d+$/.test(String(idValue))) {
    throw new Error("remove-entry requires --id <entryId>.");
  }
  const response = await api.timeEntries.delete(Number(idValue));
  printJson(response);
}

async function handleTasks(api, flags) {
  const tasks = await getTasks(api, { refresh: Boolean(flags.refresh) });
  if (flags.raw) {
    printJson(tasks);
    return;
  }

  const simplified = tasks.map((task) => ({
    task_id: task.task_id,
    name: task.name,
    parent_id: task.parent_id,
    archived: task.archived,
  }));
  printJson(simplified);
}

async function main() {
  const { flags, positionals } = parseArgs(process.argv.slice(2));

  if (flags.version) {
    const pkgPath = path.join(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    process.stdout.write(`${pkg.version}\n`);
    return;
  }

  const command = positionals[0];
  if (flags.help || !command) {
    printUsage();
    return;
  }

  const api = getApi();

  switch (command) {
    case "start":
      await handleStart(api, flags);
      return;
    case "stop":
      await handleStop(api, flags);
      return;
    case "status":
    case "current":
      await handleStatus(api);
      return;
    case "entries":
      await handleEntries(api, flags);
      return;
    case "add-entry":
      await handleAddEntry(api, flags);
      return;
    case "update-entry":
      await handleUpdateEntry(api, flags, positionals.slice(1));
      return;
    case "remove-entry":
      await handleRemoveEntry(api, flags, positionals.slice(1));
      return;
    case "tasks":
      await handleTasks(api, flags);
      return;
    case "help":
      printUsage();
      return;
    default:
      exitWithError(`Unknown command: ${command}\nUse --help for usage.`);
  }
}

main().catch((error) => {
  exitWithError(error instanceof Error ? error.message : String(error));
});
