module.exports = {
  server: {
    port: process.env.PORT || 4141,
    host: process.env.HOST || 'localhost'
  },
  storage: {
    aofFile: process.env.AOF_FILE || 'data/writes.aof',
    replicationFile: process.env.REPL_FILE || 'data/replication.log',
    enablePersistence: process.env.ENABLE_PERSISTENCE !== 'false'
  },
  replication: {
    enabled: process.env.REPLICATION_ENABLED === 'true',
    role: process.env.REPLICATION_ROLE || 'master', // 'master' or 'slave'
    masterHost: process.env.MASTER_HOST,
    masterPort: process.env.MASTER_PORT
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableColors: process.env.LOG_COLORS !== 'false'
  }
};