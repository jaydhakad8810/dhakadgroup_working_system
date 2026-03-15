import { Loader2, X, AlertTriangle } from 'lucide-react'

export function Spinner({ size = 24 }) {
  return <Loader2 size={size} className="animate-spin text-primary-500" />
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-300 w-full rounded-t-3xl max-h-[92vh] overflow-y-auto border-t border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    ongoing: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red',
    available: 'badge-green', in_use: 'badge-blue', maintenance: 'badge-orange',
  }
  return <span className={map[status] || 'badge-gray'}>{status?.replace(/_/g, ' ')}</span>
}

export function InfoRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-medium ${valueClass}`}>{value || '—'}</span>
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
