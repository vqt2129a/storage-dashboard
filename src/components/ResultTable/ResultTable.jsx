import { useCallback, useMemo, useRef, useState, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDebounce } from '../../hooks/useDebounce'

const PAGE_SIZE = 500
const ROW_HEIGHT = 56
const VIEWPORT_HEIGHT = 400

const FILTERS = ['All', 'Success', 'Pending', 'Error']

const STATUS_CFG = {
  SUCCESS: { cls: 'bg-green-900/40 text-green-400 border border-green-700/30', label: 'SUCCESS' },
  PENDING: { cls: 'bg-amber-900/30 text-amber-400 border border-amber-700/30', label: 'PENDING' },
  ERROR:   { cls: 'bg-red-900/30 text-red-400 border border-red-700/30', label: 'FAILED' },
}

const Row = memo(function Row({ record: r, onRetry, style }) {
  const cfg = STATUS_CFG[r.status] ?? { cls: 'bg-outline/10 text-outline', label: r.status }
  const isError = r.status === 'ERROR'

  return (
    <div
      style={style}
      className={`grid border-b border-outline-variant/5 transition-colors ${isError ? 'hover:bg-error/5 bg-error-container/5' : 'hover:bg-surface-container-high/40'} group`}
    >
      {/* ID */}
      <div className="px-6 py-4 flex items-center">
        <span className={`data-mono text-xs ${isError ? 'text-red-400' : 'text-primary'}`}>
          #{r.id?.slice(0, 6).toUpperCase()}
        </span>
      </div>
      {/* Input */}
      <div className="px-6 py-4 flex items-center overflow-hidden">
        <span className="text-xs text-on-surface truncate">{r.input}</span>
      </div>
      {/* Hash */}
      <div className="px-6 py-4 flex items-center overflow-hidden">
        <span className={`data-mono text-[11px] truncate ${isError ? 'text-red-400/60' : 'text-on-surface-variant/80'}`}>
          {r.hash ? `0x${r.hash.slice(0, 8)}...${r.hash.slice(-4)}` : isError ? 'ERROR_INTEGRITY_FAIL' : '—'}
        </span>
      </div>
      {/* Timestamp */}
      <div className="px-6 py-4 flex items-center">
        <span className="text-xs text-on-surface-variant">
          {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : '—'}
        </span>
      </div>
      {/* Status */}
      <div className="px-6 py-4 flex items-center">
        <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${cfg.cls}`}>{cfg.label}</span>
      </div>
    </div>
  )
})

const COLS = '120px minmax(160px,1fr) minmax(200px,1.5fr) 130px 120px'

export function ResultTable({ records, onRetry }) {
  const [searchInput, setSearchInput] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [page, setPage] = useState(1)
  const parentRef = useRef(null)

  const search = useDebounce(searchInput, 500)

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const statusMap = { All: null, Success: 'SUCCESS', Pending: 'PENDING', Error: 'ERROR' }
    const status = statusMap[filterStatus]
    return records
      .filter(r => !status || r.status === status)
      .filter(r => {
        if (!keyword) return true
        return r.input?.toLowerCase().includes(keyword) ||
          r.hash?.toLowerCase().includes(keyword) ||
          r.id?.toLowerCase().includes(keyword)
      })
  }, [records, search, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)

  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  )

  const virtualizer = useVirtualizer({
    count: paginated.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  const handleFilter = useCallback((f) => { setFilterStatus(f); setPage(1) }, [])

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black tracking-tight">Active Registries</h2>
          {/* Filter tabs */}
          <div className="flex bg-surface-container-lowest rounded-xl p-1 border border-outline-variant/10">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => handleFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${
                  filterStatus === f
                    ? 'bg-surface-container-highest text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-sm">search</span>
          <input
            type="text"
            value={searchInput}
            onChange={e => { setSearchInput(e.target.value); setPage(1) }}
            placeholder="Search hash or ID..."
            className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f0f1e] rounded-[1.5rem] border border-outline-variant/15 overflow-hidden">
        {/* Head */}
        <div
          className="bg-[#0c0c1d] border-b border-outline-variant/10"
          style={{ display: 'grid', gridTemplateColumns: COLS }}
        >
          {['ID', 'Input Sequence', 'Hash Digest', 'Timestamp', 'Status'].map(col => (
            <div key={col} className="px-6 py-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant text-left">
              {col}
            </div>
          ))}
        </div>

        {/* Virtual body */}
        <div
          ref={parentRef}
          style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto', willChange: 'transform' }}
        >
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map(vRow => {
              const r = paginated[vRow.index]
              if (!r) return null
              return (
                <Row
                  key={r.id}
                  record={r}
                  onRetry={onRetry}
                  style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: ROW_HEIGHT,
                    transform: `translateY(${vRow.start}px)`,
                    display: 'grid', gridTemplateColumns: COLS,
                    contain: 'layout paint',
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Footer / Pagination */}
        <footer className="px-6 py-4 bg-[#0c0c1d] flex justify-between items-center border-t border-outline-variant/10">
          <span className="text-[10px] text-on-surface-variant font-label">
            SHOWING {((safePage - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(safePage * PAGE_SIZE, filtered.length).toLocaleString()} OF {filtered.length.toLocaleString()} ITEMS
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/10 text-on-surface-variant disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = safePage <= 3 ? i + 1
                  : safePage >= totalPages - 2 ? totalPages - 4 + i
                  : safePage - 2 + i
                return p >= 1 && p <= totalPages ? (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      p === safePage ? 'bg-primary text-on-primary' : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {p}
                  </button>
                ) : null
              })}

              {totalPages > 5 && <span className="text-on-surface-variant/40 px-1">...</span>}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/10 text-on-surface-variant disabled:opacity-30"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}
