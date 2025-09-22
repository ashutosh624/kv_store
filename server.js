const net = require('net');
const EventEmitter = require('events');
const { Command } = require('./command');
const { restoreMemStore, appendWriteToLog } = require('./persistence');

class KVServer extends EventEmitter {
  constructor() {
    super();
    this.memstore = new Map();
    this.port = 4141;
  }

  async start() {
    await restoreMemStore(this.memstore);
    
    const server = net.createServer((socket) => {
      this.handleConnection(socket);
    });

    server.listen(this.port, () => {
      console.log(`Server is listening for requests on :${this.port}`);
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
    });

    socket.on('close', () => {
      console.log(`[${socket.remoteAddress}:${socket.remotePort}]: Client disconnected`);
    });
  }
}

const kvServer = new KVServer()
kvServer.start()
