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

export { Toast };