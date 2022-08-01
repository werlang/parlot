import { Modal, Toast } from './utils.js';
import { socket } from './wsclient.js'

// const terminal = document.querySelector('#terminal');
// const input = document.querySelector('input');
// input.focus();

// document.querySelector('#frame').addEventListener('click', () => input.focus());

// input.addEventListener('keypress', e => {
//     if (e.key == 'Enter') {
//         if (input.value.length) {
//             socket.emit('worker', {
//                 action: 'execute',
//                 command: input.value,
//             });
//         }
    
//         insertTerminal('$> ' + input.value);
//         input.value = '';
//     }
// });

socket.connect().then(() => {
    socket.join('admin', (data, sender) => {
        if (data.action == 'command') {
            insertTerminal(data.response);
            return;
        }
        if (data.action == 'client update') {
            rooms.add();
            const action = ({ join: 'joined', leave: 'left' })[ data.type ];
            new Toast(`🚪 Client <span class="bold">${ data.id }</span> ${ action } room <span class="bold">${ data.room }</span>`, { timeOut: 3000 } );
            if (Object.keys(rooms.list).includes(data.room)) {
            }
        }
    });
});

const insertTerminal = text => {
    terminal.insertAdjacentHTML('beforeend', `<pre>${ text }</pre>`);
    terminal.scrollTo({ top: terminal.scrollHeight });
}

const rooms = {
    list: {},

    add: async function(name) {
        if (!name) {
            Object.keys(this.list).forEach(room => this.add(room));
            return;
        }

        const res = await fetch(`/rooms/${name}`);
        const data = await res.json();
        if (data.status == 200) {
            this.list[name] = data.result;
        }
        else {
            new Toast(`👎 Room <span class="bold">${name}</span> not found`, { timeOut: 3000 });
        }
        this.render();    
    },

    render: function() {
        let text = Object.entries(this.list).map(([room, workers]) => {
            const workerText = workers.map(w => {
                return `<div class="worker" id="worker-${w}">
                    <div class="name">${w}</div>
                </div>`;
            }).join('');
            
            return `<div class="room" id="room-${room}">
                <div class="name">${room}</div>
                ${ workerText }
            </div>`;
        }).join('');
        document.querySelector(`#room-container`).innerHTML = text;

        const terminals = Object.entries(this.list).map(([room, workers]) => {
            return workers.map(w => {
                return this.createTerminal(`${ room } - ${ w }`);
            }).join('');
        }).join('');

        document.querySelector(`#frame`).innerHTML = terminals;
    },

    createTerminal: function(title) {
        return `<div class="window">
            <div id="title">
                <div class="button" id="close"></div>
                <div class="button" id="minimize"></div>
                <div class="button" id="maximize"></div>
                <div id="text">${ title }</div>
            </div>
            <div class="terminal"></div>
            <div id="input-container">
                <span>$></span>
                <input>
            </div>
        </div>`;
    },
}

document.querySelector('#join-room').addEventListener('click', () => {
    const modal = new Modal(`<h2>Join room</h2>
        <label>
            <span>Room share id</span>
            <input class="input-text">
        </label>
        <div id="button-container"><button>JOIN</button></div>
    `);
    
    const input = modal.domObject.querySelector('input');
    input.focus();
    
    const modalClick = () => {
        const input = document.querySelector('.modal input');
        rooms.add(input.value);
        modal.close();
    }

    modal.addEvent({ tag: 'input', event: 'keypress', callback: e => {
        if (e.key == 'Enter') {
            modalClick();
        }
    }});
    
    modal.addEvent({ tag: 'button', event: 'click', callback: modalClick});
});