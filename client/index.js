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
            new Toast(`🚪 Client <span class="bold">${ data.name || data.id }</span> ${ action } room <span class="bold">${ data.room }</span>`, { timeOut: 5000 } );
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
            new Toast(`👎 Room <span class="bold">${name}</span> not found`, { timeOut: 5000 });
        }
        this.renderDOM();
    },

    renderDOM: function() {
        const rooms = Object.entries(this.list).map(([room, workers]) => {
            const workerText = workers.map(w => {
                return `<div class="worker" id="worker-${ w.id }">
                    <div class="name" title="Click to control this worker">${ w.name || w.id }</div>
                </div>`;
            }).join('');
            
            const roomEl = document.createElement('div');
            roomEl.id = `room-${room}`;
            roomEl.classList.add('room');
            roomEl.innerHTML = `<div class="name" title="Click to control the whole room">${room}</div> ${ workerText }`;
            return roomEl;
        });

        const container = document.querySelector(`#room-container`);
        container.innerHTML = '';
        rooms.forEach(room => container.insertAdjacentElement('beforeend', room));

        const roomContainers = Object.entries(this.list).map(([room, workers]) => {
            const roomTerminals = workers.map(w => this.createTerminal(room, w));
            const container = document.createElement('div');
            container.id = `room-${room}`;
            container.classList.add('room-terminal-container');
            roomTerminals.forEach(e => container.insertAdjacentElement('beforeend', e));
            return container;
        });

        const frame = document.querySelector(`#frame`);
        frame.innerHTML = '';
        roomContainers.forEach(e => frame.insertAdjacentElement('beforeend', e));

        // click on a room on menu
        container.querySelectorAll('.room').forEach(e => e.addEventListener('click', () => {
            frame.querySelectorAll('.window, .room-terminal-container').forEach(e => e.classList.remove('active', 'maximized'));
            container.querySelectorAll('.worker, .room').forEach(e => e.classList.remove('active', 'closed'));
            e.classList.add('active');
            const room = this.getName(e);
            frame.querySelector(`#room-${room}`).classList.add('active');
            frame.querySelectorAll(`#room-${room} .window`).forEach(e => e.classList.remove('closed'));
            
            const firstWorkerId = this.getName(frame.querySelector(`#room-${room} .window`));
            this.getWorker(firstWorkerId).terminal.dom.querySelector('input').focus();
        }));

        // click on a worker on menu
        container.querySelectorAll('.worker').forEach(e => e.addEventListener('click', ev => {
            ev.stopPropagation();
            frame.querySelectorAll('.window, .room-terminal-container').forEach(e => e.classList.remove('active', 'maximized'));
            container.querySelectorAll('.worker, .room').forEach(e => e.classList.remove('active'));
            e.classList.add('active');
            const worker = this.getName(e);
            document.querySelector(`#menu #worker-${worker}`).classList.remove('closed');
            frame.querySelector(`#worker-${worker}`).classList.add('active');
            frame.querySelector(`#worker-${worker}`).classList.remove('closed');
            this.getWorker(worker).terminal.dom.querySelector('input').focus();
        }));

    },

    createTerminal: function(room, worker) {
        // console.log(worker)
        let lines = [];
        if (worker.terminal && worker.terminal.lines) {
            lines = worker.terminal.lines;
        }

        worker.terminal = { dom: document.createElement('div'), lines: lines };
        worker.terminal.dom.classList.add('window');
        worker.terminal.dom.id = `worker-${worker.id}`;
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

        worker.submit = () => {
            socket.emit(worker.id, {
                action: 'execute',
                command: input.value,
            });
        }

        // click on a terminal: make it active
        worker.terminal.dom.addEventListener('click', () => {
            const workerDOM = document.querySelector(`#menu #worker-${ worker.id }`);
            if (!workerDOM.classList.contains('active') && !workerDOM.parentNode.classList.contains('active')) {
                workerDOM.click();
            }

            input.focus();
        });

        // mimic input value
        input.addEventListener('input', e => {
            e.preventDefault();
            const inputs = document.querySelectorAll('#frame .window.active input, #frame .room-terminal-container.active .window input');
            inputs.forEach(i => i.value = input.value);
        });

        // when you press enter
        input.addEventListener('keypress', e => {
            if (e.key == 'Enter') {
                if (input.value.length) {
                    const ids = Array.from(document.querySelectorAll('#frame .window.active, #frame .room-terminal-container.active .window')).map(e => this.getName(e));
                    ids.forEach(id => {
                        const worker = this.getWorker(id);
                        worker.submit();
                        const wInput = worker.terminal.dom.querySelector('input');
                        this.updateTerminal(worker, `$> ${ wInput.value }`);
                        wInput.value = '';
                    });
                }
            }
        });

        worker.terminal.lines.forEach(l => this.updateTerminal(worker, l, false));

        // close a terminal
        worker.terminal.dom.querySelector('#close').addEventListener('click', e => {
            e.stopPropagation();
            worker.terminal.dom.classList.add('closed');
            worker.terminal.dom.classList.remove('active', 'maximized');
            document.querySelectorAll('#frame .window.active, #frame .room-terminal-container.active, #menu .worker.active, #menu .room.active').forEach(e => e.classList.remove('active'));
            document.querySelector(`#menu #worker-${ worker.id }`).classList.add('closed');
        });
        
        // maximize terminal
        worker.terminal.dom.querySelector('#maximize').addEventListener('click', e => {
            e.stopPropagation();
            document.querySelectorAll('#frame .window.active, #frame .room-terminal-container.active, #menu .worker.active, #menu .room.active').forEach(e => e.classList.remove('active'));
            document.querySelectorAll('#frame .window').forEach(e => e.classList.remove('maximized'));
            document.querySelector(`#menu #worker-${ worker.id }`).click();
            worker.terminal.dom.classList.add('maximized');
        });

        // minimize terminal
        worker.terminal.dom.querySelector('#minimize').addEventListener('click', e => {
            e.stopPropagation();
            document.querySelectorAll('#frame .window.active, #frame .room-terminal-container.active, #menu .worker.active, #menu .room.active').forEach(e => e.classList.remove('active'));
            document.querySelectorAll('#frame .window').forEach(e => e.classList.remove('maximized'));
            document.querySelector(`#menu #worker-${ worker.id }`).click();
        });

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

    getName: function(element) {
        return element.id.split('-').slice(1).join('-');
    }
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