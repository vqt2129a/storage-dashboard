const RETRY_CONFIG = {
    maxRetries: 3,
    timeoutMs: 10000,
    backoffMs: 1000,
}

class MessageBroker {
    constructor() {
        this.workerWindow = null
        this._iframe = null
        this.isReady = false
        this.openPromise = null
        this.openTimeout = null
        this.pendingRequests = new Map()

        // Dead Letter Queue
        this.deadLetterQueue = []

        // Callbacks
        this.onBatchItem = null
        this.onDeadLetter = null
        this.onHydrateRecords = null

        window.addEventListener('message', this._handleMessage.bind(this))
    }

    open() {
        if (this.isReady && this.isAlive()) return Promise.resolve()
        if (this.openPromise) return this.openPromise

        this.openPromise = new Promise((resolve, reject) => {
            const workerUrl = import.meta.env.VITE_WORKER_URL

            //  hidden iframe
            if (!this._iframe) {
                this._iframe = document.createElement('iframe')
                this._iframe.src = workerUrl
                this._iframe.style.display = 'none'
                document.body.appendChild(this._iframe)
            }


            this._iframe.onload = () => {
                this.workerWindow = this._iframe.contentWindow
            }

            this.openTimeout = setTimeout(() => {
                this.openTimeout = null
                this.openPromise = null
                this.isReady = false
                reject(new Error('Worker iframe timeout'))
            }, 15000)

            this._onReadyResolve = () => {
                if (this.openTimeout) {
                    clearTimeout(this.openTimeout)
                    this.openTimeout = null
                }
                this.isReady = true
                this.openPromise = null
                resolve()
            }
        })

        return this.openPromise
    }

    isAlive() {
        return !!(this._iframe && this._iframe.contentWindow)
    }

    // Wrapper retry + timeout + backoff
    async _sendWithRetry(sendFn, id, context = '') {
        let lastError = null

        for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
            try {
                const result = await Promise.race([sendFn(), this._createTimeout(RETRY_CONFIG.timeoutMs, id)])
                return result
            } catch (err) {
                lastError = err
                this.pendingRequests.delete(id)

                if (attempt < RETRY_CONFIG.maxRetries) {
                    const waitMs = RETRY_CONFIG.backoffMs * attempt
                    console.warn(`[Broker] Retry ${attempt}/${RETRY_CONFIG.maxRetries} for "${context}" - wait ${waitMs}ms`)
                    await new Promise((r) => setTimeout(r, waitMs))
                }
            }
        }

        const errorRecord = {
            id,
            input: context,
            hash: null,
            status: 'ERROR',
            error: lastError?.message,
            timestamp: Date.now(),
        }

        this.deadLetterQueue.push({
            id,
            context,
            error: lastError?.message,
            timestamp: Date.now(),
        })

        this.onDeadLetter?.(errorRecord)
        console.error(`[Broker] Dead Letter: "${context}"`, lastError)

        this.workerWindow?.postMessage(
            { type: 'SAVE_ERROR_RECORD', payload: errorRecord },
            window.location.origin
        )

        return errorRecord
    }

    _createTimeout(ms, id) {
        return new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout ${ms}ms - id: ${id}`)), ms))
    }

    // Send single
    async sendSingle(id, input) {
        return this._sendWithRetry(
            () =>
                new Promise((resolve) => {
                    this.pendingRequests.set(id, { resolve })
                    this.workerWindow.postMessage(
                        {
                            type: 'HASH_REQUEST',
                            id,
                            payload: { input },
                        },
                        window.location.origin
                    )
                }),
            id,
            input
        )
    }

    // Send batch
    async sendBatch(batchId, items) {
        return this._sendWithRetry(
            () =>
                new Promise((resolve) => {
                    this.pendingRequests.set(batchId, { resolve })
                    this.workerWindow.postMessage(
                        { type: 'HASH_BATCH_REQUEST', id: batchId, payload: { items } },
                        window.location.origin
                    )
                }),
            batchId,
            `batch[${items.length}]`
        )
    }

    _handleMessage(event) {
        if (event.origin !== window.location.origin) return
        if (event.source !== this.workerWindow) return

        const { type, id, batchId, payload } = event.data

        switch (type) {
            case 'WORKER_READY':
                this._onReadyResolve?.()
                if (event.data.payload?.existingRecords?.length) {
                    this.onHydrateRecords?.(event.data.payload.existingRecords)
                }
                break

            case 'HASH_RESPONSE':
                if (this.pendingRequests.has(id)) {
                    const { resolve } = this.pendingRequests.get(id)
                    this.pendingRequests.delete(id)
                    resolve(payload)
                }
                break

            case 'HASH_BATCH_ITEM_RESPONSE':
                this.onBatchItem?.(payload)
                break

            case 'HASH_BATCH_COMPLETE':
                if (this.pendingRequests.has(batchId)) {
                    const { resolve } = this.pendingRequests.get(batchId)
                    this.pendingRequests.delete(batchId)
                    resolve({ total: event.data.total })
                }
                break

            case 'CLEAR_ALL_DONE':
                this.onClearAll?.()
                break

            default:
                break
        }
    }

    getDeadLetters() {
        return [...this.deadLetterQueue]
    }

    async retryDeadLetter(deadItem) {
        this.deadLetterQueue = this.deadLetterQueue.filter((d) => d.id !== deadItem.id)
        return this.sendSingle(deadItem.id, deadItem.context)
    }

    clearAll() {
        return new Promise((resolve) => {
            this.onClearAll = () => {
                this.deadLetterQueue = []
                this.onClearAll = null
                resolve()
            }
            this.workerWindow?.postMessage({ type: 'CLEAR_ALL' }, window.location.origin)
        })
    }
}

export const messageBroker = new MessageBroker()
