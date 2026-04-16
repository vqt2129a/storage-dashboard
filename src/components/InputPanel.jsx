import { useState, useEffect } from 'react'
import { generateId } from '../utils/idGenerator'
import { messageBroker } from '../services/messageBroker'

const QUICK_OPTIONS = [
  { label: '100', count: 100 },
  { label: '1K', count: 1_000 },
  { label: '10K', count: 10_000 },
  { label: '100K', count: 100_000 },
]
const CHUNK_SIZE = 100

export function InputPanel({ isWorkerReady, addPending, addManyPending, updateRecord }) {
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    messageBroker.onBatchItem = updateRecord
  }, [updateRecord])

  const handleSingleHash = async () => {
    if (!text.trim() || !isWorkerReady) return
    const id = generateId()
    addPending(id, text)
    setText('')
    const result = await messageBroker.sendSingle(id, text)
    updateRecord(result)
  }

  const handleQuickGenerate = async (count) => {
    if (!isWorkerReady || isProcessing) return
    setIsProcessing(true)
    setProgress({ done: 0, total: count })

    const items = Array.from({ length: count }, (_, i) => ({
      id: generateId(),
      input: `auto-item-${i}-${Date.now()}`,
      createdAt: Date.now(),
    }))
    addManyPending(items)

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      if (!messageBroker.isAlive()) {
        items.slice(i).forEach(item =>
          updateRecord({ ...item, hash: null, status: 'ERROR', error: 'Worker closed', timestamp: Date.now() })
        )
        break
      }
      const chunk = items.slice(i, i + CHUNK_SIZE)
      const result = await messageBroker.sendBatch(generateId(), chunk)
      if (result?.status === 'ERROR') {
        chunk.forEach(item =>
          updateRecord({ ...item, hash: null, status: 'ERROR', error: result.error || 'Batch failed', timestamp: Date.now() })
        )
      }
      setProgress({ done: Math.min(i + CHUNK_SIZE, count), total: count })
      await new Promise(r => setTimeout(r, 0))
    }

    setIsProcessing(false)
    setProgress({ done: 0, total: 0 })
  }

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Left: input + batch */}
      <div className="flex-1 w-full">
        <label className="block text-primary font-label text-[10px] uppercase tracking-[0.2em] mb-4">
          Input
        </label>
        <div className="relative group">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSingleHash() } }}
            disabled={!isWorkerReady}
            placeholder="Enter payload for cryptographic processing..."
            rows={3}
            className="w-full bg-[#0c0c1d] border border-outline-variant/30 rounded-2xl p-4 text-on-surface data-mono focus:outline-none focus:ring-1 focus:ring-surface-tint focus:border-surface-tint transition-all placeholder:text-on-surface-variant/30 resize-none disabled:opacity-40"
          />
          {text && (
            <button
              onClick={() => setText('')}
              className="absolute bottom-4 right-4 bg-surface-container-highest/80 hover:bg-surface-container-highest text-[10px] px-3 py-1 rounded-lg border border-outline-variant/20 transition-all text-on-surface-variant font-label"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* Batch */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mr-2">QUICK GENERATE:</span>
          {QUICK_OPTIONS.map(opt => (
            <button
              key={opt.count}
              onClick={() => handleQuickGenerate(opt.count)}
              disabled={!isWorkerReady || isProcessing}
              className="bg-surface-container-low hover:bg-surface-container-high px-4 py-2 rounded-xl text-xs font-label text-on-surface transition-all border border-outline-variant/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right: HASH button + system load */}
      <div className="w-full md:w-80 flex flex-col gap-6">
        <button
          onClick={handleSingleHash}
          disabled={!isWorkerReady || !text.trim()}
          className="w-full bg-gradient-to-br from-primary to-primary-container h-24 rounded-2xl flex items-center justify-center gap-3 group disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          <span className="material-symbols-outlined text-4xl text-on-primary">security</span>
          <span className="text-2xl font-black tracking-tight text-on-primary">HASH</span>
        </button>

        <div className="bg-[#0c0c1d] p-4 rounded-2xl border border-outline-variant/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">System Load</span>
            <span className="text-[10px] data-mono text-primary">{percent}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full shadow-[0_0_12px_#c0c1ff] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          {isProcessing && (
            <div className="mt-2 text-[10px] text-on-surface-variant data-mono">
              {progress.done.toLocaleString()} / {progress.total.toLocaleString()} items
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
