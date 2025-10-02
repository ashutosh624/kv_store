const fs = require('fs').promises;
const path = require('path');
const Logger = require('../utils/logger');

class Persistence {
  constructor(config = {}) {
    this.aofFile = config.aofFile || 'data/writes.aof';
    this.enabled = config.enabled !== false;
    this.logger = new Logger('Persistence');
    this._ensureDirectoryExists();
  }

  async _ensureDirectoryExists() {
    try {
      const dir = path.dirname(this.aofFile);
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create data directory:', error);
    }
  }

  async appendCommand(command) {
    if (!this.enabled || !command.shouldPersist()) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] ${command.args.join(' ')}\n`;
      
      await fs.appendFile(this.aofFile, logEntry);
      this.logger.debug('Appended command to AOF:', command.args.join(' '));
    } catch (error) {
      this.logger.error('Failed to append to AOF:', error);
      throw error;
    }
  }

  async getAOFLog() {
    try {
      await fs.access(this.aofFile);
      const data = await fs.readFile(this.aofFile, 'utf8');
      this.logger.debug('Read AOF log');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.debug('AOF file does not exist');
        return '';
      }
      this.logger.error('Failed to read AOF:', error);
      throw error;
    }
  }

  async restoreFromAOF(memstore, commandFactory) {
    try {
      const data = await this.getAOFLog();
      if (!data) {
        this.logger.info('No AOF data to restore');
        return 0;
      }

      const lines = data.split('\n').filter(line => line.trim());
      let restoredCount = 0;

      this.logger.info('Restoring from AOF log...');

      for (const line of lines) {
        try {
          // Parse: [timestamp] command args...
          const match = line.match(/^\[.*?\] (.+)$/);
          if (match) {
            const cmdStr = match[1];
            const args = cmdStr.split(/\s+/);
            
            if (args.length > 0) {
              const command = commandFactory.create(args[0], args);
              await command.execute(memstore);
              restoredCount++;
            }
          }
        } catch (error) {
          this.logger.warn('Failed to restore command:', line, error.message);
        }
      }

      this.logger.info(`Restored ${restoredCount} commands from AOF`);
      return restoredCount;
    } catch (error) {
      this.logger.error('Failed to restore from AOF:', error);
      throw error;
    }
  }

  async close() {
    this.logger.debug('Persistence closed');
  }
}

module.exports = Persistence;