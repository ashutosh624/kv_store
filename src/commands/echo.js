const BaseCommand = require('./base');

class EchoCommand extends BaseCommand {
  validate() {
    return this.args.length >= 2;
  }

  async execute() {
    if (!this.validate()) {
      throw new Error('ECHO command requires at least 1 argument');
    }

    return this.args.slice(1).join(' ');
  }
}

module.exports = EchoCommand;