const express = require('express');
const app = express();
const port = 4200;

const wss = require('./wsserver');
wss.onClient = (socket, data) => {
    if (['join', 'leave'].includes(data.action)) {
        wss.emit('admin', {
            action: 'client update',
            type: data.action,
            room: data.room,
            id: socket.id,
        });
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
        res.status(404).send({ status: 404, message: 'Room not found' });
        return;
    }

    res.send({ status: 200, result: Object.keys(room) });
});


app.use((_, res) => res.status(404).send({ message: 'Nothing to be seen here.' }));

app.listen(port, () => console.log(`Listening on port ${port}`));