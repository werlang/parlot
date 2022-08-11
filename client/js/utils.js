class Toast {
    constructor(text, { timeOut=null, position='center' }={}) {
        let container = document.querySelector('#toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.append(container);
        }

        this.element = document.createElement('div');
        this.element.classList.add('toast');
        this.element.innerHTML = text;
        
        this.timeOut = timeOut;
        
        if (position == 'center') {
            container.classList.add('center');
        }

        container.prepend(this.element);

        if (this.timeOut > 0) {
            this.fade();
        }
        return this;
    }

    fade(timeOut) {
        if (!timeOut) {
            timeOut = this.timeOut;
        }
        setTimeout(() => this.element.classList.add('fade'), timeOut - 1000);
        setTimeout(() => this.element.remove(), timeOut);
        setTimeout(() => {
            this.element.remove();

            if (!document.querySelector('#toast-container .toast') && document.querySelector('#toast-container')) {
                document.querySelector('#toast-container').remove();
            }
        }, timeOut);
    }
}


// Options:
// id: put an id to the modal window
// large: modal window will have higher width
// fog.close: clicking the fog will remove the modal. default true
// fog.dark: fog will be black
// fog.invisible: fog will be invisible
// buttonClose: id of the button that will close the modal
class Modal {
    constructor(text, options = {}) {
        if (document.querySelector('#fog.modal')){
            document.querySelector('#fog.modal').remove();
        }

        const fog = document.createElement('div');
        fog.id = 'fog';
        fog.innerHTML = `<div class='modal'><div id="content">${text}</div></div>`;

        this.domObject = fog.querySelector('.modal');
        if (options.id){
            this.domObject.id = options.id;
        }
        if (options.large){
            this.domObject.classList.add('large');
        }

        this.fogClose = options.fog ? (options.fog.close || false) : true;
        if (this.fogClose){
            fog.addEventListener('click', () => fog.remove());
            fog.querySelector('div').addEventListener('click', e => e.stopPropagation());
        }

        if (options.fog && options.fog.dark){
            fog.classList.add('dark');
        }

        if (options.fog && options.fog.invisible){
            fog.classList.add('invisible');
        }

        if (options.buttonClose){
            fog.querySelector(`#${options.buttonClose}`).addEventListener('click', () => fog.remove());
        }

        document.body.appendChild(fog);
        fadeIn(fog, 500);

        if (options.events){
            options.events.forEach(event => {
                this.addEvent(event);
            })
        }
    }

    addEvent(event){
        let selector = '';
        let attr = event.tag;
        if (event.id){
            selector = '#';
            attr = event.id;
        }
        else if (event.class){
            selector = '.';
            attr = event.class;
        }

        const obj = this.domObject.querySelector(`${selector}${attr}`);
        obj.addEventListener(event.event, event.callback);

        return this;
    }

    close() {
        this.domObject.parentNode.remove();
    }

    getDOMElement() {
        return this.domObject;
    }
}


// fade in and out function (work on any element)
async function fadeIn(elem, time=300){
    return new Promise(resolve => {
        const oldStyle = elem.getAttribute('style');
        elem.style.transition = `${time/1000}s opacity`;
        elem.style.opacity = '0';
    
        setTimeout(() => elem.style.opacity = '1', 1);
        setTimeout(() => {
            elem.removeAttribute('style');
            elem.style = oldStyle;
            resolve(true);
        }, time + 100);
    });
}

async function fadeOut(elem, time=300){
    return new Promise(resolve => {
        elem.style.transition = `${time/1000}s opacity`;
        
        setTimeout(() => elem.style.opacity = '0', 1);
        setTimeout(() => {
            elem.remove();
            resolve(true);
        }, time + 100);
    });
}


export { Toast, Modal, fadeIn, fadeOut };