const { Command, Flags } = require("@oclif/core");
const {
  computeDurationSeconds,
  formatDate,
  getApi,
  getTasks,
  normalizeTime,
  parseDurationSeconds,
  printJson,
  resolveTask,
} = require("../lib/timecamp");

class AddEntry extends Command {
  static description = "Add a time entry";

  static flags = {
    date: Flags.string({
      description: "Entry date YYYY-MM-DD",
    }),
    start: Flags.string({
      description: "Start time HH:MM or HH:MM:SS",
      aliases: ["start_time", "start-time"],
    }),
    end: Flags.string({
      description: "End time HH:MM or HH:MM:SS",
      aliases: ["end_time", "end-time"],
    }),
    duration: Flags.string({
      description: "Duration in seconds or 1h/30m/45s",
    }),
    note: Flags.string({
      description: "Entry note",
      aliases: ["description"],
    }),
    task: Flags.string({
      description: "Task id or name",
      aliases: ["task_id", "task-id"],
    }),
    refresh: Flags.boolean({
      description: "Refresh tasks cache before resolving task",
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(AddEntry);
    const api = getApi();

    const today = formatDate(new Date());
    const date = flags.date || today;
    const startRaw = flags.start;
    const endRaw = flags.end;

    if (!startRaw || !endRaw) {
      this.error("add-entry requires --start and --end.");
    }

    const startTime = normalizeTime(startRaw);
    const endTime = normalizeTime(endRaw);
    let duration = parseDurationSeconds(flags.duration);
    if (duration === undefined) {
      duration = computeDurationSeconds(date, startTime, endTime);
    }

    const entry = {
      date,
      duration,
      start_time: startTime,
      end_time: endTime,
    };

    if (flags.note) entry.description = flags.note;

    if (flags.task) {
      const tasks = await getTasks(api, { refresh: Boolean(flags.refresh) });
      const task = resolveTask(tasks, flags.task);
      entry.task_id = Number(task.task_id);
    }

    const response = await api.timeEntries.create(entry);
    printJson(response);
  }
}

module.exports = AddEntry;
