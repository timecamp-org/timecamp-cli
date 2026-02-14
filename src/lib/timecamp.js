const fs = require("fs");
const os = require("os");
const path = require("path");
const { Errors } = require("@oclif/core");
const { TimeCampAPI } = require("timecamp-api");

const TEN_MINUTES_MS = 10 * 60 * 1000;
const CACHE_DIR = path.join(os.homedir(), ".timecamp-cli");
const TASKS_CACHE_PATH = path.join(CACHE_DIR, "tasks-cache.json");

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
  throw new Errors.CLIError(
    `Invalid time format: ${value}. Use HH:MM or HH:MM:SS.`,
  );
}

function parseDurationSeconds(value) {
  if (value === undefined || value === null) return undefined;
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) return Number(raw);
  const match = raw.match(/^(\d+)([hms])$/i);
  if (!match) {
    throw new Errors.CLIError(
      `Invalid duration: ${value}. Use seconds or 1h/30m/45s format.`,
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
    throw new Errors.CLIError("Unable to parse start/end time for duration.");
  }
  const diff = end.getTime() - start.getTime();
  if (diff < 0) {
    throw new Errors.CLIError("End time must be after start time.");
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

function getApi() {
  const apiKey = process.env.TIMECAMP_API_KEY;
  if (!apiKey) {
    throw new Errors.CLIError("Missing TIMECAMP_API_KEY environment variable.");
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
    throw new Errors.CLIError(message);
  }

  return response.data || [];
}

async function fetchAllTasks(api) {
  const response = await api.tasks.getAll();

  if (!response || response.success === false) {
    const message =
      response?.message || response?.error || "Failed to fetch tasks.";
    throw new Errors.CLIError(message);
  }

  return response.data || [];
}

async function getTasks(api, { refresh = false, allUsers = false } = {}) {
  if (allUsers) {
    return fetchAllTasks(api);
  }

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
    String(task.name || "")
      .toLowerCase()
      .includes(normalized),
  );

  if (matches.length === 0) {
    throw new Errors.CLIError(`No task matches "${query}".`);
  }

  if (matches.length > 1) {
    const preview = matches
      .slice(0, 10)
      .map((task) => `- ${task.task_id}: ${task.name}`)
      .join("\n");
    throw new Errors.CLIError(
      `Task query matched multiple tasks:\n${preview}\nRefine your query.`,
    );
  }

  return matches[0];
}

module.exports = {
  computeDurationSeconds,
  formatDate,
  formatDateTime,
  getApi,
  getTasks,
  normalizeTime,
  parseDurationSeconds,
  printJson,
  resolveTask,
};
