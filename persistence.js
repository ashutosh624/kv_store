const fs = require('fs').promises;

const AOF_FILE = 'writes.aof';

async function appendWriteToLog(command) {
  const fields = command.cmdStr.trim().split(/\s+/);
  const operation = fields[0].toLowerCase();

  if (operation === 'set' && fields.length === 3) {
    const logEntry = `[${new Date().toISOString()}] ${command.cmdStr}\n`;
    try {
      await fs.appendFile(AOF_FILE, logEntry);
      console.log('Appended to disk log');
    } catch (error) {
      console.error('Error writing to AOF:', error);
    }
  }
}

async function getAOLog() {
  try {
    await fs.access(AOF_FILE);

    return await fs.readFile(AOF_FILE, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error restoring from AOF:', error);
    }
  }
}

module.exports = { appendWriteToLog, getAOLog };
