const GetCommand = require('./get');
const SetCommand = require('./set');
const PingCommand = require('./ping');
const EchoCommand = require('./echo');
const KeysCommand = require('./keys');
const SyncCommand = require('./sync');

class CommandFactory {
  static commands = {
    'get': GetCommand,
    'set': SetCommand,
    'ping': PingCommand,
    'echo': EchoCommand,
    'keys': KeysCommand,
    'sync': SyncCommand
  };

  static create(operation, args, context = {}) {
    const CommandClass = this.commands[operation.toLowerCase()];
    
    if (!CommandClass) {
      throw new Error(`Unknown command: ${operation}`);
    }

    return new CommandClass(args, context);
  }

  static isValidCommand(operation) {
    return operation.toLowerCase() in this.commands;
  }

  static getAvailableCommands() {
    return Object.keys(this.commands);
  }
}

module.exports = CommandFactory;