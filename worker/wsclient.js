const WebSocket = require('ws');

const socket = {};

socket.connect = async function () {
    this.actionList = {};
    this.running = true;
    return new Promise(resolve => {
        if (this.connected){
            resolve(this);
            return;
        } 
        
        const port = this.port ? `:${ this.port }` : '';
        const url = `${ this.protocol }://${ this.serverURL }${ port }`;
        this.ws = new WebSocket(url, { rejectUnauthorized: false });
        
        this.ws.onerror = err => {
            console.log(`Error connecting to ${ url }`);
            console.log(err)
            resolve(this);
        }

        this.ws.onopen = () => {
            console.log(`Connected to Websocket server at ${ url }`);
            this.connected = true;
            resolve(this);
        }
    
        this.ws.onclose = () => {
            if (this.connected) {
                console.log('Websocket disconnected');
            }
            else {
                console.log('Reconnecting to websocket server...');
            }
            this.connected = false;
            setTimeout(() => this.connect(), 1000);
        }
    
        // run callback event for receiving message for a room
        this.ws.onmessage = async event => {
            const msg = JSON.parse(event.data);
            // console.log(msg)
    
            // if connection first stabilished
            if (msg.room == 'self' && msg.sender == 'server' && msg.data.action == 'connect'){
                this.id = msg.data.id;
                return;
            }
            // ping connection sent by server to keep connection alive
            if (msg.room == 'self' && msg.sender == 'server' && msg.data.action == 'ping'){
                this.ws.send(JSON.stringify({ data: 'pong' }));
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

// keep the node app running
socket.run = function() {
    setTimeout(() =>  {
        if (this.running) this.run();
    }, 10);
}

module.exports = config => {
    socket.serverURL = config.url;
    socket.port = config.port;
    socket.protocol = config.secure ? 'wss' : 'ws';
    return socket;
};