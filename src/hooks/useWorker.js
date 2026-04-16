import { useState, useEffect } from 'react'
import { messageBroker } from '../services/messageBroker'

export function useWorker(hydrateRecords) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    messageBroker.onHydrateRecords = hydrateRecords

    messageBroker.open()
      .then(() => setIsReady(true))
      .catch(err => console.error('[useWorker] Failed:', err))
  }, [hydrateRecords])

  return { isReady }
}