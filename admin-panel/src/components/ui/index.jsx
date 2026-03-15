import { X, Loader2, AlertTriangle } from 'lucide-react'

// Modal
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-dark-900 border border-dark-700 rounded-2xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// Confirm Dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-gray-400 text-sm">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger">
            {loading ? <Loader2 size={16} className="animate-spin" /> : null} Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

// Page Header
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// Loading spinner
export function Spinner({ size = 24 }) {
  return <Loader2 size={size} className="animate-spin text-gold-500" />
}

// Loading page
export function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={40} />
    </div>
  )
}

// Empty state
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={48} className="text-dark-600 mb-4" />}
      <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-6">{message}</p>
      {action}
    </div>
  )
}

// Status Badge
export function StatusBadge({ status }) {
  const map = {
    active: 'badge-green', completed: 'badge-blue', on_hold: 'badge-gold',
    cancelled: 'badge-red', present: 'badge-green', absent: 'badge-red',
    half_day: 'badge-gold', paid: 'badge-green', pending: 'badge-gold',
    approved: 'badge-green', available: 'badge-green', in_use: 'badge-blue',
    maintenance: 'badge-gold', retired: 'badge-gray', ongoing: 'badge-blue',
    open: 'badge-gold', in_progress: 'badge-blue', closed: 'badge-green',
    skilled: 'badge-gold', unskilled: 'badge-gray'
  }
  return <span className={map[status] || 'badge-gray'}>{status?.replace(/_/g, ' ')}</span>
}

// Stats Card
export function StatCard({ icon: Icon, label, value, color = 'gold', sub }) {
  const colors = {
    gold: 'bg-gold-500/20 text-gold-400',
    green: 'bg-green-500/20 text-green-400',
    blue: 'bg-blue-500/20 text-blue-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
  }
  return (
    <div className="stat-card">
      <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-white text-2xl font-bold">{value ?? '—'}</p>
        {sub && <p className="text-gray-500 text-xs">{sub}</p>}
      </div>
    </div>
  )
}

// Form Field
export function Field({ label, error, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// Search input
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input max-w-xs"
    />
  )
}

// InfoRow - label/value pair used in detail pages
export function InfoRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-dark-700 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value || '—'}</span>
    </div>
  )
}
