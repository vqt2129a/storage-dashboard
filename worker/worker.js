import { keccak256 } from 'https://esm.sh/js-sha3'
import { saveRecord, saveBatchRecords, getDB, getAllRecords, clearAllRecords } from './db.js'

function hashInput(input) {
  return '0x' + keccak256(input)
}

const sendToMain = (msg) => {
  const target = window.parent !== window ? window.parent : window.opener
  // Quan trọng: Dùng '*' cho targetOrigin để tránh lỗi mismatch origin khi deploy
  target?.postMessage(msg, '*')
}

window.addEventListener('message', async (event) => {
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

getDB()
  .then(async () => {
    const existingRecords = await getAllRecords()
    // Cập nhật UI của trang worker để bạn thấy nó đã sẵn sàng
    const statusEl = document.getElementById('status')
    if (statusEl) {
      statusEl.innerText = 'READY'
      statusEl.style.color = '#4ade80'
    }
    sendToMain({ type: 'WORKER_READY', payload: { existingRecords } })
  })
  .catch(err => {
    console.error('Worker error:', err)
    const statusEl = document.getElementById('status')
    if (statusEl) {
      statusEl.innerText = 'ERROR: ' + err.message
      statusEl.style.color = '#f87171'
    }
  })
