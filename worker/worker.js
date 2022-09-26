const { spawn } = require('child_process');
const fs = require('fs');
const fetch = require('node-fetch');
const tar = require('tar');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

const args = {};

process.argv.forEach((val, index, array) => {
    if ((val == '-r' || val == '--room') && array[index+1]){
        args.room = array[index+1];
    }
    if ((val == '-n' || val == '--name') && array[index+1]){
        args.name = array[index+1];
    }
    if ((val == '-a' || val == '--auto')){
        args.auto = true;
    }
    if ((val == '-v' || val == '--version')){
        args.printVersion = true;
    }
});

const platform = ({
    darwin: 'macos',
    win32: 'windows',
    linux: 'linux',
})[ process.platform ] || 'unknown';

const config = {
    path: 'config.json',
    
    wsserver: {
        url: 'ws.parlot.tk',
        secure: true,
    },

    get: function() {
        const template = {
            room: 'ROOM_NAME',
            name: 'WORKER_NAME',
        };

        if (args.room) {
            template.room = args.room;
        }
        if (args.name) {
            template.name = args.name;
        }

        try {
            return JSON.parse(fs.readFileSync(this.path));
        }
        catch(error) {
            this.save(template);
            return {};
        }    
    },

    save: function(file) {
        fs.writeFileSync(this.path, JSON.stringify(file));
    },

    getURL: function() {
        const protocol = this.wsserver.secure ? 'https' : 'http';
        const serverPort = this.wsserver.serverPort ? `:${this.wsserver.serverPort}` : '';
        return `${ protocol }://${ this.wsserver.url }${ serverPort }`;
    },

    createName: async function() {
        const res = await fetch(`${ this.getURL() }/randomname`);
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

const version = (() => {
    try {
        return require('./version.json').version;
    }
    catch(err) {
        return process.env.npm_package_version || false;
    }
})();
if (!version) {
    console.log(`You should run this with 'npm start'`);
    process.exit(1);
}

if (args.printVersion) {
    console.log(`v${ version }`);
    process.exit(0);
}

// check for updates
(async () => {
    let req = await fetch(config.getURL() +'/update/version');
    let data = await req.json();
    
    if (version == data.version) {
        return;
    }

    console.log(`There is an update to version ${ data.version }. Downloading...`);

    const downloadFile = (async (url, path) => {
        const res = await fetch(url);
        const fileStream = fs.createWriteStream(path);
        await new Promise((resolve, reject) => {
            res.body.pipe(fileStream);
            res.body.on("error", reject);
            fileStream.on("finish", resolve);
        });
    });
    await downloadFile(`${ config.getURL() }/download/${ platform }?type=tar`, 'update.tar.gz');

    console.log('Unzipping...');
    await tar.x({ file: 'update.tar.gz' });


    console.log('Restarting worker...');
    spawn(`./parlot-worker-${ platform }`, [], { detached: true, cwd: './' });

    process.exit(0);
})();

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
            cfg.room = room == '' ? 'lobby' : room;
            config.save(cfg);
            console.log(`Joined room ${ cfg.room }\n`);
            resolve(cfg.room);
        });
    });

    await new Promise(resolve => {
        const cfg = config.get();
        if (config.get().name && config.get().name != "WORKER_NAME") {
            resolve(cfg.name);
            return;
        }
    
        const setName = name => {
            cfg.name = name;
            config.save(cfg);
            console.log(`From now on this worker will be known as ${ name }!\n`);
            resolve(name);    
        }

        if (args.auto) {
            config.createName().then(name => setName(name));
            return;
        }

        console.log('Now we will set up the name your machine will be known for. If you don\'t want to set any, leave it blank and I will choose one for you.\n')
    
        readline.question(`Please inform this worker's name: `, name => {
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