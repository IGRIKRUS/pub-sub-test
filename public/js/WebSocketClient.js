class WebSocketClient {
    constructor(url, options) {
        this.instance = null
        this.url = url || this.getDefaultHost()
        this.options = options || this.defaultOptions()
        if (this.options) {
            this.reconnectEnabled = options.reconnectEnabled || false
            if (this.reconnectEnabled) {
                this.reconnectInterval = options.reconnectInterval
            }
        }

        this.onOpen = null
        this.onMessage = null
        this.onClose = null
        this.onError = null
    }

    getDefaultHost() {
        return (location.protocol === 'http:' ? 'ws://' : 'wss://') + location.host;
    }

    defaultOptions() {
        return {
            reconnectEnabled: false,
            reconnectInterval: 0
        }
    }

    connect() {
        this.instance = new WebSocket(this.url)

        this.instance.onopen = () => {
            if (typeof this.onOpen === 'function') {
                this.onOpen()
            }
        }

        this.instance.onmessage = (msg) => {
            if (typeof this.onMessage === 'function') {
                this.onMessage(msg)
            }
        }

        this.instance.onclose = (evt) => {
            if (typeof this.onClose === 'function') {
                this.onClose(evt)
            }

            if (!evt.wasClean && this.reconnectEnabled) {
                this.reconnect()
            }
        }

        this.instance.onerror = (evt) => {
            if (typeof this.onError === 'function') {
                this.onError(evt)
            }
        }
    }

    reconnect() {
        delete this.instance
        setTimeout(() => {
            this.connect()
        }, this.reconnectInterval)
    }

    send(message) {
        this.instance.send(message)
    }

    sendObj(data) {
        this.instance.send(JSON.stringify(data))
    }

    removeListeners() {
        this.onOpen = null
        this.onMessage = null
        this.onClose = null
        this.onError = null
    }
}
