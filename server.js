const net = require('net');
const EventEmitter = require('events');
const { Command } = require('./command');
const { getAOLog, appendWriteToLog } = require('./persistence');
const { ReplicationClient } = require('./replicationClient');
const { ReplicationServer } = require('./replicationServer');

class KVServer extends EventEmitter {
  constructor(port = 4141, useReplication = false, slaveOf = null) {
    super();
    this.memstore = new Map();
    this.host = 'localhost'
    this.port = port;
    this.useReplication = useReplication
    this.replicationServer = new ReplicationServer();
    this.replicationClient = new ReplicationClient(this.host, port, slaveOf);
  }

  async restoreMemStore() {
    try {
      console.log('===========Restoring database from AOF log===========');

      const data = await getAOLog();
      const lines = data.split('\n').filter(line => line.trim());

      for (const line of lines) {
        const cmdLine = line.split('] ')[1];
        if (cmdLine) {
          const command = new Command(cmdLine, this.memstore);
          const response = command.execute();
          console.log(cmdLine, response);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error restoring from AOF:', error);
      }
    }
  }

  async start() {
    // console.log('memstore', this.memstore);
    await this.restoreMemStore();

    if (this.useReplication) {
      console.log('Slave: Init Replication')
      await this.replicationClient.initReplication(this.memstore);
    }

    const server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    server.listen(this.port, () => {
      console.log(`Server is listening for requests on :${this.port}`);
    });
  }

  handleConnection(socket) {
    console.log(`[${socket.remoteAddress}:${socket.remotePort}]: Client Connected`);

    socket.on('data', async (data) => {
      const cmdLine = data.toString().trim();
      const command = new Command(cmdLine, this.memstore, this.replicationServer, this.useReplication, socket);

      const response = await command.execute();
      socket.write(response + '\n');

      // Async persistence
      setImmediate(() => appendWriteToLog(command));
      setImmediate(() => this.replicationServer.replicateToFollowers(cmdLine));
    });

    socket.on('close', () => {
      console.log(`[${socket.remoteAddress}:${socket.remotePort}]: Client disconnected`);
    });
  }
}

const PORT = process.argv[2] || 4141;
const useReplication = process.argv[3] || false;
const slaveOf = process.argv[4] || null;

const kvServer = new KVServer(PORT, useReplication, slaveOf);
kvServer.start();
