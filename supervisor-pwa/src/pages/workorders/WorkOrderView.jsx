import { ClipboardList, ChevronDown, ChevronUp, CheckCircle, Clock, Package, Layers, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../utils/api'
import toast from 'react-hot-toast'

function StepProgressRow({ step, totalFlats }) {
  const done = step.done_count || 0
  const pct = totalFlats > 0 ? Math.round((done / totalFlats) * 100) : 0
  const color = pct === 100 ? '#10B981' : pct > 0 ? '#F97316' : '#6B7280'
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-sm text-white flex-1">{step.step_name}</span>
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: pct + '%', background: color }} />
        </div>
        <span className="text-xs w-8 text-right" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

function MaterialRow({ mat }) {
  const used = parseFloat(mat.used_quantity) || 0
  const total = parseFloat(mat.total_quantity) || 0
  const remaining = total - used
  const pct = total > 0 ? Math.round((used / total) * 100) : 0
  const isLow = remaining > 0 && remaining < total * 0.2
  const isExhausted = remaining <= 0
  return (
    <div className="card-sm mb-2">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm text-white font-medium">{mat.product_name}</p>
          <p className="text-xs text-gray-400">{mat.company_name} · {mat.unit}</p>
        </div>
        {isExhausted && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Exhausted</span>}
        {isLow && !isExhausted && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">Low</span>}
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
        <div className="h-full rounded-full bg-primary-500" style={{ width: pct + '%' }} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Used: {used} {mat.unit}</span>
        <span>Remaining: <span className={isLow || isExhausted ? 'text-orange-400' : 'text-white'}>{remaining.toFixed(1)} {mat.unit}</span></span>
      </div>
    </div>
  )
}

function WorkOrderCard({ wo }) {
  const [expanded, setExpanded] = useState(false)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const toggle = async () => {
    if (!expanded && !progress) {
      setLoading(true)
      try {
        const res = await api.get(`/workorders/${wo.id}/progress`)
        setProgress(res.data)
      } catch { toast.error('Failed to load progress') }
      setLoading(false)
    }
    setExpanded(v => !v)
  }

  const typeColor = wo.type === 'internal' ? '#3B82F6' : wo.type === 'external' ? '#10B981' : '#F97316'
  const typeBg = wo.type === 'internal' ? 'bg-blue-500/20 text-blue-400' : wo.type === 'external' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
  const totalFlats = progress?.total_flats || 0
  const overallPct = progress?.overall_percent || 0

  return (
    <div className="card mb-3" style={{ borderLeft: `3px solid ${typeColor}` }}>
      <div className="flex items-center justify-between cursor-pointer" onClick={toggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeBg}`}>{wo.type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              wo.status === 'active' ? 'bg-green-500/20 text-green-400' :
              wo.status === 'completed' ? 'bg-gold-500/20 text-gold-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>{wo.status}</span>
          </div>
          <p className="text-white font-semibold text-sm truncate">{wo.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{wo.start_date} → {wo.end_date}</p>
        </div>
        <div className="flex items-center gap-2 ml-3">
          {progress && (
            <span className="text-lg font-bold text-primary-400">{overallPct}%</span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-white/10 pt-3">
          {loading && <p className="text-xs text-gray-500 text-center py-4">Loading progress...</p>}

          {progress && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="card-sm text-center">
                  <p className="text-lg font-bold text-primary-400">{overallPct}%</p>
                  <p className="text-xs text-gray-500">Overall</p>
                </div>
                <div className="card-sm text-center">
                  <p className="text-lg font-bold text-white">{totalFlats}</p>
                  <p className="text-xs text-gray-500">Flats</p>
                </div>
                <div className="card-sm text-center">
                  <p className="text-lg font-bold text-green-400">
                    {progress.steps_progress?.filter(s => s.done_count === totalFlats && totalFlats > 0).length || 0}
                  </p>
                  <p className="text-xs text-gray-500">Steps Done</p>
                </div>
              </div>

              {progress.steps_progress?.length > 0 && (
                <div className="card-sm mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Layers size={12} /> Steps
                  </p>
                  {progress.steps_progress.map(s => (
                    <StepProgressRow key={s.step_id} step={s} totalFlats={totalFlats} />
                  ))}
                </div>
              )}

              {progress.materials_progress?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Package size={12} /> Materials
                  </p>
                  {progress.materials_progress.map(m => (
                    <MaterialRow key={m.id} mat={m} />
                  ))}
                </div>
              )}
            </>
          )}

          <button
            className="btn-primary w-full mt-3 flex items-center justify-center gap-2 min-h-[44px]"
            onClick={() => navigate('/godown?request=true&wo_id=' + wo.id)}
          >
            <Package size={16} /> Request Material from Godown
          </button>
        </div>
      )}
    </div>
  )
}

export default function WorkOrderView() {
  const [workOrders, setWorkOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  const load = () => {
    setLoading(true)
    api.get('/workorders')
      .then(res => setWorkOrders(res.data?.data || res.data || []))
      .catch(() => toast.error('Failed to load work orders'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = workOrders.filter(wo =>
    filter === 'all' ? true : wo.status === filter
  )

  return (
    <div className="page-content" style={{ paddingBottom: 100 }}>
      <div className="card mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList size={18} className="text-primary-400" />
            Work Orders
          </h1>
          <button onClick={load} className="btn-ghost p-2">
            <RefreshCw size={15} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Your site's work orders and progress</p>
      </div>

      <div className="flex gap-2 mb-3">
        {['active', 'all', 'completed', 'draft'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[36px] capitalize ${
              filter === f
                ? 'bg-primary-500/30 text-primary-400 border border-primary-500/50'
                : 'bg-surface-400 text-gray-500 border border-white/5'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12">
          <RefreshCw size={24} className="mx-auto text-gray-600 animate-spin mb-2" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 font-medium">No {filter} work orders</p>
          <p className="text-gray-500 text-sm mt-1">Admin creates work orders for your site</p>
        </div>
      )}

      {!loading && filtered.map(wo => (
        <WorkOrderCard key={wo.id} wo={wo} />
      ))}
    </div>
  )
}
