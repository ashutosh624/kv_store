const BaseCommand = require('./base');

class SyncCommand extends BaseCommand {
  validate() {
    return this.args.length === 3;
  }

  async execute(memstore, context) {
    if (!this.validate()) {
      throw new Error('SYNC command requires exactly 2 arguments: SYNC replicationId replicationOffset');
    }

    const [, replicationId, replicationOffset] = this.args;
    
    // Add follower to replication server
    if (context.replicationManager) {
      context.replicationManager.addFollower(context.socket);
      return await context.replicationManager.syncFollower(replicationId, replicationOffset, context);
    }

    return '';
  }
}

module.exports = SyncCommand;