#!/usr/bin/env node

const minimist = require('minimist');
const KVServer = require('./src/server');

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  string: ['port', 'host', 'master-host', 'master-port', 'aof-file'],
  boolean: ['replication', 'persistence', 'help'],
  alias: {
    'p': 'port',
    'h': 'host',
    'r': 'replication',
    'role': 'replication-role',
    'master': 'master-host',
    'master-port': 'master-port',
    'aof': 'aof-file',
    'help': 'help'
  },
  default: {
    port: 4141,
    host: 'localhost',
    persistence: true,
    replication: false,
    'replication-role': 'master'
  }
});

if (argv.help) {
  console.log(`
KV Store Server

Usage: node index.js [options]

Options:
  -p, --port <port>              Server port (default: 4141)
  -h, --host <host>              Server host (default: localhost)
  -r, --replication              Enable replication
  --role <role>                  Replication role: master|slave (default: master)
  --master <host>                Master host (required for slave)
  --master-port <port>           Master port (required for slave)
  --aof <file>                   AOF file path (default: data/writes.aof)
  --no-persistence               Disable persistence
  --help                         Show this help

Examples:
  node index.js                                    # Start master server on port 4141
  node index.js -p 4142                          # Start server on port 4142
  node index.js -r --role slave --master localhost --master-port 4141  # Start slave
  
Environment variables:
  PORT, HOST, REPLICATION_ENABLED, REPLICATION_ROLE, MASTER_HOST, MASTER_PORT, AOF_FILE
  `);
  process.exit(0);
}

// Override config with command line arguments
const serverConfig = {
  server: {
    port: parseInt(argv.port),
    host: argv.host
  },
  storage: {
    enablePersistence: argv.persistence,
    aofFile: argv['aof-file'] || process.env.AOF_FILE || 'data/writes.aof'
  },
  replication: {
    enabled: argv.replication || process.env.REPLICATION_ENABLED === 'true',
    role: argv['replication-role'] || process.env.REPLICATION_ROLE || 'master',
    masterHost: argv['master-host'] || process.env.MASTER_HOST,
    masterPort: argv['master-port'] ? parseInt(argv['master-port']) : (process.env.MASTER_PORT ? parseInt(process.env.MASTER_PORT) : undefined)
  }
};

// Validate slave configuration
if (serverConfig.replication.enabled && serverConfig.replication.role === 'slave') {
  if (!serverConfig.replication.masterHost || !serverConfig.replication.masterPort) {
    console.error('Error: Slave servers require --master and --master-port options');
    process.exit(1);
  }
}

// Start server
const server = new KVServer(serverConfig);
server.start();