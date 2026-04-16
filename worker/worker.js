import { keccak256 } from 'js-sha3'
import { saveRecord, saveBatchRecords, getDB, getAllRecords, clearAllRecords } from './db.js'

function hashInput(input) {
  return '0x' + keccak256(input)
}

// Trong iframe: parent = main app. Trong popup: opener = main app.
const sendToMain = (msg) => {
  const target = window.parent !== window ? window.parent : window.opener
  target?.postMessage(msg, window.location.origin)
}

window.addEventListener('message', async (event) => {
  if (event.origin !== window.location.origin) return
  const { type, id, payload } = event.data

  if (type === 'CLEAR_ALL') {
    await clearAllRecords()
    sendToMain({ type: 'CLEAR_ALL_DONE' })
    return
  }

  if (type === 'SAVE_ERROR_RECORD') {
    await saveRecord(payload)
    return
  }

  // 1 item
  if (type === 'HASH_REQUEST') {
    try {
      const hash = hashInput(payload.input)
      const record = { id, input: payload.input, hash, timestamp: Date.now(), status: 'SUCCESS' }
      await saveRecord(record)
      sendToMain({ type: 'HASH_RESPONSE', id, payload: record })
    } catch {
      sendToMain({
        type: 'HASH_RESPONSE', id,
        payload: { id, status: 'ERROR', input: payload.input, hash: null, timestamp: Date.now() }
      })
    }
  }

  // Batch
  if (type === 'HASH_BATCH_REQUEST') {
    const batchId = id
    const { items } = payload
    const results = []
    for (const item of items) {
      const hash = hashInput(item.input)
      const record = { id: item.id, input: item.input, hash, timestamp: Date.now(), status: 'SUCCESS' }
      results.push(record)
      sendToMain({ type: 'HASH_BATCH_ITEM_RESPONSE', batchId, payload: record })
    }
    await saveBatchRecords(results)
    sendToMain({ type: 'HASH_BATCH_COMPLETE', batchId, total: results.length })
  }
})

// Khởi động: load DB → gửi WORKER_READY kèm toàn bộ records
getDB()
  .then(async () => {
    const existingRecords = await getAllRecords()
    sendToMain({ type: 'WORKER_READY', payload: { existingRecords } })
  })
  .catch(err => {
    console.error('Worker error:', err)
  })
