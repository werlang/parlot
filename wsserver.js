const WebSocket  = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');


// for nginx proxy your websocket service, replace location / on vhosts conf file with this:
// location / {
//     proxy_set_header HOST $host;
//     proxy_set_header X- Real - IP $remote_addr;
//     proxy_set_header X - Forwarded - For $proxy_add_x_forwarded_for;
//     proxy_set_header X - Forwarded - Proto $scheme;
//     proxy_pass_request_headers on;
//     proxy_pass http://YOUR_SERVER_IP:WEBSOCKET_PORT;
//     proxy_http_version 1.0;
//     proxy_set_header Upgrade $http_upgrade;
//     proxy_set_header Connection "Upgrade";
// }


module.exports = app => {
    const config = JSON.parse(fs.readFileSync('config.json'));
    const wss = (() => {
        if (config.production === true) {
            const credentials = (path => ({
                key: fs.readFileSync(path.key),
                cert: fs.readFileSync(path.cert),
            }))(config.credentials);
            const server = require(config.protocol).createServer(credentials, app).listen(config.port);
            return new WebSocket.Server({ server });
        }
        return new WebSocket.Server({ port: config.port });
    })();

    if (wss) {
        console.log(`Websocket server connected on port ${ config.port }`);
    }

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
    
            // message to the server
            if (message.room == 'server' && this.onServer) {
                this.onServer(socket, message.data);
            }
        });
    
        // remove client from list
        socket.on('close', () => {
            Object.entries(this.roomList).forEach(([roomId, room]) => {
                if (room[ socket.id ]) {
                    socket.leave(roomId);
                }
            });
    
            socket.send(JSON.stringify({
                room: 'self',
                sender: 'server',
                data: {
                    action: 'disconnect',
                    message: 'Disconnected from WebSocket server',
                }
            }));
    
            if (this.onClient) {
                this.onClient(socket, { action: 'disconnect' });
            }
        });
    
        socket.join = room => {
            if (!this.roomList[ room ]) {
                this.roomList[ room ] = {};
            }
            this.roomList[ room ][ socket.id ] = socket;
    
            if (this.onClient) {
                this.onClient(socket, { action: 'join', room: room });
            }
        }
    
        socket.leave = room => {
            if (!this.roomList[ room ]) {
                return;
            }
    
            if (this.roomList[ room ][ socket.id ]) {
                delete this.roomList[ room ][ socket.id ];
            }
            if (!Object.keys(this.roomList[ room ]).length && room != 'everyone') {
                delete this.roomList[ room ];
            }
    
            if (this.onClient && room != 'everyone') {
                this.onClient(socket, { action: 'leave', room: room });
            }
        }
    
        if (this.onClient) {
            this.onClient(socket, { action: 'connect' });
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

    // broadcast ping every 30s to keep connection alive
    setInterval(() => {
        Object.values(wss.roomList.everyone).forEach(client => client.send(JSON.stringify({
            room: 'self',
            sender: 'server',
            data: { action: 'ping' },
        })));
    }, 30000);

    return wss;
};