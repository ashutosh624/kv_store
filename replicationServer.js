const net = require('net');
class ReplicationServer {
    constructor(followers = []) {
        this.followers = []
    }

    addFollower(hostname, port, socket) {
        console.log('Added follower', hostname, port)
        this.followers.push({hostname, port})
    }

    replicateToFollowers(cmdLine) {
        this.followers.forEach((follower) => {
            const fields = cmdLine.trim().split(/\s+/);
            const operation = fields[0].toLowerCase();

            if (operation === 'set' && fields.length === 3) {
                // follower.socket.write(cmdLine + '\n');
                                // follower.socket.write(cmdLine + '\n');
                const socket = net.createConnection(follower.port, follower.hostname, () => {
                        console.log(`Connected to follower ${follower.hostname}:${follower.port}`);
                });
                console.log(socket);
                socket.write(cmdLine + '\n');
                socket.end();
            }
        })
    }

}

module.exports = { ReplicationServer };
