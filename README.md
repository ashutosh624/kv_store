# KV Store

A Redis-like key-value store with replication and persistence capabilities.

## Features

- **In-memory storage** with fast key-value operations
- **Persistence** via Append-Only File (AOF)
- **Master-Slave replication** for high availability
- **TCP protocol** for client-server communication
- **Modular architecture** for easy extension

## Supported Commands

- `GET key` - Retrieve value for key
- `SET key value` - Set key to value  
- `KEYS` - List all keys
- `PING` - Test connection
- `ECHO message` - Echo back message

## Quick Start

### Install dependencies
\`\`\`bash
npm install
\`\`\`

### Start master server
\`\`\`bash
npm start
# or
node index.js
\`\`\`

### Start slave server
\`\`\`bash
npm run start:slave
# or
node index.js --replication --role slave --master localhost --master-port 4141 --port 4142
\`\`\`

### Connect with client
\`\`\`bash
npm run client
# or
node src/client/index.js
\`\`\`

## Architecture

\`\`\`
src/
├── server/           # Server core and connection handling
├── commands/         # Command implementations
├── storage/          # Memory store and persistence
├── replication/      # Master-slave replication
├── client/           # Client implementation
├── config/           # Configuration management
└── utils/            # Utilities (logging, parsing)
\`\`\`

## Configuration

Configure via environment variables or command line arguments:

- `PORT` - Server port (default: 4141)
- `HOST` - Server host (default: localhost)
- `REPLICATION_ENABLED` - Enable replication (default: false)
- `REPLICATION_ROLE` - master|slave (default: master)
- `MASTER_HOST` - Master host for slaves
- `MASTER_PORT` - Master port for slaves
- `AOF_FILE` - Persistence file path
- `LOG_LEVEL` - Logging level (debug|info|warn|error)

## Usage Examples

### Master-Slave Setup
\`\`\`bash
# Terminal 1: Start master
node index.js --port 4141

# Terminal 2: Start slave
node index.js --replication --role slave --master localhost --master-port 4141 --port 4142

# Terminal 3: Connect client to master
node src/client/index.js localhost 4141

# Terminal 4: Connect client to slave
node src/client/index.js localhost 4142
\`\`\`

### Client Session
\`\`\`
kvstore> SET name "John Doe"
OK
kvstore> GET name
John Doe
kvstore> KEYS
name
kvstore> PING
PONG
\`\`\`

## Development

### Run with auto-reload
\`\`\`bash
npm run dev
\`\`\`

### Clean data files
\`\`\`bash
npm run clean
\`\`\`

### Run tests
\`\`\`bash
npm test
\`\`\`