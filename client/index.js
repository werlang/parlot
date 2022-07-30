import { socket } from './wsclient.js'

socket.connect();

const terminal = document.querySelector('#terminal');
const input = document.querySelector('input');
input.focus();

document.body.addEventListener('click', () => input.focus());

input.addEventListener('keypress', e => {
    if (e.key == 'Enter') {
        send(input.value);
        insert('$> ' + input.value);
        input.value = '';
    }
});

const send = command => {
    socket.emit('worker', {
        action: 'execute',
        command: command,
    });

    socket.on('self', (data, sender) => {
        insert(data.response);
    });
}

const insert = text => {
    terminal.insertAdjacentHTML('beforeend', `<pre>${ text }</pre>`);
    terminal.scrollTo({ top: terminal.scrollHeight });
}