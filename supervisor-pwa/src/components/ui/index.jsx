import { Loader2, X, AlertTriangle } from 'lucide-react'

export function Spinner({ size = 24, className = '' }) {
  return <Loader2 size={size} className={`animate-spin text-primary-500 ${className}`} />
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={36} />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-300 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-white/10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmSheet({ open, onClose, onConfirm, title, message, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-300 w-full rounded-t-3xl p-6 border-t border-white/10">
        <div className="flex gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-gray-400 text-sm mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-3 rounded-xl flex-1 flex items-center justify-center gap-2 transition-all">
            {loading && <Spinner size={16} />} Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      {Icon && <div className="w-16 h-16 rounded-2xl bg-surface-300 flex items-center justify-center mb-4"><Icon size={28} className="text-gray-600" /></div>}
      <h3 className="text-white font-semibold mb-1">{title}</h3>
      <p className="text-gray-500 text-sm mb-5">{message}</p>
      {action}
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    present: 'badge-green', absent: 'badge-red', half_day: 'badge-orange',
    active: 'badge-green', completed: 'badge-blue', on_hold: 'badge-orange',
    paid: 'badge-green', open: 'badge-orange', in_progress: 'badge-blue', closed: 'badge-green',
    skilled: 'badge-orange', unskilled: 'badge-gray',
  }
  return <span className={map[status] || 'badge-gray'}>{status?.replace(/_/g, ' ')}</span>
}

export function SectionTitle({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-white font-semibold text-base">{title}</h2>
      {action}
    </div>
  )
}

export function InfoRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value || '—'}</span>
    </div>
  )
}
