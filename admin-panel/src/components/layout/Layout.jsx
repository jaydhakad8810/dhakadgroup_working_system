import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  LayoutDashboard, Building2, Users, ClipboardCheck, DollarSign,
  Package, Wrench, Truck, Bell, Sparkles, ChevronLeft, ChevronRight,
  LogOut, FileText, BarChart3, Building, UserCog, TrendingUp, BookOpen,
  Map, Sun, Moon, Globe, Menu, X, MoreHorizontal, Trash2, HardHat
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/organisations', icon: Building, label: 'Organisations' },
  { to: '/sites', icon: Building2, label: 'Sites' },
  { to: '/labour', icon: Users, label: 'Labour' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/salary', icon: DollarSign, label: 'Salary' },
  { to: '/expenses', icon: TrendingUp, label: 'Expenses' },
  { to: '/ledger', icon: BookOpen, label: 'Ledger' },
  { to: '/godown', icon: Package, label: 'Godown' },
  { to: '/machines', icon: Wrench, label: 'Machines' },
  { to: '/drivers', icon: Truck, label: 'Drivers' },
  { to: '/trips', icon: Map, label: 'Trips' },
  { to: '/visit-reports', icon: FileText, label: 'Visit Reports' },
  { to: '/boq', icon: BarChart3, label: 'BOQ' },
  { to: '/users', icon: UserCog, label: 'Users' },
  { to: '/supervisors', icon: HardHat, label: 'Supervisors' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/website', icon: Globe, label: 'Website Editor' },
  { to: '/ai', icon: Sparkles, label: 'AI Assistant' },
  { to: '/recycle-bin', icon: Trash2, label: 'Recycle Bin' },
]

// Bottom nav: 4 primary items + "More" button
const bottomNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/labour', icon: Users, label: 'Labour' },
  { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { to: '/godown', icon: Package, label: 'Godown' },
]

// "More" drawer shows everything not in bottom nav
const moreItems = navItems.filter(item => !bottomNavItems.some(b => b.to === item.to))

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()

  const viewMode = localStorage.getItem('dg_admin_view_mode') || 'desktop'
  const isMobileView = viewMode === 'mobile'

  const handleLogout = () => { logout(); navigate('/login') }
  const closeMobile = () => setMobileOpen(false)
  const closeMore = () => setMoreOpen(false)

  // Shared sidebar content (used in both layouts)
  const SidebarContent = ({ mobile = false }) => (
    <>
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-3">
            <img src="/dhakad-logo.png" alt="Dhakad Group" className="h-10 w-auto object-contain" />
            <div>
              <p className="text-white font-bold text-sm">Dhakad Group</p>
              <p className="text-gray-500 text-xs">Admin Panel</p>
            </div>
          </div>
        )}
        {collapsed && !mobile && <img src="/dhakad-logo.png" alt="Dhakad Group" className="h-8 w-auto object-contain mx-auto" />}
        {mobile ? (
          <button onClick={closeMobile} className="text-gray-400 hover:text-white ml-auto">
            <X size={20} />
          </button>
        ) : (
          <button onClick={() => setCollapsed(!collapsed)} className="text-gray-400 hover:text-gold-500 ml-auto">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={mobile ? closeMobile : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium
              ${isActive ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
            }
          >
            <Icon size={17} className="flex-shrink-0" />
            {(!collapsed || mobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all text-gray-400 hover:text-white text-sm"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {(!collapsed || mobile) && <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/50 flex items-center justify-center text-gold-400 text-sm font-bold flex-shrink-0">
            {user?.name?.[0] || 'A'}
          </div>
          {(!collapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{user?.employee_id || user?.email}</p>
            </div>
          )}
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors ml-auto" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  )

  // ── Mobile View Layout ────────────────────────────────────────────────────
  if (isMobileView) {
    return (
      <div className="min-h-screen flex justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-[480px] flex flex-col min-h-screen relative" style={{ background: 'var(--bg)' }}>

          {/* Top bar */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-20"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-gold-500">
              <Menu size={22} />
            </button>
            <img src="/dhakad-logo.png" alt="Dhakad Group" className="h-8 w-auto object-contain flex-1" />
            <div className="w-7 h-7 rounded-full bg-gold-500/20 border border-gold-500/50 flex items-center justify-center text-gold-400 text-xs font-bold">
              {user?.name?.[0] || 'A'}
            </div>
          </div>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto pb-20 p-3">
            <Outlet />
          </main>

          {/* Bottom navigation */}
          <nav
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] border-t z-20 flex"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            {bottomNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-all
                  ${isActive ? 'text-gold-400' : 'text-gray-500 hover:text-gray-300'}`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => setMoreOpen(true)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition-all"
            >
              <MoreHorizontal size={20} />
              <span>More</span>
            </button>
          </nav>

          {/* Hamburger slide-in drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/60" onClick={closeMobile} />
              <aside
                className="absolute left-0 top-0 h-full w-72 flex flex-col border-r z-10"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              >
                <SidebarContent mobile />
              </aside>
            </div>
          )}

          {/* More bottom drawer */}
          {moreOpen && (
            <div className="fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/60" onClick={closeMore} />
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] rounded-t-2xl border-t z-10 p-4"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">More</h3>
                  <button onClick={closeMore} className="text-gray-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2 pb-2">
                  {moreItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={closeMore}
                      className={({ isActive }) =>
                        `flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-xs font-medium transition-all text-center
                        ${isActive ? 'bg-gold-500/20 text-gold-400' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
                      }
                    >
                      <Icon size={20} />
                      <span className="leading-tight">{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Desktop View Layout (default) ────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex ${collapsed ? 'w-16' : 'w-64'} flex-col border-r transition-all duration-300 flex-shrink-0`}
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={closeMobile} />
          <aside
            className="absolute left-0 top-0 h-full w-72 flex flex-col border-r z-10"
            style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
          >
            <SidebarContent mobile />
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div
          className="md:hidden flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-10"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
        >
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-gold-500">
            <Menu size={22} />
          </button>
          <img src="/dhakad-logo.png" alt="Dhakad Group" className="h-8 w-auto object-contain" />
        </div>
        <div className="p-3 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
