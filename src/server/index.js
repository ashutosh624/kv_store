const net = require('net');
const config = require('../config/default');
const MemStore = require('../storage/memstore');
const Persistence = require('../storage/persistence');
const ReplicationManager = require('../replication/server');
const ReplicationClient = require('../replication/client');
const ConnectionHandler = require('./connection');
const CommandFactory = require('../commands');
const Logger = require('../utils/logger');

class KVServer {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.memstore = new MemStore();
    this.persistence = null;
    this.replicationManager = null;
    this.replicationClient = null;
    this.server = null;
    this.logger = new Logger('KVServer');
  }

  async start() {
    try {
      // Initialize persistence
      if (this.config.storage.enablePersistence) {
        this.persistence = new Persistence({
          aofFile: this.config.storage.aofFile,
          enabled: true
        });

        // Restore from AOF
        await this.persistence.restoreFromAOF(this.memstore, CommandFactory);
      }

      // Initialize replication
      if (this.config.replication.enabled) {
        if (this.config.replication.role === 'master') {
          this.replicationManager = new ReplicationManager();
          this.logger.info('Started as master server');
        } else if (this.config.replication.role === 'slave') {
          this.replicationClient = new ReplicationClient({
            masterHost: this.config.replication.masterHost,
            masterPort: this.config.replication.masterPort,
            localHost: this.config.server.host,
            localPort: this.config.server.port
          });

          await this.replicationClient.initReplication(this.memstore, CommandFactory);
          this.logger.info('Initialized as slave server');
        }
      }

      // Create context for command execution
      const context = {
        persistence: this.persistence,
        replicationManager: this.replicationManager,
        replicationClient: this.replicationClient,
        config: this.config
      };

      // Start TCP server
      this.server = net.createServer((socket) => {
        new ConnectionHandler(socket, this.memstore, {...context, socket});
      });
      
      this.server.listen(this.config.server.port, this.config.server.host, () => {
        this.logger.info(`Server listening on ${this.config.server.host}:${this.config.server.port}`);
        this.logger.info(`Persistence: ${this.config.storage.enablePersistence ? 'enabled' : 'disabled'}`);
        this.logger.info(`Replication: ${this.config.replication.enabled ? this.config.replication.role : 'disabled'}`);
      });

      // Graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());

    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    this.logger.info('Shutting down server...');
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.persistence) {
      await this.persistence.close();
    }
    
    if (this.replicationClient) {
      this.replicationClient.close();
    }
    
    this.logger.info('Server shutdown complete');
    process.exit(0);
  }
}

module.exports = KVServer;