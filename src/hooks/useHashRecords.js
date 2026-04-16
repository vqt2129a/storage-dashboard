import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const FLUSH_INTERVAL_MS = 33

export function useHashRecords() {
  // Primary store for O(1)-ish updates by id.
  const [recordMap, setRecordMap] = useState(() => new Map())
  const [orderedIds, setOrderedIds] = useState([])
  const pendingUpdates = useRef(new Map())
  const flushTimer = useRef(null)

  const records = useMemo(
    () => orderedIds.map((id) => recordMap.get(id)).filter(Boolean),
    [orderedIds, recordMap]
  )

  const flushUpdates = useCallback(() => {
    flushTimer.current = null
    if (pendingUpdates.current.size === 0) return

    const updates = pendingUpdates.current
    pendingUpdates.current = new Map()

    setRecordMap((prev) => {
      const next = new Map(prev)
      for (const [id, record] of updates) {
        next.set(id, record)
      }
      return next
    })
  }, [])

  const scheduleFlush = useCallback(() => {
    if (flushTimer.current) return
    flushTimer.current = setTimeout(flushUpdates, FLUSH_INTERVAL_MS)
  }, [flushUpdates])

  const resetBufferedUpdates = useCallback(() => {
    if (flushTimer.current) {
      clearTimeout(flushTimer.current)
      flushTimer.current = null
    }
    pendingUpdates.current = new Map()
  }, [])

  useEffect(() => {
    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current)
      }
    }
  }, [])

  const addPending = useCallback((id, input) => {
    setOrderedIds((prev) => (prev.includes(id) ? prev : [id, ...prev]))

    setRecordMap((prev) => {
      const next = new Map(prev)
      next.set(id, {
        id,
        input,
        hash: null,
        timestamp: Date.now(),
        status: 'PENDING',
      })
      return next
    })
  }, [])

  const addManyPending = useCallback((items) => {
    if (!items?.length) return

    setOrderedIds((prev) => {
      const existingIds = new Set(prev)
      const newIds = []
      for (const item of items) {
        if (!existingIds.has(item.id)) {
          existingIds.add(item.id)
          newIds.push(item.id)
        }
      }
      return newIds.length > 0 ? [...newIds, ...prev] : prev
    })

    setRecordMap((prev) => {
      const next = new Map(prev)
      const now = Date.now()
      for (const { id, input } of items) {
        next.set(id, { id, input, hash: null, timestamp: now, status: 'PENDING' })
      }
      return next
    })
  }, [])

  const updateRecord = useCallback((record) => {
    if (!record?.id) return

    setOrderedIds((prev) => (prev.includes(record.id) ? prev : [record.id, ...prev]))
    pendingUpdates.current.set(record.id, record)
    scheduleFlush()
  }, [scheduleFlush])

  const hydrateRecords = useCallback((dbRecords) => {
    resetBufferedUpdates()
    const sorted = [...dbRecords].sort((a, b) => b.timestamp - a.timestamp)

    // Merge DB data into current UI state to avoid losing in-memory ERROR items.
    setRecordMap((prev) => {
      const next = new Map(prev)
      for (const record of sorted) {
        const current = next.get(record.id)
        const currentTs = Number(current?.timestamp || 0)
        const incomingTs = Number(record?.timestamp || 0)
        if (!current || incomingTs >= currentTs) {
          next.set(record.id, record)
        }
      }
      return next
    })

    // Keep current order for existing rows; append DB-only rows (newly discovered after reload).
    setOrderedIds((prev) => {
      const known = new Set(prev)
      const appendIds = []
      for (const record of sorted) {
        if (!known.has(record.id)) {
          known.add(record.id)
          appendIds.push(record.id)
        }
      }
      return appendIds.length ? [...prev, ...appendIds] : prev
    })
  }, [resetBufferedUpdates])

  const clearRecords = useCallback(() => {
    resetBufferedUpdates()
    setOrderedIds([])
    setRecordMap(new Map())
  }, [resetBufferedUpdates])

  return { records, addPending, addManyPending, updateRecord, hydrateRecords, clearRecords }
}
