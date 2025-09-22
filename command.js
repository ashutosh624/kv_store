class Command {
  constructor(cmdStr) {
    this.cmdStr = cmdStr;
  }

  execute(memstore) {
    const fields = this.cmdStr.trim().split(/\s+/);
    if (fields.length === 0) {
      return "Command Error";
    }

    const operation = fields[0].toLowerCase();

    switch (operation) {
      case 'echo':
        return this.cmdStr.substring(5); // Remove "echo "
      case 'ping':
        return 'PONG';
      case 'keys':
        return Array.from(memstore.keys()).join('\\n');
      case 'get':
        if (fields.length !== 2) return 'GET Syntax Error';
        return memstore.get(fields[1]) || 'Key doesnot exist';
      case 'set':
        if (fields.length !== 3) return 'SET Command Error';
        memstore.set(fields[1], fields[2]);
        return 'OK';
      default:
        return 'Command Error';
    }
  }
}

module.exports = { Command };