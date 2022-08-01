const { spawn } = require('child_process')
const fs = require('fs');

const socket = require('./wsclient.js');

socket.connect().then(() => {

    const config = JSON.parse(fs.readFileSync('config.json'));

    socket.join(config.room, async (data, sender) => {
        if (data.action && data.action == 'execute') {
            const res = spawn(data.command, [], { shell: true });
            
            res.stdout.on('data', data => {
                socket.emit('admin', { action: 'command', response: data.toString() });
            });
            res.stderr.on('data', data => {
                socket.emit('admin', { action: 'command', response: data.toString() });
            });
        }
        return true;
    });
});

socket.run();