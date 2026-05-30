import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Package, ClipboardList, BarChart3 } from 'lucide-react'

const items = [
  { to: '/',         icon: LayoutDashboard, label: 'Home'    },
  { to: '/plan',     icon: ClipboardList,   label: 'Plan'    },
  { to: '/labour',   icon: Users,           label: 'Labour'  },
  { to: '/godown',   icon: Package,         label: 'Godown'  },
  { to: '/reports',  icon: BarChart3,       label: 'Reports' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-surface-500/98 backdrop-blur-lg border-t border-white/5"
      style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.4)' }}>
      <div className="flex items-center justify-around px-1 py-1 safe-area-pb">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all ${isActive ? 'text-primary-500' : 'text-gray-500'}`
            }>
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary-500/15' : ''}`}>
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
