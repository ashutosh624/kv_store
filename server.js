const net = require('net');
const EventEmitter = require('events');
const { Command } = require('./command');
const { restoreMemStore, appendWriteToLog } = require('./persistence');
const Replication = require('./replication')

class KVServer extends EventEmitter {
  constructor(port = 4141, replication = false, slaveOf = null) {
    super();
    this.memstore = new Map();
    this.host = 'localhost'
    this.port = port;
    this.replication = replication
    this.slaveOf = slaveOf;
    this.replication = new Replication();
  }

  async start() {
    await restoreMemStore(this.memstore);

    if (this.replication && this.slaveOf != null) {
        await this.initReplication();
    }

    const server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    server.listen(this.port, () => {
      console.log(`Server is listening for requests on :${this.port}`);
    });
  }

  initReplication() {
    console.log('Slave Of', this.slaveOf)
    this.socket = net.createConnection(this.slaveOf, this.slaveOf, () => {
      console.log(`Connected to master ${this.slaveOf}`);
      this.socket.write(`SYNC ${this.host} ${this.port}`)
    });

    this.socket.on('error', reject);
    this.socket.on('data', (data) => {
      console.log('Replication log', data)
        // console.log(data.toString().replace(/\\n/g, '\n').trim());
        // this.prompt();
    });
  }

  handleConnection(socket) {
    console.log(`[${socket.remoteAddress}:${socket.remotePort}]: Client Connected`);

    socket.on('data', (data) => {
      const cmdLine = data.toString().trim();

      const command = new Command(cmdLine);

      const response = command.execute(this.memstore);
      socket.write(response + '\n');

      // Async persistence
      setImmediate(() => appendWriteToLog(command));
      setImmediate(() => replicateToFollowers(command));
    });

    socket.on('close', () => {
      console.log(`[${socket.remoteAddress}:${socket.remotePort}]: Client disconnected`);
    });
  }
}

const kvServer = new KVServer()
kvServer.start()
