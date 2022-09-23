import { commandHistory, Modal, Toast } from './utils.js';
import { socket } from './wsclient.js';
import './font-awesome.js';

socket.connect().then(skt => {
    new Toast(`Connected to the Websocket server`, { timeOut: 5000 });

    socket.join('admin', (data, sender) => {
        // console.log(data)
        if (data.action == 'command') {
            const worker = rooms.getWorker(sender);
            rooms.updateTerminal(worker, data.response);
            return;
        }
        if (data.action == 'client update') {
            // console.log(data)
            rooms.update();
            if (data.id != skt.id) {
                const action = ({ join: 'joined', leave: 'left' })[ data.type ];
                new Toast(`🚪 Client <span class="bold">${ data.name || data.id }</span> ${ action } room <span class="bold">${ data.room }</span>`, { timeOut: 5000 } );
                console.log(`Client ${ data.name || data.id } ${ action } room ${ data.room }`);
            }
            return;
        }
    });
});

socket.onClose = () => {
    new Toast(`Disconnected from Websocket server. Retrying connection...`, { timeOut: 5000 });
}

const rooms = {
    list: {},

    join: function(name) {
        if (name === '') return;
        if (!this.list[name]) {
            this.list[name] = [];
        }
        this.update(name);
    },

    leave: function(name) {
        delete this.list[name];
        this.selected = null;
        document.querySelector('#menu #button-container #leave-room').setAttribute('disabled', true);
        document.querySelector('#menu #button-container #queue-toggle').setAttribute('disabled', true);
        this.renderDOM();
    },
    
    update: async function(name) {
        if (!name) {
            Object.keys(this.list).forEach(room => this.update(room));
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
            new Toast(`😢 No workers in room <span class="bold">${name}</span>`, { timeOut: 5000 });
            this.list[name] = [];
        }
        this.renderDOM();
    },

    select: function() {

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
            const room = this.getName(e);

            frame.querySelectorAll('.window, .room-terminal-container').forEach(e => e.classList.remove('active', 'maximized'));
            container.querySelectorAll('.worker, .room').forEach(e => e.classList.remove('active', 'closed'));

            // already selected. disable
            if (this.selected == room){
                this.selected = null;
                document.querySelector('#menu #button-container #leave-room').setAttribute('disabled', true);
                document.querySelector('#menu #button-container #queue-toggle').setAttribute('disabled', true);

                return;
            }
            
            // enable this room's actions
            this.selected = room;
            document.querySelector('#menu #button-container #leave-room').removeAttribute('disabled');
            document.querySelector('#menu #button-container #queue-toggle').removeAttribute('disabled');

            e.classList.add('active');
            frame.querySelector(`#room-${room}`).classList.add('active');
            frame.querySelectorAll(`#room-${room} .window`).forEach(e => e.classList.remove('closed'));
            
            const firstWindow = frame.querySelector(`#room-${room} .window`);
            if (firstWindow) {
                const firstWorkerId = this.getName(firstWindow);
                this.getWorker(firstWorkerId).terminal.dom.querySelector('input').focus();            
            }
        }));

        // click on a worker on menu
        container.querySelectorAll('.worker').forEach(e => e.addEventListener('click', ev => {
            ev.stopPropagation();
            frame.querySelectorAll('.window, .room-terminal-container').forEach(e => e.classList.remove('active', 'maximized'));
            container.querySelectorAll('.worker, .room').forEach(e => e.classList.remove('active'));

            const worker = this.getName(e);
            if (this.selectedWorker == worker) {
                this.selectedWorker = null;
                document.querySelector('#menu #button-container #queue-toggle').setAttribute('disabled', true);
                return;
            }

            e.classList.add('active');
            document.querySelector(`#menu #worker-${worker}`).classList.remove('closed');
            frame.querySelector(`#worker-${worker}`).classList.add('active');
            frame.querySelector(`#worker-${worker}`).classList.remove('closed');
            this.getWorker(worker).terminal.dom.querySelector('input').focus();

            document.querySelector('#menu #button-container #queue-toggle').removeAttribute('disabled');
            this.selectedWorker = worker;
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
                <div class="button" id="close" title="Close"></div>
                <div class="button" id="minimize" title="Restore"></div>
                <div class="button" id="maximize" title="Maximize"></div>
                <div id="text">${ worker.name || worker.id } - ${ room }</div>
            </div>
            <div class="terminal"></div>
            <div id="input-container">
                <span>$></span>
                <input>
            </div>
        `;

        const input = worker.terminal.dom.querySelector('input');

        worker.submit = () => {
            commandHistory.add(input.value);

            if (input.value == 'clear' || input.value == 'cls') {
                this.clearTerminal(worker);
                return;
            }

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
        
        // detect arrows
        input.addEventListener('keydown', e => {
            let command = '';
            if (e.key == 'ArrowUp') {
                command = commandHistory.getPrev();
            }
            else if (e.key == 'ArrowDown') {
                command = commandHistory.getNext();
            }
            console.log(commandHistory.list, commandHistory.index)
            if (command != '') {
                input.value = command;
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

    clearTerminal: function(worker) {
        const terminal = worker.terminal.dom.querySelector('.terminal');
        terminal.innerHTML = '';
        worker.terminal.lines = [];
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
            <span>Room identifier (name)</span>
            <input class="input-text">
        </label>
        <div id="button-container"><button>JOIN</button></div>
    `);
    
    const input = modal.domObject.querySelector('input');
    input.focus();
    
    const modalClick = () => {
        const input = document.querySelector('.modal input');
        if (input.value.length) {
            rooms.join(input.value);
        }
        modal.close();
    }

    modal.addEvent({ tag: 'input', event: 'keypress', callback: e => {
        if (e.key == 'Enter') {
            modalClick();
        }
    }});
    
    modal.addEvent({ tag: 'button', event: 'click', callback: modalClick});
});


document.querySelector('#leave-room').addEventListener('click', () => {
    const modal = new Modal(`<h2>Leave room</h2>
        <p>Do you really want to leave room <span class="highlight">${ rooms.selected }</span>?</p>
        <div id="button-container">
            <button id="yes">Yes</button>
            <button id="no">No</button>
        </div>
    `, { buttonClose: 'no' });

    modal.addEvent({ id:"yes", event: `click`, callback: () => {
        rooms.leave(rooms.selected);
        modal.close();
    }})

});


const queue = {
    enabled: false,

    list: {},
};

// JSON.parse(localStorage.getItem('queue') || '{}');


document.querySelector('#queue-toggle').addEventListener('click', () => {
    if (rooms.selectedWorker || rooms.selected) {
        new Toast(`⏳ Commands will now be queued by workers`, { timeOut: 5000 });
    }
    else {
        new Toast(`❗ Command queue is disabled`, { timeOut: 5000 });

    }
    // const modal = new Modal(`<h2>Leave room</h2>
    //     <p>Do you really want to leave room <span class="highlight">${ rooms.selected }</span>?</p>
    //     <div id="button-container">
    //         <button id="yes">Yes</button>
    //         <button id="no">No</button>
    //     </div>
    // `, { buttonClose: 'no' });

    // modal.addEvent({ id:"yes", event: `click`, callback: () => {
    //     rooms.leave(rooms.selected);
    //     modal.close();
    // }})

});


// check localStorage for greetings message
if (!localStorage.getItem('saw-intro')) {
    const modal = new Modal(`<h2>Welcome to Parlot</h2>
        <p>This tool enables system administrators to control several worker machines through CLI all at once. All the while using a beautiful web-based dashboard.</p>
        <p>Worker machines will execute any command you order them. Download and run the worker-client on the left menu, on the bottom.</p>
        <p>You, as an admin, need to join the same room as your workers. For that, click on the + button on the left menu.</p>
        <p>I don't want to extend myself, so for more information, visit our <a href="https://github.com/werlang/parlot" target="_blank">GitHub</a>.</p>
        <div><label class="checkbox"><input type="checkbox" id="no-show">Do not show me this again</label></div>
        <div id="button-container"><button>Got It</button></div>
    `, { fog: { close: false } });

    modal.addEvent({ tag: 'button', event: 'click', callback: e => {
        if (modal.getDOMElement().querySelector('#no-show').checked) {
            localStorage.setItem('saw-intro', true);
        }
        modal.close();
    }});
}