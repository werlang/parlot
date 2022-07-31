const express = require('express');
const wss = require('./wsserver.js');

const app = express();
const port = 4200;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(`${__dirname}/client/`));

app.get('/', async (req, res) => {
    res.sendFile(`${__dirname}/client/index.html`);
});

app.get('/:room/workers', async (req, res) => {
    const room = wss.roomList[ req.params.room ];

    if (!room) {
        res.status(404).send({ status: 404, message: 'Room not found' });
        return;
    }

    res.send({ status: 200, result: Object.keys(room) });
});

wss.onClient = (action, socket) => {
    wss.emit('admin', {
        action: 'client update',
        type: action,
        id: socket.id,
    })
}

app.use((_, res) => res.status(404).send({ message: 'Nothing to be seen here.' }));

app.listen(port, () => console.log(`Listening on port ${port}`));