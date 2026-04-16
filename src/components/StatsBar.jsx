export function StatsBar({ records }) {
  const total = records.length
  const success = records.filter(r => r.status === 'SUCCESS').length
  const errors = records.filter(r => r.status === 'ERROR').length
  const pending = records.filter(r => r.status === 'PENDING').length
  const successRate = total > 0 ? ((success / total) * 100).toFixed(2) : '0.00'

  const stats = [
    {
      label: 'Total Records',
      value: total >= 1_000_000
        ? `${(total / 1_000_000).toFixed(1)}M`
        : total >= 1_000 ? `${(total / 1_000).toFixed(1)}K` : total.toString(),
      sub: `+${success.toLocaleString()} hashed`,
      color: 'var(--primary)',
    },
    {
      label: 'Collision Rate',
      value: '0.00%',
      sub: 'Optimized one-shot',
      color: 'var(--success)',
    },
    {
      label: 'Success Rate',
      value: `${successRate}%`,
      sub: `${success.toLocaleString()} succeeded`,
      color: 'var(--success)',
    },
    {
      label: 'Errors / Pending',
      value: `${errors} / ${pending}`,
      sub: errors > 0 ? 'Has failed records' : 'All clear',
      color: errors > 0 ? 'var(--error)' : 'var(--outline)',
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 1,
      background: 'var(--outline-variant)',
      borderTop: '1px solid rgba(70,69,84,0.3)',
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{
          background: 'var(--surface-lowest)',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            {s.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: '-0.5px', fontFamily: "'Space Grotesk', monospace" }}>
            {s.value}
          </div>
          <div style={{ fontSize: 11, color: 'var(--outline)', marginTop: 4 }}>
            {s.sub}
          </div>
        </div>
      ))}
    </div>
  )
}
