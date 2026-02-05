const { Command, Flags } = require("@oclif/core");
const {
  formatDateTime,
  getApi,
  getTasks,
  printJson,
  resolveTask,
} = require("../lib/timecamp");

class Start extends Command {
  static description = "Start a timer";

  static flags = {
    task: Flags.string({
      description: "Task id or name",
      aliases: ["task_id", "task-id"],
    }),
    note: Flags.string({
      description: "Timer note",
      aliases: ["description"],
    }),
    "started-at": Flags.string({
      description: "Start time (YYYY-MM-DD HH:MM:SS)",
      aliases: ["started_at"],
    }),
    refresh: Flags.boolean({
      description: "Refresh tasks cache before resolving task",
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(Start);
    const api = getApi();

    const taskQuery = flags.task;
    const note = flags.note;
    const startedAt = flags["started-at"];

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
}

module.exports = Start;
