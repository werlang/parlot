const express = require('express');
require('./wsserver.js');

const app = express();
const port = 4200;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(`${__dirname}/client/`));

app.get('/', async (req, res) => {
    res.sendFile(`${__dirname}/client/index.html`);
});

app.post('/', async (req, res) => {
    if (!req.body.command) {
        res.status(400).send({ message: 'Command not sent' });
        return;
    }
});

app.use((_, res) => res.status(404).send({ message: 'Nothing to be seen here.' }));

app.listen(port, () => console.log(`Listening on port ${port}`));