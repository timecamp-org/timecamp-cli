const { Command, Flags } = require("@oclif/core");
const { getApi, printJson } = require("../lib/timecamp");

class RemoveEntry extends Command {
  static description = "Remove a time entry";

  static flags = {
    id: Flags.string({
      description: "Entry id",
    }),
  };

  static args = [
    {
      name: "id",
      description: "Entry id",
    },
  ];

  async run() {
    const { flags, args } = await this.parse(RemoveEntry);
    const api = getApi();

    const idValue = flags.id || args.id;
    if (!idValue || !/^\d+$/.test(String(idValue))) {
      this.error("remove-entry requires --id <entryId>.");
    }

    const response = await api.timeEntries.delete(Number(idValue));
    printJson(response);
  }
}

module.exports = RemoveEntry;
