const { Command, Flags } = require("@oclif/core");
const {
  computeDurationSeconds,
  getApi,
  getTasks,
  normalizeTime,
  parseDurationSeconds,
  printJson,
  resolveTask,
} = require("../lib/timecamp");

class UpdateEntry extends Command {
  static description = "Update a time entry";

  static flags = {
    id: Flags.string({
      description: "Entry id",
    }),
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

  static args = [
    {
      name: "id",
      description: "Entry id",
    },
  ];

  async run() {
    const { flags, args } = await this.parse(UpdateEntry);
    const api = getApi();

    const idValue = flags.id || args.id;
    if (!idValue || !/^\d+$/.test(String(idValue))) {
      this.error("update-entry requires --id <entryId>.");
    }

    const data = {};
    const date = flags.date;
    const startRaw = flags.start;
    const endRaw = flags.end;

    if (date) data.date = date;

    if (startRaw || endRaw) {
      if (!startRaw || !endRaw) {
        this.error("update-entry requires both --start and --end.");
      }
      const startTime = normalizeTime(startRaw);
      const endTime = normalizeTime(endRaw);
      data.start_time = startTime;
      data.end_time = endTime;

      if (data.date) {
        data.duration = computeDurationSeconds(data.date, startTime, endTime);
      }
    }

    if (flags.duration !== undefined) {
      data.duration = parseDurationSeconds(flags.duration);
    }

    if (flags.note) data.description = flags.note;

    if (flags.task) {
      const tasks = await getTasks(api, { refresh: Boolean(flags.refresh) });
      const task = resolveTask(tasks, flags.task);
      data.task_id = Number(task.task_id);
    }

    if (Object.keys(data).length === 0) {
      this.error("update-entry requires at least one field to update.");
    }

    const response = await api.timeEntries.update(Number(idValue), data);
    printJson(response);
  }
}

module.exports = UpdateEntry;
