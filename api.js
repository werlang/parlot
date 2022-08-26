// ------------------------------------------------
// THIS FILE IS NOT BEING USED YET
// ------------------------------------------------


const db = require('./database');
db.connect();

module.exports = (app, wss) => {
    // get rooms' workers
    app.get('/rooms/:room', async (req, res) => {
        let room = wss.roomList[ req.params.room ];
    
        if (!room) {
            const [rows, error] = await db.query(`SELECT * FROM rooms WHERE token = ?`, [ req.params.room ]);
            if (rows.length) {
                wss.roomList[ req.params.room ] = {};
                room = req.params.room;
            }
        }

        if (!room) {
            res.status(404).send({ status: 404, message: 'Room not found' });
            return;
        }
    
        res.send({ status: 200, result: Object.keys(room) });
    });
    
    // create new room
    app.post('/rooms', async (req, res) => {
        const words = JSON.parse(fs.readFileSync('words.json'));

        const newToken = async () => {
            const index = Math.floor(Math.random() * words.length);
            const number = Math.floor(Math.random() * 100);
            const token = `${ words[index] }-${ number }`;

            const [rows, error] = await db.query(`SELECT id FROM rooms WHERE token = ?`, [ token ]);
            if (rows.length) {
                return await newToken();
            }
            return token;
        }
        const token = await newToken();

        const data = {
            name: req.body.name,
            token: token,
        };
    
        const [, error] = await db.insert('rooms', data);
    
        if (error){
            res.status(500).send({
                status: 500,
                error: 'Internal Server Error',
                message: 'Error while trying to insert new api key to database',
                serverMessage: error,
            });
            return;
        }
    
        wss.roomList[ token ] = {};

        res.status(201).send(data);
    });
    
    app.post('/rooms', async (req, res) => {
    
    });
};
