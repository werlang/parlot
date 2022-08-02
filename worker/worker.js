const { spawn } = require('child_process')
const fs = require('fs');
const fetch = require('node-fetch');

const config = {
    path: 'config.json',
    
    wsserver: {
        url: 'https://parlot.tk',
        port: 4210,
    },

    get: function() {
        try {
            return JSON.parse(fs.readFileSync(this.path));
        }
        catch(error) {
            this.save({
                room: 'ROOM_NAME',
                name: 'WORKER_NAME',
            });
            return {};
        }    
    },

    save: function(file) {
        fs.writeFileSync(this.path, JSON.stringify(file));
    },

    createName: async function() {
        const info = this.get();
        const url = `${ this.wsserver.url }:${ this.wsserver.port }`;
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
else if (config.get().room == "ROOM_NAME") {
    console.log('Change the name of the room in the config.json file, or admins might take advantage of your worker.');
    return;
}

const socket = require('./wsclient.js')( config.wsserver );

socket.connect().then(async () => {
    if (!config.get().name || config.get().name == 'WORKER_NAME') {
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