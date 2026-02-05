const { Command, Flags } = require("@oclif/core");
const { formatDate, getApi, getTasks, printJson, resolveTask } = require("../lib/timecamp");

class Entries extends Command {
  static description = "List time entries";

  static flags = {
    date: Flags.string({
      description: "Date in YYYY-MM-DD (overrides from/to)",
    }),
    from: Flags.string({
      description: "Start date YYYY-MM-DD",
      aliases: ["date_from", "date-from"],
    }),
    to: Flags.string({
      description: "End date YYYY-MM-DD",
      aliases: ["date_to", "date-to"],
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
    const { flags } = await this.parse(Entries);
    const api = getApi();

    const today = formatDate(new Date());
    const date = flags.date;
    let from = flags.from;
    let to = flags.to;

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

    const params = {
      user_id: "me",
      user_ids: "me",
      date_from: from,
      date_to: to,
    };

    if (flags.task) {
      const tasks = await getTasks(api, { refresh: Boolean(flags.refresh) });
      const task = resolveTask(tasks, flags.task);
      params.task_id = String(task.task_id);
    }

    const response = await api.timeEntries.get(params);
    printJson(response);
  }
}

module.exports = Entries;
