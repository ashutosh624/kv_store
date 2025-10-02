const BaseCommand = require('./base');

class KeysCommand extends BaseCommand {
  async execute(memstore) {
    const keys = await memstore.keys();
    return keys.join('\\n');
  }
}

module.exports = KeysCommand;