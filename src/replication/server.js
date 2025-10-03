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

  addFollower(socket) {
    const follower = {
      id: `${socket.remoteAddress}:${socket.remotePort}`,
      connection: socket,
      connected: true
    };

    // Remove existing follower with same ID
    this.followers = this.followers.filter(f => f.id !== follower.id);
    
    socket.on('close', () => {
      this.removeFollower(follower.id);
    });

    socket.on('error', (error) => {
      this.logger.error(`Follower ${follower.id} error:`, error);
      this.removeFollower(follower.id);
    })

    // Check if already exists
    this.followers.push(follower);
    this.logger.info(`Added follower: ${follower.id}`);
  }

  removeFollower(followerId) {
    const initialLength = this.followers.length;
    this.followers = this.followers.filter(f => f.id !== followerId);

    if (this.followers.length < initialLength) {
      this.logger.info(`Removed follower: ${followerId}`);
    }
  }


  async syncFollower(followerId, followerOffset, context) {
    this.logger.debug(`Recieved SYNC request from follower ${followerId} ${followerOffset}`)
    // Return AOF log for initial sync
    if (followerId == '?' && followerOffset == '-1' && context.persistence) {
      try {
        const aofData = await context.persistence.getAOFLog();
        // add full resync header
        const response = `+FULLRESYNC ${this.replicationId} ${this.replicationOffset}\n` + aofData
        return response || '';
      } catch (error) {
        return '';
      }
    }
  }

  async replicateCommandToFollowers(command) {
    if (!command.shouldReplicate() || this.followers.length === 0) {
      return;
    }

    const cmdStr = command.args.join(' ');
    this.logger.debug(`Replicating command to ${this.followers.length} followers: ${cmdStr}`);

    // Allows partial resync and command buffering.
    await this._appendToReplicationLog(cmdStr);
    this.replicationOffset += cmdStr.length + 1;
    this.logger.debug('Master ReplicationOffset', this.replicationOffset);

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

      await fs.appendFile(`data/replication_master_${this.replicationId}.log`, logEntry);
      this.logger.debug('Appended command to replication log:', cmdStr);
    } catch (error) {
      this.logger.error('Failed to append to replication log:', error);
      throw error;
    }
  }

  async _sendToFollower(follower, cmdStr) {
    return new Promise((resolve, reject) => {
      if (!follower.connection.writable) {
        this.removeFollower(follower.id)
        reject(new Error(`Follower ${follower.id} not writable`));
        return;
      }

      follower.connection.write(cmdStr + '\n', (error) => {
        if (error) {
          this.logger.error(`Failed to replicate to ${follower.id}:`, error);
          this.removeFollower(follower.id);
          reject(error);
        } else {
          resolve();
        }
      })
    })
    
  }

  _generateReplicationId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  getFollowers() {
    return [...this.followers];
  }
}

module.exports = ReplicationManager;