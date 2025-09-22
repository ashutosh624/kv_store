const net = require('net');
const readline = require('readline');

const HOST = 'localhost';
const PORT = 4141;

class KVClient {
  constructor() {
    this.socket = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(PORT, HOST, () => {
        console.log(`Connected to ${HOST}:${PORT}`);
        resolve();
      });

      this.socket.on('error', reject);
      this.socket.on('data', (data) => {
        console.log(data.toString().trim());
        this.prompt();
      });
    });
  }

  prompt() {
    this.rl.question('> ', (input) => {
      if (input.trim() === 'exit') {
        this.socket.end();
        this.rl.close();
        return;
      }

      this.socket.write(input + '\n');
    });
  }

  async start() {
    try {
      await this.connect();
      this.prompt();
    } catch (error) {
      console.error('Error connecting to server:', error);
    }
  }
}

new KVClient().start();
