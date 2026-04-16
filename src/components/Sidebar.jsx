import {
  DashboardOutlined,
  DatabaseOutlined,
  NodeIndexOutlined,
  SafetyOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useState } from 'react'

const NAV_ITEMS = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'registry', icon: <DatabaseOutlined />, label: 'Registry', active: true },
  { key: 'workers', icon: <NodeIndexOutlined />, label: 'Workers' },
  { key: 'security', icon: <SafetyOutlined />, label: 'Security' },
  { key: 'users', icon: <TeamOutlined />, label: 'Users' },
]

export function Sidebar({ appName = 'Hash Storage Dashboard' }) {
  const [active, setActive] = useState('registry')

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--surface-lowest)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      borderRight: '1px solid rgba(70,69,84,0.3)',
    }}>
      {/* App logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(70,69,84,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--primary-container), var(--primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#0d0096', fontWeight: 700,
          }}>H</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-surface)', lineHeight: 1.2 }}>
              {appName}
            </div>
          </div>
        </div>

        {/* User */}
        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8, background: 'var(--surface-low)',
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'var(--surface-highest)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 12,
          }}>
            <UserOutlined style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-surface)', lineHeight: 1.2 }}>Admin</div>
            <div style={{ fontSize: 10, color: 'var(--outline)', lineHeight: 1.2 }}>Developer</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {NAV_ITEMS.map(item => (
          <div
            key={item.key}
            onClick={() => setActive(item.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              color: active === item.key ? 'var(--primary)' : 'var(--on-surface-variant)',
              background: active === item.key ? 'rgba(192,193,255,0.08)' : 'transparent',
              transition: 'all 0.15s',
              position: 'relative',
            }}
          >
            {active === item.key && (
              <div style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                width: 3, height: 20, background: 'var(--primary)', borderRadius: '0 2px 2px 0',
              }} />
            )}
            <span style={{ fontSize: 15 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(70,69,84,0.2)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
          fontSize: 13, color: 'var(--on-surface-variant)',
          transition: 'background 0.15s',
        }}>
          <SettingOutlined style={{ fontSize: 15 }} />
          Settings
        </div>
      </div>
    </aside>
  )
}
