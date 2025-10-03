const CommandFactory = require('../commands');
const CommandParser = require('../utils/parser');
const Logger = require('../utils/logger');

class ConnectionHandler {
  constructor(socket, memstore, context = {}) {
    this.socket = socket;
    this.memstore = memstore;
    this.context = context;
    this.logger = new Logger(`Connection-${socket.remoteAddress}:${socket.remotePort}`);
    
    this.init();
  }

  init() {
    this.logger.info('Client connected');
    
    this.socket.on('data', (data) => {
      this.handleData(data);
    });

    this.socket.on('close', () => {
      this.logger.info('Client disconnected');
    });

    this.socket.on('error', (error) => {
      this.logger.error('Socket error:', error);
    });
  }

  async handleData(data) {
    try {
      const cmdLine = data.toString().trim();
      
      if (!cmdLine) {
        this.sendResponse('ERROR: Empty command');
        return;
      }

      // Parse command
      const parsed = CommandParser.parse(cmdLine);

      // Create command
      const command = CommandFactory.create(parsed.operation, [parsed.operation, ...parsed.args], this.context);
      
      // Execute command
      const result = await command.execute(this.memstore, this.context);
      this.sendResponse(result);

      // Handle persistence
      if (this.context.persistence && command.shouldPersist()) {
        setImmediate(() => {
          this.context.persistence.appendCommand(command).catch(error => {
            this.logger.error('Persistence failed:', error);
          });
        });
      }

      // Handle replication
      if (this.context.replicationManager && command.shouldReplicate()) {
        setImmediate(() => {
          this.context.replicationManager.replicateCommand(command).catch(error => {
            this.logger.error('Replication failed:', error);
          });
        });
      }

    } catch (error) {
      this.logger.error('Command execution error:', error);
      this.sendResponse(`ERROR: ${error.message}`);
    }
  }

  sendResponse(response) {
    if (this.socket.writable) {
      this.socket.write(response + '\n');
      this.logger.debug('Response sent:', response);
    }
  }
}

module.exports = ConnectionHandler;