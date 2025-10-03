const net = require('net');
const fs = require('fs').promises;
const Logger = require('../utils/logger');

class ReplicationManager {
  constructor() {
    this.followers = [];
    this.logger = new Logger('ReplicationManager');
    this.replicationOffset = 0;
    this.replicationId = this._generateReplicationId()
  }

  addFollower(hostname, port, socket) {
    const follower = { hostname, port, id: `${hostname}:${port}`, connection: socket };
    
    // Check if already exists
    if (!this.followers.find(f => f.id === follower.id)) {
      this.followers.push(follower);
      this.logger.info(`Added follower: ${follower.id}`);
    }
  }

  removeFollower(hostname, port) {
    const id = `${hostname}:${port}`;
    const index = this.followers.findIndex(f => f.id === id);
    
    if (index !== -1) {
      this.followers.splice(index, 1);
      this.logger.info(`Removed follower: ${id}`);
    }
  }

  async replicateCommand(command) {
    if (!command.shouldReplicate() || this.followers.length === 0) {
      return;
    }

    const cmdStr = command.args.join(' ');
    this.logger.debug(`Replicating command to ${this.followers.length} followers: ${cmdStr}`);

    // Allows partial resync and command buffering.
    await this._appendToReplicationLog(cmdStr)

    const replicationPromises = this.followers.map(follower => this._sendToFollower(follower, cmdStr));

    try {
      await Promise.allSettled(replicationPromises);
    } catch (error) {
      this.logger.error('Some replications failed:', error);
    }
  }

  async _appendToReplicationLog(cmdStr) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${cmdStr}\n`;

      await fs.appendFile(`data/replication_${this.replicationId}.log`, logEntry);
      this.logger.debug('Appended command to replication log:', cmdStr);
    } catch (error) {
      this.logger.error('Failed to append to replication log:', error);
      throw error;
    }
  }

  async _sendToFollower(follower, cmdStr) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(follower.port, follower.hostname, () => {
        this.logger.debug(`Connected to follower ${follower.id}`);
        socket.write(cmdStr + '\n');
        socket.end();
        resolve();
      });

      socket.on('error', (error) => {
        this.logger.warn(`Failed to replicate to ${follower.id}:`, error.message);
        reject(error);
      });

      socket.setTimeout(5000, () => {
        socket.destroy();
        reject(new Error(`Timeout connecting to ${follower.id}`));
      });
    });
  }

  _generateReplicationId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  getFollowers() {
    return [...this.followers];
  }
}

module.exports = ReplicationManager;