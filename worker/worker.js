import { keccak256 } from 'js-sha3'
import { saveRecord, saveBatchRecords, getDB } from './db.js'

function hashInput (input){
    return '0x' + keccak256(input)
}


window.addEventListener('message', async (event) => {
  if (event.origin !== window.location.origin) return
  const { type, id, payload } = event.data

  // 1 item
  if (type === 'HASH_REQUEST') {
    try {
      const hash = hashInput(payload.input)
      const record = {
        id,
        input: payload.input,
        hash,
        timestamp: Date.now(),
        status: 'SUCCESS'
      }
      await saveRecord(record)
      //  Main App
      window.opener.postMessage({
        type: 'HASH_RESPONSE',
        id,          
        payload: record
      }, window.location.origin)
    } catch (err) {
      window.opener.postMessage({
        type: 'HASH_RESPONSE',
        id,
        payload: { id, status: 'ERROR', input: payload.input, hash: null, timestamp: Date.now() }
      }, window.location.origin)
    }
  }

  // batch
  if (type === 'HASH_BATCH_REQUEST') {
    const batchId = id
    const { items } = payload
    const results = []
    for (const item of items) {
      const hash = hashInput(item.input)
      const record = {
        id: item.id,
        input: item.input,
        hash,
        timestamp: Date.now(),
        status: 'SUCCESS'
      }
      results.push(record)
      // Update UI realtime
      window.opener.postMessage({
        type: 'HASH_BATCH_ITEM_RESPONSE',
        batchId,
        payload: record
      }, window.location.origin)
    }

    //Save bathch
    await saveBatchRecords(results)
    window.opener.postMessage({
      type: 'HASH_BATCH_COMPLETE',
      batchId,
      total: results.length
    }, window.location.origin)
  }
})

//Start
getDB()
  .then(() => {
    document.getElementById('status').textContent = 'Worker Ready'
    window.opener?.postMessage({ type: 'WORKER_READY' }, window.location.origin)
  })
  .catch(err => {
    document.getElementById('status').textContent = 'Worker Error'
    console.error('Worker init failed:', err)
  })