const net = require('net');
const Logger = require('../utils/logger');

class ReplicationClient {
  constructor(config = {}) {
    this.masterHost = config.masterHost;
    this.masterPort = config.masterPort;
    this.localHost = config.localHost || 'localhost';
    this.localPort = config.localPort;
    this.socket = null;
    this.logger = new Logger('ReplicationClient');
  }

  async initReplication(memstore, commandFactory) {
    if (!this.masterHost || !this.masterPort) {
      throw new Error('Master host and port must be configured for replication');
    }

    return new Promise((resolve, reject) => {
      this.logger.info(`Connecting to master ${this.masterHost}:${this.masterPort}`);

      this.socket = net.createConnection(this.masterPort, this.masterHost, () => {
        this.logger.info('Connected to master server');
        
        // Send SYNC command to register as follower
        const syncCmd = `SYNC ${this.localHost} ${this.localPort}\n`;
        this.socket.write(syncCmd);
      });

      this.socket.on('error', (error) => {
        this.logger.error('Replication connection error:', error);
        reject(error);
      });

      this.socket.on('data', async (data) => {
        try {
          await this._handleMasterData(data, memstore, commandFactory);
          resolve();
        } catch (error) {
          this.logger.error('Failed to handle master data:', error);
          reject(error);
        }
      });

      this.socket.on('close', () => {
        this.logger.warn('Connection to master closed');
        this._scheduleReconnect(memstore, commandFactory);
      });

      this.socket.setTimeout(10000, () => {
        reject(new Error('Timeout connecting to master'));
      });
    });
  }

  async _handleMasterData(data, memstore, commandFactory) {
    const dataStr = data.toString();
    this.logger.debug('Received data from master for initial sync');

    // Parse and execute commands from master
    const lines = dataStr.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        // Check if it's an AOF entry: [timestamp] command
        const match = line.match(/^\[.*?\] (.+)$/);
        const cmdStr = match ? match[1] : line;
        
        if (cmdStr) {
          const args = cmdStr.split(/\s+/);
          if (args.length > 0) {
            const command = commandFactory.create(args[0], args);
            await command.execute(memstore);
            this.logger.debug('Applied replicated command:', cmdStr);
          }
        }
      } catch (error) {
        this.logger.warn('Failed to apply replicated command:', line, error.message);
      }
    }

    // Close connection after initial sync
    if (this.socket) {
      this.socket.end();
    }
  }

  _scheduleReconnect(memstore, commandFactory) {
    setTimeout(() => {
      this.logger.info('Attempting to reconnect to master...');
      this.initReplication(memstore, commandFactory).catch(error => {
        this.logger.error('Reconnection failed:', error.message);
        this._scheduleReconnect(memstore, commandFactory);
      });
    }, 5000); // Retry every 5 seconds
  }

  close() {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
  }
}

module.exports = ReplicationClient;