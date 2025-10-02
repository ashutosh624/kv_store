const BaseCommand = require('./base');

class GetCommand extends BaseCommand {
  validate() {
    return this.args.length === 2;
  }

  async execute(memstore) {
    if (!this.validate()) {
      throw new Error('GET command requires exactly 1 argument: GET key');
    }

    const [, key] = this.args;
    const value = await memstore.get(key);
    return value !== undefined ? value : 'Key doesnot exist';
  }
}

module.exports = GetCommand;