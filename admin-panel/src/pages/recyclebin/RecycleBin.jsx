import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, AlertTriangle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { LoadingPage, EmptyState, ConfirmDialog, PageHeader } from '../../components/ui'

const TABS = ['All', 'Labour', 'Sites', 'Machines', 'Drivers', 'Vehicles', 'Users']

const MODEL_KEY = {
  Labour: 'labour',
  Sites: 'sites',
  Machines: 'machines',
  Drivers: 'drivers',
  Vehicles: 'vehicles',
  Users: 'users',
}

function getDisplayName(item, type) {
  if (type === 'Vehicles') return item.registration_number || 'Unknown Vehicle'
  return item.name || 'Unknown'
}

function calcDaysLeft(deletedAt) {
  const elapsed = Math.floor((Date.now() - new Date(deletedAt).getTime()) / 86400000)
  return 30 - elapsed
}

export default function RecycleBin() {
  const [data, setData] = useState({ labour: [], sites: [], machines: [], drivers: [], vehicles: [], users: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All')
  const [confirming, setConfirming] = useState(null) // { model, id, name }
  const [processing, setProcessing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/recycle-bin')
      setData(res.data)
    } catch {
      toast.error('Failed to load recycle bin')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const restore = async (model, id) => {
    setProcessing(`restore-${id}`)
    try {
      await api.post(`/recycle-bin/restore/${model}/${id}`)
      toast.success('Item restored successfully')
      load()
    } catch {
      toast.error('Failed to restore item')
    }
    setProcessing(null)
  }

  const permanentDelete = async () => {
    if (!confirming) return
    setProcessing(`delete-${confirming.id}`)
    try {
      await api.delete(`/recycle-bin/permanent/${confirming.model}/${confirming.id}`)
      toast.success('Permanently deleted')
      setConfirming(null)
      load()
    } catch {
      toast.error('Failed to delete permanently')
    }
    setProcessing(null)
  }

  const getItems = () => {
    if (tab === 'All') {
      const all = [
        ...data.labour.map(i => ({ ...i, _type: 'Labour', _model: 'labour' })),
        ...data.sites.map(i => ({ ...i, _type: 'Sites', _model: 'sites' })),
        ...data.machines.map(i => ({ ...i, _type: 'Machines', _model: 'machines' })),
        ...data.drivers.map(i => ({ ...i, _type: 'Drivers', _model: 'drivers' })),
        ...data.vehicles.map(i => ({ ...i, _type: 'Vehicles', _model: 'vehicles' })),
        ...data.users.map(i => ({ ...i, _type: 'Users', _model: 'users' })),
      ]
      return all.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at))
    }
    const key = MODEL_KEY[tab]
    return (data[key] || []).map(i => ({ ...i, _type: tab, _model: key }))
  }

  const items = getItems()
  const total = Object.values(data).reduce((s, arr) => s + arr.length, 0)

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recycle Bin"
        subtitle={`${total} item${total !== 1 ? 's' : ''} · auto-purged after 30 days`}
      />

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => {
          const count = t === 'All' ? total : (data[MODEL_KEY[t]] || []).length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t}
              {count > 0 && (
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Recycle Bin is Empty"
          message="Deleted items will appear here for 30 days before being permanently removed."
        />
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const left = calcDaysLeft(item.deleted_at)
            const isWarning = left <= 5
            const name = getDisplayName(item, item._type)
            const isProcessing = processing === `restore-${item.id}` || processing === `delete-${item.id}`
            return (
              <div
                key={`${item._model}-${item.id}`}
                className={`card flex items-center gap-4 ${isWarning ? 'border-red-500/30' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-medium truncate">{name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-400 flex-shrink-0">
                      {item._type}
                    </span>
                    {isWarning && (
                      <span className="flex items-center gap-1 text-xs text-red-400 flex-shrink-0">
                        <AlertTriangle size={11} />
                        Deleting in {left} day{left !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Deleted {new Date(item.deleted_at).toLocaleDateString('en-IN')}
                    </span>
                    <span className={isWarning ? 'text-red-400 font-medium' : 'text-gray-500'}>
                      {left > 0 ? `${left} days remaining` : 'Expired'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => restore(item._model, item.id)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30 transition-all disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    Restore
                  </button>
                  <button
                    onClick={() => setConfirming({ model: item._model, id: item.id, name })}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 transition-all disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    Delete Forever
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={permanentDelete}
        title="Permanently Delete"
        message={`Are you sure you want to permanently delete "${confirming?.name}"? This action cannot be undone.`}
        loading={!!processing}
      />
    </div>
  )
}
