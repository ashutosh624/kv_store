const net = require('net');
const fs = require('fs').promises;
const Logger = require('../utils/logger');

class ReplicationClient {
  constructor(config = {}) {
    this.masterHost = config.masterHost;
    this.masterPort = config.masterPort;
    this.localHost = config.localHost || 'localhost';
    this.localPort = config.localPort;
    this.socket = null;
    this.logger = new Logger('ReplicationClient');
    this.replicationId = null;
    this.replicationOffset = 0;
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
        const syncCmd = this.replicationId ? `SYNC ${this.replicationId} ${this.replicationOffset}\n` : 'SYNC ? -1\n';
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
    this.logger.info('Received data from master for initial sync');

    if (dataStr.startsWith('+FULLRESYNC')) {
      await this._handleFullResync(dataStr, memstore, commandFactory);
    } else if (dataStr.startsWith('+CONTINUE')) {
      await this._handlePartialResync(dataStr, memstore, commandFactory);
    } else {
      // handle incremental commands
      await this._handleIncrementalData(dataStr, memstore, commandFactory, true);
    }
  }

  async _handleFullResync(dataStr, memstore, commandFactory) {
    const lines = dataStr.split('\n').filter(line => line.trim());

    if (lines.length > 0) {
      const header = lines[0]
      const parts = header.split(' ');
      if (parts.length != 3) {
        this.logger.error("Invalid header for full resync")
        return;
      }

      this.replicationId = parts[1];
      this.replicationOffset = parseInt(parts[2]);

      this.logger.info(`Starting full resync with ID: ${this.replicationId} ${this.replicationOffset}`)

      this._handleIncrementalData(lines.slice(1).join('\n'), memstore, commandFactory, false);
    }
  }

  async _handlePartialResync(dataStr, memstore, commandFactory) {

  }

  async _handleIncrementalData(dataStr, memstore, commandFactory, appendToReplicationLog) {

    // Parse and execute commands from master
    const lines = dataStr.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        // Check if it's an AOF entry: [timestamp] command
        const match = line.match(/^\[.*?\] (.+)$/);
        const cmdStr = match ? match[1] : line;
        
        if (cmdStr) {
          if (appendToReplicationLog) {
            this._appendToReplicationLog(cmdStr);
            this.replicationOffset += cmdStr.length + 1
            this.logger.debug('Follower ReplicationOffset', this.replicationOffset);
          }

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

  async _appendToReplicationLog(cmdStr) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${cmdStr}\n`;

      await fs.appendFile(`data/replication_${this.localPort}_${this.replicationId}.log`, logEntry);
      this.logger.debug('Appended command to replication log:', cmdStr);
    } catch (error) {
      this.logger.error('Failed to append to replication log:', error);
      throw error;
    }
  }

  close() {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
  }
}

module.exports = ReplicationClient;