function createElement(name = 'div', className = null, attrs = {}) {
    let element = document.createElement(name);

    if (className !== null) {
        element.className = className;
    }

    if (typeof attrs === 'object') {
        let attrObject = Object.entries(attrs);

        if (attrObject.length > 0) {
            attrObject.forEach(function (attribute) {
                if (attribute.length > 1) {
                    element.setAttribute(attribute[0], attribute[1]);
                }
            });
        }
    }

    return element;
}


class BuilderElements {
    createChannel(rootElem, channelName) {
        if (!(rootElem instanceof Element)) {
            throw new Error('Not found instance rootElem!');
        }

        const channelBox = createElement('div', 'channel-box');
        channelBox.style.backgroundColor = "#" + Math.floor(Math.random()*16777215).toString(16);

        const title = createElement('div', 'title');

        const titleSpanChannel = createElement('span');
        titleSpanChannel.innerText = 'Channel name: ' + channelName;

        const titleSpanCounter = createElement('span');
        titleSpanCounter.innerText = 'Receive count: ';

        const counter  = createElement('i', null, {id: 'counter-' + channelName});
        counter.innerText = '0';

        const receiveMsg = createElement('div', 'receive-msg', {id: 'receive-' + channelName});

        titleSpanCounter.append(counter);
        title.append(titleSpanChannel);
        title.append(titleSpanCounter);

        channelBox.append(title);
        channelBox.append(receiveMsg);

        rootElem.append(channelBox);
    }

    createReceive(id, context, num) {
        const el = document.getElementById('receive-' + id);

        if (!(el instanceof Element)) {
            throw new Error('Not found instance Element!');
        }

        const msg = (context instanceof Object) ? JSON.stringify(context) : context;
        const div = createElement('div', 'receive', {title: msg, num: num});

        el.append(div);
    }

    updateCounter(id, num) {
        const el = document.getElementById('counter-' + id);

        if (!(el instanceof Element)) {
            throw new Error('Not found instance Element!');
        }

        const value = el.textContent;
        el.innerText = Number(value) + Number(num);

        return el.innerText;
    }

    randomInteger(min, max) {
        return Math.floor(min + Math.random() * (max + 1 - min));
    }
}

class Message {
    constructor(context, callbackName) {
        this.context = context;
        this.callbackName = callbackName;
    }
}

class Manager {
    constructor(websocket, pubSub) {
        this.async = false;

        if (!(websocket instanceof WebSocketClient)) {
            throw new Error('Not found instance Websocket!');
        }

        websocket.connect();

        if (!(pubSub instanceof PubSubPriority)) {
            throw new Error('Not found instance PubSubPriority!');
        }

        this.websocket = websocket;
        this.pubSub = pubSub;
        this.errorMessage = null;
        this.websocket.onMessage = msg => this.onMessage(msg);
    }

    validateProperty(object, property) {
        // eslint-disable-next-line no-prototype-builtins
        if (!object.hasOwnProperty(property)) {
            throw new Error(`Not found property ${property} in message`);
        }
    }

    onMessage(messageEvent) {
        const message = JSON.parse(messageEvent.data);

        if (!(message instanceof Object)) {
            throw new Error('Message websocket is not instance object!');
        }

        this.validateProperty(message, 'response');

        try {
            this.validateProperty(message, 'callbackName');

            // eslint-disable-next-line no-prototype-builtins
            if (message.response.hasOwnProperty('error')) {
                if (typeof this.errorMessage === 'function') {
                    this.errorMessage(message.response);
                }
                return;
            }

            this.pubSub.publish(
                message.callbackName,
                new Message(message.response, message.callbackName),
                this.async
            );
        } catch (e) {
            console.log(e);
        }
    }

    subscribe(channel, handler, priority = 0, isTemp = false) {
        this.pubSub.subscribe(channel, handler, priority, isTemp);
    }

    sendMessage(message) {
        if (!(message instanceof Message)) {
            throw new Error('Message websocket is not instance MessageSend!');
        }

        this.websocket.sendObj(message);
    }

    uuidV4() {
        return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    sendMessageAndSubscribe(message, handler) {
        if (!(message instanceof Message)) {
            throw new Error('Message websocket is not instance MessageSend!');
        }

        if (message.callbackName === undefined) {
            message.callbackName = this.uuidV4();

            this.pubSub.subscribe(message.callbackName, handler, 0, true);
        } else {
            this.pubSub.subscribe(message.callbackName, handler);
        }

        this.sendMessage(message);
    }
}