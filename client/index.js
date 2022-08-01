import { Modal, Toast } from './utils.js';
import { socket } from './wsclient.js'

socket.connect().then(() => {
    socket.join('admin', (data, sender) => {
        // console.log(data)
        if (data.action == 'command') {
            const worker = rooms.getWorker(sender);
            rooms.updateTerminal(worker, data.response);
            return;
        }
        if (data.action == 'client update') {
            // console.log(data)
            rooms.add();
            const action = ({ join: 'joined', leave: 'left' })[ data.type ];
            new Toast(`🚪 Client <span class="bold">${ data.name || data.id }</span> ${ action } room <span class="bold">${ data.room }</span>`, { timeOut: 3000 } );
            return;
        }
    });
});

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
            // insert new workers
            if (!this.list[name]) {
                this.list[name] = [];
            }

            data.result.forEach(worker => {
                if (!this.list[name].find(e => e.id == worker.id)) {
                    this.list[name].push(worker);
                }
            })
            
            // remove workers that left
            this.list[name].forEach(worker => {
                if (!data.result.find(e => e.id == worker.id)) {
                    this.list[name] = this.list[name].filter(e => e.id != worker.id);
                }
            })
        }
        else {
            delete this.list[name];
            new Toast(`👎 Room <span class="bold">${name}</span> not found`, { timeOut: 3000 });
        }
        this.renderDOM();
    },

    renderDOM: function() {
        let text = Object.entries(this.list).map(([room, workers]) => {
            const workerText = workers.map(w => {
                return `<div class="worker" id="worker-${ w.id }">
                    <div class="name">${ w.name || w.id }</div>
                </div>`;
            }).join('');
            
            return `<div class="room" id="room-${room}">
                <div class="name">${room}</div>
                ${ workerText }
            </div>`;
        }).join('');
        document.querySelector(`#room-container`).innerHTML = text;

        const roomContainers = Object.entries(this.list).map(([room, workers]) => {
            const roomTerminals = workers.map(w => {
                return this.createTerminal(room, w);
            });
            const container = document.createElement('div');
            container.classList.add('room-terminal-container');
            roomTerminals.forEach(e => container.insertAdjacentElement('beforeend', e));
            return container;
        });

        const frame = document.querySelector(`#frame`);
        frame.innerHTML = '';
        roomContainers.forEach(e => frame.insertAdjacentElement('beforeend', e));
    },

    createTerminal: function(room, worker) {
        console.log(worker)
        let lines = [];
        if (worker.terminal && worker.terminal.lines) {
            lines = worker.terminal.lines;
        }

        worker.terminal = { dom: document.createElement('div'), lines: lines };
        worker.terminal.dom.classList.add('window');
        worker.terminal.dom.innerHTML = `
            <div id="title">
                <div class="button" id="close"></div>
                <div class="button" id="minimize"></div>
                <div class="button" id="maximize"></div>
                <div id="text">${ room } - ${ worker.name || worker.id }</div>
            </div>
            <div class="terminal"></div>
            <div id="input-container">
                <span>$></span>
                <input>
            </div>
        `;

        const input = worker.terminal.dom.querySelector('input');

        worker.terminal.dom.addEventListener('click', () => input.focus());

        input.addEventListener('keypress', e => {
            if (e.key == 'Enter') {
                if (input.value.length) {
                    socket.emit(worker.id, {
                        action: 'execute',
                        command: input.value,
                    });

                    this.updateTerminal(worker, `$> ${ input.value }`);
                }
                input.value = '';
            }
        });

        worker.terminal.lines.forEach(l => this.updateTerminal(worker, l, false));

        return worker.terminal.dom;
    },

    updateTerminal: function(worker, text, insert=true) {
        const terminal = worker.terminal.dom.querySelector('.terminal');
        terminal.insertAdjacentHTML('beforeend', `<pre>${ text }</pre>`);
        terminal.scrollTo({ top: terminal.scrollHeight });

        if (!worker.terminal.lines) {
            worker.terminal.lines = [];
        }

        if (insert) {
            worker.terminal.lines.push(text);
        }
    },

    getWorker: function(id) {
        const merged = Object.values(this.list).reduce((p,c) => [...p, ...c], []);
        return merged.find(e => e.id == id);
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