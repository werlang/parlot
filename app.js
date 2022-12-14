const express = require('express');
const fs = require('fs');
const app = express();
const port = 4200;

const wss = require('./wsserver')(app);
wss.onClient = (socket, data) => {
    if (['join', 'leave'].includes(data.action) && data.room != 'self') {
        wss.emit('admin', {
            action: 'client update',
            type: data.action,
            room: data.room,
            id: socket.id,
            name: socket.name,
        });
    }
}

wss.onServer = (socket, data) => {
    if (data.action == 'set name') {
        socket.name = data.name;
    }
    if (data.action == 'pong') {
        // console.log(socket.id + ' is alive');
    }
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(`${__dirname}/client/`));

app.get('/', async (req, res) => {
    res.sendFile(`${__dirname}/client/index.html`);
});

// in the future
// require('./api')(app, wss);
app.get('/rooms/:room', async (req, res) => {
    let room = wss.roomList[ req.params.room ];

    if (!room) {
        res.status(404).send({ status: 404, message: 'No workers in the room' });
        return;
    }

    res.send({ status: 200, result: Object.values(room).map(e => ({
        id: e.id,
        name: e.name,
    })) });
});


app.get('/randomname', async (req, res) => {
    const words = JSON.parse(fs.readFileSync('words.json'));
    const index = Math.floor(Math.random() * words.length);
    const number = Math.floor(Math.random() * 100);
    res.send({ name: `${words[index]}-${number}` });
});

app.get('/download/:os', async (req, res) => {
    const type = req.query.type || 'zip';
    const filePath = `${__dirname}/release/parlot-worker-${ req.params.os }.${ type == 'tar' ? 'tar.gz' : 'zip' }`;
    if (fs.existsSync(filePath)) {
        res.download(filePath);
        return;
    }
    res.status(404).send({ message: 'This file does not exists.' });
});

// get the current worker version available
app.get('/update/version', async (req, res) => {
    const version = require(`${ __dirname }/worker/package.json`).version;
    res.send({ version: version });
});

app.use((_, res) => res.status(404).send({ message: 'Nothing to be seen here.' }));

app.listen(port, () => console.log(`Listening on port ${port}`));