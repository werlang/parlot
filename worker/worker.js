const { spawn } = require('child_process');
const fs = require('fs');
const fetch = require('node-fetch');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

const config = {
    path: 'config.json',
    
    wsserver: {
        url: 'parlot.tk',
        secure: true,
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
        const protocol = this.wsserver.secure ? 'https' : 'http';
        const serverPort = this.wsserver.serverPort ? `:${this.wsserver.serverPort}` : '';
        const res = await fetch(`${ protocol }://${ this.wsserver.url }${ serverPort }/randomname`);
        const data = await res.json();
        
        const info = this.get();
        info.name = data.name;
        this.save(info);
        return data.name;
    }
}

if (config.get().production === false) {
    config.wsserver.secure = false;
    config.wsserver.url = 'localhost';
    config.wsserver.port = 4210;
    config.wsserver.serverPort = 4200;
}

const socket = require('./wsclient.js')( config.wsserver );

(async () => {
    await new Promise(resolve => {
        const cfg = config.get();
        if (cfg.room && cfg.room != "ROOM_NAME") {
            resolve(cfg.room);
            return;
        }
    
        console.log('Welcome to Parlot. This is the worker client, and it is used to allow admins to take control over your machine. Only proceed if you agree and know what you are doing.\n');
    
        readline.question(`Please inform the name of the room you wish to join: `, room => {
            cfg.room = room;
            config.save(cfg);
            console.log(`Joined room ${ room }\n`);
            resolve(cfg.room);
        });
    });

    await new Promise(resolve => {
        const cfg = config.get();
        if (config.get().name && config.get().name != "WORKER_NAME") {
            resolve(cfg.name);
            return;
        }
    
        console.log('Now we will set up the name your machine will be known for. If you don\'t want to set any, leave it blank and I will choose one for you.\n')
    
        readline.question(`Please inform this worker's name: `, name => {
            const setName = name => {
                cfg.name = name;
                config.save(cfg);
                console.log(`From now on this worker will be known as ${ name }!\n`);
                resolve(name);    
            }

            if (name === '') {
                config.createName().then(name => setName(name));
                return;
            }
            setName(name);
        });
    });

    await socket.connect();

    socket.emit('server', {
        action: 'set name',
        name: config.get().name,
    });

    socket.join(config.get().room, async (data, sender) => executeCommand(data));
    socket.join('self', async (data, sender) => executeCommand(data));

    readline.close();
})();



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