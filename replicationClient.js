const fs = require('fs').promises;
const net = require('net');
const { Command } = require('./command')

const AOF_FILE = 'replication.log';

class ReplicationClient {
    constructor(host, port, slaveOf) {
        // this.followers = 
        this.host = host;
        this.port = port;
        this.slaveOf = slaveOf;
    }

    async initReplication(memstore) {
        return new Promise((resolve, reject) => {
            console.log('Follower to', this.slaveOf)
                        // Parse master connection details
            const [masterHostname, masterPortStr] = this.slaveOf.split(':');
            const masterPort = parseInt(masterPortStr);
            
            if (!masterHostname || !masterPort) {
                reject(new Error('Invalid slaveOf format. Use "hostname:port"'));
                return;
            }

            this.socket = net.createConnection(masterPort, masterHostname, () => {
                console.log(`Connected to master ${this.slaveOf}`);
                console.log(`SYNC ${this.host} ${this.port}`)
                this.socket.write(`SYNC ${this.host} ${this.port}`)
            });

            this.socket.on('error', (err) => {
                console.error(err);
            });
            this.socket.on('data', (data) => {
                memstore = new Map();
                try {
                    console.log('SYNC from master')
                    const lines = data.toString().split('\n').filter(line => line.trim());

                    for (const cmdLine of lines) {
                        const command = new Command(cmdLine, memstore);
                        const response = command.execute();
                        console.log(cmdLine, response);
                    }
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.error('Error restoring from AOF:', error);
                    }
                } finally {
                    this.socket.end();
                    resolve();
                }
            });
        });
    }

    async restoreReplicationLog(memstore) {

    }
}

module.exports = { ReplicationClient }
