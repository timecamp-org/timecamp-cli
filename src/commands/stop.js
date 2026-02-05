const { Command, Flags } = require("@oclif/core");
const { getApi, printJson } = require("../lib/timecamp");

class Stop extends Command {
  static description = "Stop the current timer";

  static flags = {
    "stopped-at": Flags.string({
      description: "Stop time (YYYY-MM-DD HH:MM:SS)",
      aliases: ["stopped_at"],
    }),
  };

  async run() {
    const { flags } = await this.parse(Stop);
    const api = getApi();

    const payload = {};
    if (flags["stopped-at"]) payload.stopped_at = flags["stopped-at"];

    const response =
      Object.keys(payload).length > 0
        ? await api.timer.stop(payload)
        : await api.timer.stop();
    printJson(response);
  }
}

module.exports = Stop;
