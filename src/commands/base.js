class BaseCommand {
  constructor(args, context = {}) {
    this.args = args;
    this.context = context;
    this.operation = args[0] ? args[0].toLowerCase() : '';
  }

  async execute(memstore) {
    throw new Error('Execute method must be implemented by subclass');
  }

  shouldPersist() {
    return false; // Override in write commands
  }

  shouldReplicate() {
    return false; // Override in write commands
  }

  validate() {
    return true; // Override for validation
  }

  getResponse(result) {
    return result;
  }
}

module.exports = BaseCommand;