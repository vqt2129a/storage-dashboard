import { openDB } from 'idb'

const DB_NAME = 'HashStorage'
const STORE_NAME = 'records'

let dbPromise = null 
export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        // Tạo "bảng" records với keyPath là 'id'
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp')
        store.createIndex('status', 'status')
      }
    })
  }
  return dbPromise
}

//Save 1
export async function saveRecord (record){
  const db = await getDB()
  return db.put(STORE_NAME, record)
}

// Save batch
export async function saveBatchRecords(records) {
  const db = await getDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  await Promise.all([...records.map(r => tx.store.put(r)), 
    tx.done
  ])
}