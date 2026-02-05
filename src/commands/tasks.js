const { Command, Flags } = require("@oclif/core");
const { getApi, getTasks, printJson } = require("../lib/timecamp");

class Tasks extends Command {
  static description = "List tasks (cached for 10 minutes)";

  static flags = {
    refresh: Flags.boolean({
      description: "Refresh tasks cache",
      default: false,
    }),
    raw: Flags.boolean({
      description: "Print full task payload",
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(Tasks);
    const api = getApi();

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
}

module.exports = Tasks;
