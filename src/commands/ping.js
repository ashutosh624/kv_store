const BaseCommand = require('./base');

class PingCommand extends BaseCommand {
  async execute() {
    return 'PONG';
  }
}

module.exports = PingCommand;