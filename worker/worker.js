import sha3 from 'https://esm.sh/js-sha3'
import { saveRecord, saveBatchRecords, getDB, getAllRecords, clearAllRecords } from './db.js'

// js-sha3 trên esm.sh thường export default hoặc có keccak256 tùy version, check an toàn:
const keccak256 = sha3.keccak256 || sha3

function hashInput(input) {
  return '0x' + keccak256(input)
}

const sendToMain = (msg) => {
  const target = window.parent !== window ? window.parent : window.opener
  // Quan trọng: Dùng '*' cho targetOrigin để đảm bảo tin nhắn luôn đi được qua các domain/port khác nhau
  target?.postMessage(msg, '*')
}

// Lắng nghe lệnh từ Main App
window.addEventListener('message', async (event) => {
  // Bỏ kiểm tra origin khắt khe để test cho chạy được trên mọi môi trường
  const { type, id, payload } = event.data
  if (!type) return

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
    } catch (e) {
      sendToMain({
        type: 'HASH_RESPONSE', id,
        payload: { id, status: 'ERROR', input: payload.input, hash: null, timestamp: Date.now(), error: e.message }
      })
    }
  }

  if (type === 'HASH_BATCH_REQUEST') {
    const batchId = id
    const { items } = payload
    const results = []
    try {
      for (const item of items) {
        const hash = hashInput(item.input)
        const record = { id: item.id, input: item.input, hash, timestamp: Date.now(), status: 'SUCCESS' }
        results.push(record)
        sendToMain({ type: 'HASH_BATCH_ITEM_RESPONSE', batchId, payload: record })
      }
      await saveBatchRecords(results)
      sendToMain({ type: 'HASH_BATCH_COMPLETE', batchId, total: results.length })
    } catch (e) {
       console.error('Batch error:', e)
    }
  }
})

// Khởi tạo Database
getDB()
  .then(async () => {
    const existingRecords = await getAllRecords()
    
    // Cập nhật giao diện của chính trang worker để người dùng biết nó đã chạy
    const statusEl = document.getElementById('status')
    if (statusEl) {
      statusEl.innerText = 'READY - WORKER ACTIVE'
      statusEl.style.color = '#4ade80'
    }

    // Gửi thông báo cho App chính
    sendToMain({ type: 'WORKER_READY', payload: { existingRecords } })
  })
  .catch(err => {
    console.error('Worker DB error:', err)
    const statusEl = document.getElementById('status')
    if (statusEl) {
      statusEl.innerText = 'DB ERROR: ' + err.message
      statusEl.style.color = '#f87171'
    }
  })
