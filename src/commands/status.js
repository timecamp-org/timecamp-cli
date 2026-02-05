const { Command } = require("@oclif/core");
const { getApi, printJson } = require("../lib/timecamp");

class Status extends Command {
  static description = "Show current timer status";

  static aliases = ["current"];

  async run() {
    const api = getApi();
    const response = await api.timer.status();
    printJson(response);
  }
}

module.exports = Status;
