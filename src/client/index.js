const net = require('net');
const readline = require('readline');
const Logger = require('../utils/logger');

class KVClient {
  constructor(options = {}) {
    this.host = options.host || process.argv[2] || 'localhost';
    this.port = options.port || process.argv[3] || 4141;
    this.socket = null;
    this.logger = new Logger('KVClient');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.port, this.host, () => {
        this.logger.info(`Connected to ${this.host}:${this.port}`);
        resolve();
      });

      this.socket.on('error', (error) => {
        this.logger.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('data', (data) => {
        const response = data.toString().replace(/\\n/g, '\n').trim();
        console.log(response);
        this.prompt();
      });

      this.socket.on('close', () => {
        this.logger.info('Connection closed');
        this.rl.close();
      });
    });
  }

  prompt() {
    this.rl.question('kvstore> ', (input) => {
      const trimmed = input.trim();
      
      if (trimmed === 'exit' || trimmed === 'quit') {
        this.disconnect();
        return;
      }

      if (trimmed === 'help') {
        this.showHelp();
        this.prompt();
        return;
      }

      if (!trimmed) {
        this.prompt();
        return;
      }

      this.sendCommand(trimmed);
    });
  }

  sendCommand(command) {
    if (this.socket && this.socket.writable) {
      this.socket.write(command + '\n');
    } else {
      console.log('Not connected to server');
      this.prompt();
    }
  }

  showHelp() {
    console.log(`
Available commands:
  GET key           - Get value for key
  SET key value     - Set key to value
  KEYS              - List all keys
  PING              - Test connection
  ECHO message      - Echo back message
  help              - Show this help
  exit/quit         - Disconnect and exit
    `);
  }

  disconnect() {
    if (this.socket) {
      this.socket.end();
    }
    this.rl.close();
  }

  async start() {
    try {
      console.log('KV Store Client');
      console.log('===============');
      console.log(`Connecting to ${this.host}:${this.port}...`);
      
      await this.connect();
      console.log('Type "help" for available commands or "exit" to quit.');
      this.prompt();
    } catch (error) {
      console.error('Failed to connect:', error.message);
      process.exit(1);
    }
  }
}

// Start client if this file is run directly
if (require.main === module) {
  const client = new KVClient();
  client.start();
}

module.exports = KVClient;