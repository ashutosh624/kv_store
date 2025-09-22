const fs = require('fs').promises;
const { Command } = require('./command')

const AOF_FILE = 'replication.log';

export class Replication {

    constructor(followers = []) {
        this.followers = followers
    }

    async appendToReplicationLog(command) {
        const fields = command.cmdStr.trim().split(/\s+/);
        const operation = fields[0].toLowerCase();
        
        if (operation === 'set' && fields.length === 3) {
            const logEntry = `[${new Date().toISOString()}] ${command.cmdStr}\n`;
            try {
                await fs.appendFile(AOF_FILE, logEntry);
                console.log('Appended to replication log');
            } catch (error) {
                console.error('Error writing to replication log:', error);
            }
        }
    }

    async readFromReplicationLog(memstore) {
        try {
            await fs.access(AOF_FILE);
            console.log('===========Restoring database from AOF log===========');
            
            const data = await fs.readFile(AOF_FILE, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                const cmdLine = line.split('] ')[1];
                if (cmdLine) {
                    const command = new Command(cmdLine);
                    const response = command.execute(memstore);
                    console.log(cmdLine, response);
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error restoring from AOF:', error);
            }
        }
    }

    async restoreReplicationLog(memstore) {

    }
}

