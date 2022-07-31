const WebSocket  = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 4210 });

wss.roomList = { everyone: [] };

wss.on('connection', function(socket) {
    socket.id = uuidv4().split('-').join('');
    this.roomList.everyone[ socket.id ] = socket;

    socket.send(JSON.stringify({
        room: 'self',
        sender: 'server',
        data: {
            action: 'connect',
            message: 'Connection to WebSocket server estabilished',
            id: socket.id,
        },
    }));

    if (this.onClient) {
        this.onClient('connect', socket);
    }

    socket.on('message', message => {
        message = JSON.parse(message);
        // console.log(message);

        // call join or leave function
        if (message.command) {
            if (['join', 'leave'].includes(message.command)) {
                socket[message.command](message.room);
            }
            return;
        }

        // capture the reply from client
        if (message.replyTo) {
            const client = this.roomList.everyone[ message.replyTo ];
            if (client) {
                client.send(JSON.stringify({
                    room: `reply-${ message.timestamp }`,
                    data: message.data,
                    sender: socket.id,
                }));
            }
            return;
        }

        // if a direct message
        if (message.room && Object.keys(this.roomList.everyone).includes(message.room)) {
            const client = this.roomList.everyone[ message.room ];
            client.send(JSON.stringify({
                room: 'self',
                data: message.data,
                timestamp: message.timestamp,
                sender: socket.id,
            }));
            return;
        }

        // when the server first receive a message
        if (message.room && this.roomList[ message.room ]) {
            const clientList = Object.values(this.roomList[ message.room ]);
            clientList.forEach(client => {
                client.send(JSON.stringify({
                    room: message.room,
                    data: message.data,
                    timestamp: message.timestamp,
                    sender: socket.id,
                }));
            });
            return;
        }
    });

    // remove client from list
    socket.on('close', () => {
        Object.values(this.roomList).forEach(room => {
            delete room[ socket.id ];
        });

        if (this.onClient) {
            this.onClient('disconnect', socket);
        }    

        socket.send(JSON.stringify({
            room: 'self',
            sender: 'server',
            data: {
                action: 'disconnect',
                message: 'Disconnected from WebSocket server',
            }
        }));
    });

    socket.join = room => {
        if (!this.roomList[ room ]) {
            this.roomList[ room ] = {};
        }
        this.roomList[ room ][ socket.id ] = socket;
    }

    socket.leave = room => {
        if (this.roomList[ room ] && this.roomList[ room ][ socket.id ]) {
            delete this.roomList[ room ][ socket.id ];
        }
        if (!Object.keys(this.roomList[ room ]).length) {
            delete this.roomList[ room ];
        }
    }
});

wss.emit = function (room = 'everyone', data) {
    // console.log({ room: room, action: action, data: data });
    const clientList = this.roomList[room] || {};
    Object.values(clientList).forEach(client => client.send(JSON.stringify({
        room: room,
        data: data,
    })));
}

module.exports = wss;