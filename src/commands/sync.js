const BaseCommand = require('./base');

class SyncCommand extends BaseCommand {
  validate() {
    return this.args.length === 3;
  }

  async execute(memstore, context) {
    if (!this.validate()) {
      throw new Error('SYNC command requires exactly 2 arguments: SYNC hostname port');
    }

    const [, hostname, port] = this.args;
    
    // Add follower to replication server
    if (context.replicationServer) {
      context.replicationServer.addFollower(hostname, parseInt(port));
    }

    // Return AOF log for initial sync
    if (context.persistence) {
      try {
        const aofData = await context.persistence.getAOFLog();
        return aofData || '';
      } catch (error) {
        return '';
      }
    }

    return '';
  }
}

module.exports = SyncCommand;