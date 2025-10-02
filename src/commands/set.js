const BaseCommand = require('./base');

class SetCommand extends BaseCommand {
  validate() {
    return this.args.length === 3;
  }

  async execute(memstore) {
    if (!this.validate()) {
      throw new Error('SET command requires exactly 2 arguments: SET key value');
    }

    const [, key, value] = this.args;
    await memstore.set(key, value);
    return 'OK';
  }

  shouldPersist() {
    return true;
  }

  shouldReplicate() {
    return true;
  }
}

module.exports = SetCommand;