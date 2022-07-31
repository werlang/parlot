export const socket = {
    serverURL: window.location.hostname,
    port: 4210,
    connected: false,
    actionList: {},
}

socket.connect = async function () {
    return new Promise(resolve => {
        if (this.connected) {
            resolve(this);
            return;
        }
        
        this.ws = new WebSocket(`ws://${ this.serverURL }:${ this.port }`);
    
        this.ws.onopen = () => {
            console.log('connected to websocket server');
            this.connected = true;
            resolve(this);
        }
    
        this.ws.onclose = () => {
            if (this.connected) {
                console.log('websocket disconnected');
            }
            else {
                console.log('reconnecting to websocket server...');
            }
            this.connected = false;
            setTimeout(() => this.connect(), 1000);
        }
    
        // run callback event for receiving message for a room
        this.ws.onmessage = async event => {
            const msg = JSON.parse(event.data);
    
            // if connection first stabilished
            if (msg.room == 'self' && msg.sender == 'server' && msg.data.action == 'connect'){
                this.id = msg.data.id;
                return;
            }
    
            // the callback for receiving a message have 2 args: sender and data.
            let reply = {
                success: true,
                message: 'received, but the recipient sent no reply',
            };
    
            if (this.actionList[msg.room]) {
                reply = await this.actionList[msg.room](msg.data, msg.sender);
                // console.log(reply);
            }
            // timestamp means that need to send a reply
            if (msg.timestamp) {
                this.ws.send(JSON.stringify({
                    replyTo: msg.sender,
                    data: reply,
                    timestamp: msg.timestamp,
                }));
            }
        }
    });
}

// join or leave a room
socket.join = function (room, callback) {
    this.ws.send(JSON.stringify({ command: 'join', room: room }));
    if (callback) {
        this.on(room, callback);
    }
};

socket.leave = function (room) {
    this.ws.send(JSON.stringify({ command: 'leave', room: room }));
    this.off(room);
};

// send message to ws server for a specific room
socket.emit = function (room, data, reply) {
    // console.log({ action: action, data: data });
    const timestamp = new Date().getTime();
    this.ws.send(JSON.stringify({
        room: room,
        data: data,
        timestamp: timestamp,
    }));
    const roomReply = `reply-${timestamp}`;
    // start listening to the reply
    socket.on(roomReply, (data, sender) => {
        this.off(roomReply);
        return reply ? reply(data, sender) : true;
    });
}

// register callback for when receive message from a specific room
socket.on = function (room, callback) {
    this.actionList[room] = callback;
}

socket.off = function (room) {
    delete this.actionList[room];
}

// there are three kinds of rooms: replies, groups or self.
// you dont need to register (.on) on a reply room. when you emit the code do it for you, and leave after you receive the reply.
// for groups you must manually register to listen to group: .on('group', cb)
// for self: .on('self', cb)
// when you join a group, you can listen to it too .join('group', cb)

// when you receive a message, you have 2 args: data, sender
// sender can be an uuid for the message sender, or server.

// when you emit, you must send .emit('room', data, cb)
// room can be a group, or an id if you want to send a dm.

// you can get your own id with ws.id