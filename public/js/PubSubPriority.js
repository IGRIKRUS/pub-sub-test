class Handler {
    constructor(handler, priority=0) {
        this.index = null;
        this.handler = handler;
        this.priority = priority;
    }
}

class PubSubPriority {
    constructor() {
        this.subscribers = new Map;
    }

    sort(handlerList) {
        handlerList.sort((a, b) => a.priority - b.priority);
    }

    subscribe(channel, handler, priority = 0, isTemp=false) {
        const {handlerList} = this.subscribers.has(channel) ? this.subscribers.get(channel) : {handlerList: []};
        const newHandler = new Handler(handler, priority);

        if (handlerList.length > 0) {
            newHandler.index = handlerList.push(newHandler);
            this.sort(handlerList);
        } else {
            newHandler.index = handlerList.push(newHandler);
        }

        this.subscribers.set(channel, {handlerList: handlerList, isTemp: isTemp});

        return newHandler.index;
    }

    publish(channel, message, async = false) {
        if (this.subscribers.has(channel)) {
            const {handlerList, isTemp} = this.subscribers.get(channel);

            if (handlerList instanceof Array) {
                handlerList.forEach(o => {
                    if (async) {
                        async function asyncFn() {
                            return await o.handler(message);
                        }

                        this.timeExecute(asyncFn, 'async ' + o.handler.name);
                    } else {
                        this.timeExecute(() => {o.handler(message)}, 'sync ' + o.handler.name);
                    }
                });
            }

            if (isTemp) {
                this.unsubscribeChannel(channel);
            }
        }
    }

    timeExecute(fn, title) {
        console.time(title);
        fn();
        console.timeEnd(title);
    }

    unsubscribeAll() {
        this.subscribers = new Map;
    }

    unsubscribeChannel(channel) {
        if (typeof channel === 'string') {
            this.subscribers.delete(channel);

            return true;
        }

        return false;
    }

    unsubscribeHandler(channel, handlerIndex) {
        if (this.subscribers.has(channel) && typeof handlerIndex === 'number') {
            const {handlerList, isTemp} = this.subscribers.get(channel);

            if (handlerList.length > 0) {
                handlerList.forEach((e, i) => {
                    if (e.index === handlerIndex) {
                        handlerList.splice(i, 1);
                        return true;
                    }
                });

                this.sort(handlerList);
            }

            this.subscribers.set(channel, {handlerList: handlerList, isTemp: isTemp});

            return true;
        }

        return false;
    }
}