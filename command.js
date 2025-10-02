const { getAOLog } = require('./persistence');
class Command {
  constructor(cmdStr, memstore, replicationServer = null, useReplication = false, socket = null) {
    console.log('memstore', memstore);
    this.cmdStr = cmdStr;
    this.memstore = memstore;
    this.replicationServer = replicationServer;
    this.socket = socket;
    this.useReplication = useReplication;
  }

  async execute() {
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
        return Array.from(this.memstore.keys()).join('\\n');
      case 'get':
        if (fields.length !== 2) return 'GET Syntax Error';
        return this.memstore.get(fields[1]) || 'Key doesnot exist';
      case 'set':
        // if (this.useReplication) return 'SET Error writing to read only follower.'
        if (fields.length !== 3) return 'SET Command Error';
        this.memstore.set(fields[1], fields[2]);
        return 'OK';
      case 'sync':
        if (fields.length !== 3) return 'SYNC Command Error';
        this.replicationServer.addFollower(fields[1], fields[2]);

        let response = "";
        try {
          console.log('===========Restoring database from AOF log===========');

          const data = await getAOLog();
          const lines = data.split('\n').filter(line => line.trim());

          
          for (const line of lines) {
            const cmdLine = line.split('] ')[1];
            if (cmdLine) {
              response += cmdLine + "\n";
            }
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            console.error('Error restoring from AOF:', error);
          }
        }
        return response;
      default:
        return 'Command Error';
    }
  }
}

module.exports = { Command };
