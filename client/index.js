import { Toast } from './utils.js';
import { socket } from './wsclient.js'

const terminal = document.querySelector('#terminal');
const input = document.querySelector('input');
input.focus();

document.body.addEventListener('click', () => input.focus());

input.addEventListener('keypress', e => {
    if (e.key == 'Enter') {
        if (input.value.length) {
            socket.emit('worker', {
                action: 'execute',
                command: input.value,
            });
        }
    
        insertTerminal('$> ' + input.value);
        input.value = '';
    }
});

socket.connect().then(() => {
    socket.join('admin', (data, sender) => {
        if (data.action == 'command') {
            insertTerminal(data.response);
            return;
        }
        if (data.action == 'client update') {
            rooms.add('worker');
            new Toast(`Client ${ data.id } ${ data.type }ed`, { timeOut: 3000 } );
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
        const res = await fetch(`/${name}/workers`);
        const data = await res.json();
        if (data.status == 200) {
            this.list[name] = data.result;
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
    },
}

rooms.add('worker');