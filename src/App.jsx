import { useEffect, useState } from 'react'
import { useWorker } from './hooks/useWorker'
import { useHashRecords } from './hooks/useHashRecords'
import { InputPanel } from './components/InputPanel'
import { ResultTable } from './components/ResultTable/ResultTable'
import { messageBroker } from './services/messageBroker'

const NAV_ITEMS = [
  { icon: 'dashboard', label: 'Dashboard' },
  { icon: 'storage', label: 'Registry', active: true },
  { icon: 'memory', label: 'Workers' },
  { icon: 'shield', label: 'Security' },
  { icon: 'bar_chart', label: 'Usage' },
]

const TABS = ['Explorer', 'Collections', 'Compute', 'Logs']
const ACTIVE_TAB = 'Compute'

function App() {
  const { records, addPending, addManyPending, updateRecord, hydrateRecords, clearRecords } = useHashRecords()
  const { isReady } = useWorker(hydrateRecords)
  const [sideNavOpen, setSideNavOpen] = useState(false)

  useEffect(() => {
    messageBroker.onDeadLetter = (errorRecord) => updateRecord(errorRecord)
  }, [updateRecord])


  const handleClearAll = async () => {
    if (!window.confirm('Xóa toàn bộ dữ liệu?')) return
    await messageBroker.clearAll()
    clearRecords()
  }

  const retryRecord = async (record) => {
    updateRecord({ ...record, status: 'PENDING', hash: null })
    const result = await messageBroker.sendSingle(record.id, record.input)
    updateRecord(result)
  }

  const total = records.length
  const success = records.filter(r => r.status === 'SUCCESS').length
  const errors = records.filter(r => r.status === 'ERROR').length

  const fmtCount = (n) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
        : n.toString()

  return (
    <>
      <div className="lg:hidden fixed bottom-6 right-6 z-[60]">
        <button
          onClick={() => setSideNavOpen(v => !v)}
          className="w-14 h-14 rounded-full bg-primary text-on-primary shadow-2xl flex items-center justify-center"
        >
          <span className="material-symbols-outlined">{sideNavOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Overlay sidebar */}
      {sideNavOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setSideNavOpen(false)}
        />
      )}

      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full flex justify-between items-center px-4 md:px-8 h-16 bg-[#1e1e2f]/60 backdrop-blur-xl text-primary font-semibold text-sm tracking-tight z-50 shadow-[0_20px_40px_rgba(19,20,74,0.1)]">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl md:text-2xl">database</span>
            <span className="text-lg md:text-xl font-black text-on-surface tracking-tighter truncate max-w-[130px] md:max-w-none">
              Hash Storage Dashboard
            </span>
          </div>
          <div className="hidden xl:flex items-center gap-6 ml-8">
            {TABS.map(tab => (
              <a key={tab} href="#"
                className={tab === ACTIVE_TAB
                  ? 'text-primary border-b-2 border-primary pb-1'
                  : 'text-on-surface/60 hover:bg-surface-container-highest/50 transition-colors px-3 py-1 rounded-lg'
                }
              >{tab}</a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Status indicator  */}
          <div className="hidden sm:flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full">
            <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-outline animate-pulse'}`} />
            <span className={`text-xs data-mono font-medium ${isReady ? 'text-green-400' : 'text-outline'}`}>
              {isReady ? 'Ready' : 'Loading...'}
            </span>
          </div>

          <button
            onClick={handleClearAll}
            disabled={!isReady}
            className="bg-error-container text-on-error-container px-3 md:px-4 py-1.5 rounded-xl font-bold text-[10px] md:text-xs scale-95 active:scale-90 transition-transform disabled:opacity-40"
          >
            Clear All
          </button>

          <div className="flex items-center gap-2 md:gap-3 ml-2 md:ml-4">
            <span className="material-symbols-outlined text-on-surface/60 hover:text-on-surface cursor-pointer text-xl md:text-2xl">settings</span>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        id="side-nav"
        className={`
          fixed left-0 top-0 h-full flex flex-col bg-[#0c0c1d] w-64 z-40 pt-20
          border-r border-outline-variant/10 transition-transform duration-300 ease-in-out
          ${sideNavOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <nav className="flex-1 space-y-1 pt-4">
          {NAV_ITEMS.map(item => (
            <div key={item.label}
              onClick={() => setSideNavOpen(false)}
              className={`group flex items-center gap-4 transition-all cursor-pointer py-3
                ${item.active
                  ? 'text-primary font-bold border-l-4 border-primary pl-[20px] bg-surface-container/30'
                  : 'text-on-surface/40 pl-6 hover:text-on-surface hover:bg-surface-container/20'
                }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label text-xs uppercase tracking-widest">{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="px-6 py-4">
          <div className="flex flex-col gap-2 border-t border-outline-variant/10 pt-4">
            {[['menu_book', 'Docs'], ['help', 'Support']].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-3 text-on-surface/40 hover:text-on-surface transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-sm">{icon}</span>
                <span className="font-label text-[10px] uppercase tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-20 md:pt-24 px-4 md:px-10 pb-16 transition-all duration-300">

        {/* Input Section */}
        <section className="mb-8 md:mb-12">
          <div className="glass-panel p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-outline-variant/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -mr-32 -mt-32 pointer-events-none hidden md:block" />
            <InputPanel
              isWorkerReady={isReady}
              addPending={addPending}
              addManyPending={addManyPending}
              updateRecord={updateRecord}
            />
          </div>
        </section>

        {/* Table */}
        <section className="space-y-6">
          <ResultTable records={records} onRetry={retryRecord} />
        </section>

        {/* Stats Grid */}
        <section className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {[
            {
              label: 'Total Hashed', value: fmtCount(total),
              sub: `+${fmtCount(success)} success`, icon: 'trending_up', color: 'text-primary'
            },
            {
              label: 'Success Rate',
              value: total > 0 ? `${((success / total) * 100).toFixed(1)}%` : '0%',
              sub: `${fmtCount(success)} records`, icon: 'bolt', color: 'text-green-400'
            },
            {
              label: 'Errors', value: fmtCount(errors),
              sub: errors > 0 ? 'Has failed records' : 'All clear',
              icon: errors > 0 ? 'warning' : 'check_circle',
              color: errors > 0 ? 'text-error' : 'text-on-surface-variant'
            },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">{stat.label}</p>
              <p className="text-2xl md:text-3xl font-black data-mono text-on-surface">{stat.value}</p>
              <div className={`mt-4 flex items-center gap-2 text-[10px] ${stat.color}`}>
                <span className="material-symbols-outlined text-sm">{stat.icon}</span>
                <span>{stat.sub}</span>
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Background decorative */}
      <div className="fixed bottom-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-primary/5 blur-[80px] md:blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-0 left-0 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-secondary/5 blur-[60px] md:blur-[100px] rounded-full pointer-events-none -z-10" />
    </>
  )
}

export default App
