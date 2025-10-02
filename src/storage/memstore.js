const Logger = require('../utils/logger');

class MemStore {
  constructor() {
    this.data = new Map();
    this.logger = new Logger('MemStore');
  }

  async get(key) {
    const value = this.data.get(key);
    this.logger.debug(`GET ${key} -> ${value}`);
    return value;
  }

  async set(key, value) {
    this.data.set(key, value);
    this.logger.debug(`SET ${key} = ${value}`);
    return value;
  }

  async keys() {
    const keys = Array.from(this.data.keys());
    this.logger.debug(`KEYS -> ${keys.length} keys`);
    return keys;
  }

  async delete(key) {
    const existed = this.data.delete(key);
    this.logger.debug(`DELETE ${key} -> ${existed ? 'deleted' : 'not found'}`);
    return existed;
  }

  async clear() {
    const size = this.data.size;
    this.data.clear();
    this.logger.debug(`CLEAR -> ${size} keys removed`);
    return size;
  }

  async size() {
    return this.data.size;
  }

  async exists(key) {
    return this.data.has(key);
  }
}

module.exports = MemStore;