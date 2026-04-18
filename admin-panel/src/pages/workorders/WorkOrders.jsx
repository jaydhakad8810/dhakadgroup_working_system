import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ClipboardList, Home, Building2, Droplets, Calendar, Layers, Trash2 } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const TYPE_META = {
  internal: { label: 'Internal Paint', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',  icon: Home },
  external: { label: 'External Paint', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Building2 },
  oil:      { label: 'Oil Paint',      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Droplets },
}

const STATUS_META = {
  draft:     { label: 'Draft',     color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  active:    { label: 'Active',    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
}

export default function WorkOrders() {
  const navigate = useNavigate()
  const [workOrders, setWorkOrders] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ site_id: '', status: '', type: '' })

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.site_id) params.append('site_id', filters.site_id)
      if (filters.status)  params.append('status',  filters.status)
      if (filters.type)    params.append('type',    filters.type)
      const [wo, s] = await Promise.all([api.get('/workorders?' + params), api.get('/sites')])
      setWorkOrders(Array.isArray(wo.data) ? wo.data : [])
      setSites(Array.isArray(s.data) ? s.data : [])
    } catch { toast.error('Failed to load work orders') }
    setLoading(false)
  }

  useEffect(() => { load() }, [filters])

  const f = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  const handleDelete = async (e, woId) => {
    e.stopPropagation()
    if (!window.confirm('Delete this work order? This cannot be undone.')) return
    try {
      await api.delete(`/workorders/${woId}`)
      toast.success('Work order deleted')
      setWorkOrders(prev => prev.filter(w => w.id !== woId))
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Work Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage paint &amp; construction work orders</p>
        </div>
        <button onClick={() => navigate('/workorders/create')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-400 transition-all">
          <Plus size={18} /> Create Work Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.site_id} onChange={e => f('site_id', e.target.value)}
          className="select min-w-[160px]">
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.type} onChange={e => f('type', e.target.value)}
          className="select">
          <option value="">All Types</option>
          <option value="internal">Internal</option>
          <option value="external">External</option>
          <option value="oil">Oil Paint</option>
        </select>
        <select value={filters.status} onChange={e => f('status', e.target.value)}
          className="select">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : workOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={48} className="text-gray-600 mb-3" />
          <p className="text-gray-400 font-semibold">No work orders found</p>
          <p className="text-gray-500 text-sm mt-1">Create your first work order to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workOrders.map(wo => {
            const typeMeta   = TYPE_META[wo.type]   || TYPE_META.internal
            const statusMeta = STATUS_META[wo.status] || STATUS_META.draft
            const TypeIcon   = typeMeta.icon
            return (
              <div key={wo.id} onClick={() => navigate('/workorders/' + wo.id)}
                className="bg-surface-300 border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-yellow-500/40 hover:bg-surface-200 transition-all space-y-4 relative">
                <button
                  onClick={(e) => handleDelete(e, wo.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all z-10"
                  title="Delete work order"
                >
                  <Trash2 size={13} />
                </button>
                {/* Badges */}
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${typeMeta.color}`}>
                    <TypeIcon size={12} />{typeMeta.label}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusMeta.color}`}>
                    {statusMeta.label}
                  </span>
                </div>

                {/* Title + Site */}
                <div>
                  <h3 className="text-white font-semibold text-base leading-snug">{wo.title}</h3>
                  <p className="text-gray-400 text-sm mt-0.5">{wo.site?.name}</p>
                </div>

                {/* Date range */}
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Calendar size={12} />
                  <span>{wo.start_date} → {wo.end_date}</span>
                </div>

                {/* Footer counts */}
                <div className="flex items-center gap-4 pt-1 border-t border-white/5 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Layers size={11} />{wo.step_count || 0} steps</span>
                  <span>{wo.material_count || 0} materials</span>
                  {wo.flat_count > 0 && <span>{wo.flat_count} flats</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
