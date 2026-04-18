import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Edit2, Check, X, ChevronUp, ChevronDown, Save, Trash2, Download } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const TYPE_LABEL = { internal: 'Internal Paint', external: 'External Paint', oil: 'Oil Paint' }
const STATUS_OPTIONS = ['draft', 'active', 'completed']
const STEP_STATUS_OPTIONS = ['pending', 'in_progress', 'completed']

// ── Inline editable field ─────────────────────────────────────────────────────
function InlineEdit({ label, value, onSave, type = 'text' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const commit = async () => { await onSave(draft); setEditing(false) }
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-white/5 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <input type={type} value={draft} onChange={e => setDraft(e.target.value)}
            className="input text-sm py-1.5" />
          <button onClick={commit} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
          <button onClick={() => { setDraft(value); setEditing(false) }} className="text-gray-500 hover:text-red-400"><X size={14} /></button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">{value || '—'}</span>
          <button onClick={() => { setDraft(value); setEditing(true) }} className="text-gray-600 hover:text-yellow-400"><Edit2 size={12} /></button>
        </div>
      )}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color = 'bg-yellow-500' }) {
  return (
    <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ wo, progress, onPatch }) {
  const daysLeft = wo.end_date ? Math.ceil((new Date(wo.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Flats',  value: wo.total_flats || 0,             color: 'text-blue-400' },
          { label: 'Steps',        value: (wo.steps || []).length,         color: 'text-yellow-400' },
          { label: 'Materials',    value: (wo.materials || []).length,     color: 'text-green-400' },
          { label: 'Days Left',    value: daysLeft !== null ? (daysLeft < 0 ? 'Overdue' : daysLeft + 'd') : '—', color: daysLeft < 0 ? 'text-red-400' : 'text-gray-300' },
        ].map(s => (
          <div key={s.label} className="bg-surface-300 border border-white/10 rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Details card */}
      <div className="bg-surface-300 border border-white/10 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3">Details</h3>
        <InlineEdit label="Title"      value={wo.title}      onSave={v => onPatch({ title: v })} />
        <InlineEdit label="Start Date" value={wo.start_date} onSave={v => onPatch({ start_date: v })} type="date" />
        <InlineEdit label="End Date"   value={wo.end_date}   onSave={v => onPatch({ end_date: v })}   type="date" />
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-500 text-sm">Status</span>
          <select value={wo.status} onChange={e => onPatch({ status: e.target.value })}
            className="select">
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-500 text-sm">Site</span>
          <span className="text-white text-sm">{wo.site?.name}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-500 text-sm">Type</span>
          <span className="text-white text-sm">{TYPE_LABEL[wo.type]}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-500 text-sm">Created by</span>
          <span className="text-white text-sm">{wo.creator?.name || '—'}</span>
        </div>
        {wo.notes && (
          <div className="pt-2 border-t border-white/5 mt-2">
            <p className="text-gray-500 text-xs mb-1">Notes</p>
            <p className="text-gray-300 text-sm">{wo.notes}</p>
          </div>
        )}
      </div>

      {/* Overall progress */}
      {progress && (
        <div className="bg-surface-300 border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">Overall Progress</h3>
            <span className="text-yellow-400 font-bold text-lg">{progress.overall_percent}%</span>
          </div>
          <ProgressBar pct={progress.overall_percent} />
        </div>
      )}
    </div>
  )
}

// ── Steps Tab ─────────────────────────────────────────────────────────────────
function StepsTab({ wo, onRefresh }) {
  const [localSteps, setLocalSteps] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { setLocalSteps((wo.steps || []).slice().sort((a, b) => a.sequence_order - b.sequence_order)) }, [wo])

  const update = (i, k, v) => setLocalSteps(s => s.map((x, idx) => idx === i ? { ...x, [k]: v } : x))

  const moveUp = (i) => {
    if (i === 0) return
    setLocalSteps(s => { const a = [...s]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a.map((x, idx) => ({ ...x, sequence_order: idx + 1 })) })
  }

  const moveDown = (i) => {
    setLocalSteps(s => { if (i >= s.length - 1) return s; const a = [...s]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a.map((x, idx) => ({ ...x, sequence_order: idx + 1 })) })
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      await api.post(`/workorders/${wo.id}/steps`, { steps: localSteps })
      toast.success('Steps saved'); onRefresh()
    } catch { toast.error('Save failed') }
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      {localSteps.map((step, i) => (
        <div key={step.id || i} className="bg-surface-300 border border-white/10 rounded-xl p-3 flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <input value={step.step_name} onChange={e => update(i, 'step_name', e.target.value)}
            className="input flex-1 text-sm py-1.5" />
          <select value={step.status} onChange={e => update(i, 'status', e.target.value)}
            className="select">
            {STEP_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <div className="flex gap-1">
            <button type="button" onClick={() => moveUp(i)} className="p-1 text-gray-500 hover:text-white"><ChevronUp size={14} /></button>
            <button type="button" onClick={() => moveDown(i)} className="p-1 text-gray-500 hover:text-white"><ChevronDown size={14} /></button>
          </div>
        </div>
      ))}
      <button onClick={saveAll} disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-400 disabled:opacity-50">
        <Save size={14} />{saving ? 'Saving…' : 'Save Steps'}
      </button>
    </div>
  )
}

// ── Materials Tab ─────────────────────────────────────────────────────────────
function MaterialsTab({ wo, onRefresh }) {
  const [saving, setSaving] = useState(false)
  const materials = wo.materials || []

  const grouped = (wo.steps || []).reduce((acc, step) => {
    const mats = materials.filter(m => m.step_id === step.id)
    if (mats.length) acc[step.step_name] = mats
    return acc
  }, {})
  const general = materials.filter(m => !m.step_id)
  if (general.length) grouped['General'] = general

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([group, mats]) => (
        <div key={group}>
          <h3 className="text-white font-semibold text-sm mb-3 border-b border-white/10 pb-2">{group}</h3>
          <div className="space-y-2">
            {mats.map(m => {
              const total = parseFloat(m.total_quantity) || 0
              const used  = parseFloat(m.used_quantity)  || 0
              const pct   = total > 0 ? Math.round((used / total) * 100) : 0
              return (
                <div key={m.id} className="bg-surface-300 border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-medium text-sm">{m.product_name}</p>
                      <p className="text-gray-400 text-xs">{m.company_name} {m.shade ? `· ${m.shade}` : ''}</p>
                    </div>
                    <span className="text-xs text-gray-500 bg-surface-200 px-2 py-0.5 rounded-full">{m.unit}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-gray-500">Total</p>
                      <p className="text-white font-semibold">{m.total_quantity}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Used</p>
                      <p className="text-yellow-400 font-semibold">{m.used_quantity}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500">Remaining</p>
                      <p className={`font-semibold ${Math.max(0, total - used) === 0 ? 'text-red-400' : 'text-green-400'}`}>{Math.max(0, total - used).toFixed(2)}</p>
                    </div>
                  </div>
                  <ProgressBar pct={pct} color="bg-yellow-500" />
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {materials.length === 0 && <p className="text-gray-500 text-center py-10">No materials added yet</p>}
    </div>
  )
}

// ── Progress Tab ──────────────────────────────────────────────────────────────
function ProgressTab({ progress }) {
  if (!progress) return <p className="text-gray-500 text-center py-10">Loading…</p>
  return (
    <div className="space-y-5">
      {/* Overall */}
      <div className="bg-surface-300 border border-white/10 rounded-xl p-5 text-center">
        <p className="text-5xl font-bold text-yellow-400">{progress.overall_percent}%</p>
        <p className="text-gray-400 mt-1 text-sm">Overall Completion</p>
        <div className="mt-3 max-w-xs mx-auto"><ProgressBar pct={progress.overall_percent} /></div>
      </div>

      {/* Steps progress */}
      {progress.steps_progress?.length > 0 && (
        <div className="bg-surface-300 border border-white/10 rounded-xl p-4 space-y-3">
          <h3 className="text-white font-semibold">Step-wise Progress</h3>
          {progress.steps_progress.map(s => (
            <div key={s.step_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{s.step_name}</span>
                <span className="text-gray-500 text-xs">{s.done}/{s.total} flats · {s.percent}%</span>
              </div>
              <ProgressBar pct={s.percent} />
            </div>
          ))}
        </div>
      )}

      {/* Materials consumption */}
      {progress.materials_progress?.length > 0 && (
        <div className="bg-surface-300 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Material Consumption</h3>
          <div className="space-y-2">
            {progress.materials_progress.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-2 bg-surface-200 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{m.product_name}</p>
                  <p className="text-gray-500 text-xs">{m.used} / {m.total} {m.unit}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  m.flag === 'exhausted' ? 'bg-red-500/20 text-red-400' :
                  m.flag === 'low'       ? 'bg-orange-500/20 text-orange-400' :
                                          'bg-green-500/20 text-green-400'
                }`}>
                  {m.flag === 'exhausted' ? 'Exhausted' : m.flag === 'low' ? 'Low' : 'OK'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Flats Tab ─────────────────────────────────────────────────────────────────
function FlatsTab({ wo }) {
  const flats  = wo.flats  || []
  const steps  = (wo.steps || []).slice().sort((a, b) => a.sequence_order - b.sequence_order)
  const wings  = [...new Set(flats.map(f => f.wing).filter(Boolean))]
  const floors = [...new Set(flats.map(f => f.floor_no).filter(Boolean))].sort((a, b) => a - b)

  const [filterWing, setFilterWing] = useState('')
  const [filterFloor, setFilterFloor] = useState('')

  const filtered = flats.filter(f =>
    (!filterWing  || f.wing    === filterWing) &&
    (!filterFloor || String(f.floor_no) === filterFloor)
  )

  const stateIcon = (s) => {
    if (s === 'done')        return <span className="text-green-400 font-bold">✓</span>
    if (s === 'in_progress') return <span className="text-yellow-400 font-bold">⟳</span>
    return <span className="text-gray-600">—</span>
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {wings.length > 0 && (
          <select value={filterWing} onChange={e => setFilterWing(e.target.value)}
            className="select">
            <option value="">All Wings</option>
            {wings.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        )}
        {floors.length > 0 && (
          <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)}
            className="select">
            <option value="">All Floors</option>
            {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
          </select>
        )}
        <span className="text-gray-500 text-sm self-center">{filtered.length} flats</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-10">No flat records — flat generation requires floor count, flats/floor, and first flat no</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-200 text-gray-400 text-xs">
                {wings.length > 0 && <th className="px-3 py-2 text-left font-medium">Wing</th>}
                <th className="px-3 py-2 text-left font-medium">Floor</th>
                <th className="px-3 py-2 text-left font-medium">Flat</th>
                {steps.map(s => (
                  <th key={s.id} className="px-3 py-2 text-center font-medium max-w-[80px]">
                    <span className="truncate block max-w-[80px]" title={s.step_name}>{s.step_name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(flat => (
                <tr key={flat.id} className="border-t border-white/5 hover:bg-surface-200 transition-colors">
                  {wings.length > 0 && <td className="px-3 py-2 text-gray-300">{flat.wing || '—'}</td>}
                  <td className="px-3 py-2 text-gray-300">{flat.floor_no ?? '—'}</td>
                  <td className="px-3 py-2 text-white font-medium">{flat.flat_no}</td>
                  {steps.map(s => (
                    <td key={s.id} className="px-3 py-2 text-center">
                      {stateIcon((flat.step_progress || {})[s.id] || 'pending')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Detail Component ─────────────────────────────────────────────────────
const TABS = ['Overview', 'Steps', 'Materials', 'Progress', 'Flats']

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [wo, setWo] = useState(null)
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Overview')
  const handleDelete = async () => {
    if (!window.confirm('Delete this work order? This cannot be undone.')) return
    try { await api.delete('/workorders/' + id); toast.success('Deleted'); navigate('/workorders') }
    catch { toast.error('Failed to delete') }
  }
  const handleExportPDF = async () => {
    try {
      const token = localStorage.getItem('dg_token')
      const res = await fetch('/api/workorders/' + id + '/export/pdf', { headers: { Authorization: 'Bearer ' + token } })
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'workorder.pdf'; a.click(); URL.revokeObjectURL(url)
    } catch { toast.error('PDF export failed') }
  }
  const handleExportExcel = async () => {
    try {
      const token = localStorage.getItem('dg_token')
      const res = await fetch('/api/workorders/' + id + '/export/excel', { headers: { Authorization: 'Bearer ' + token } })
      const blob = await res.blob(); const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'workorder.xlsx'; a.click(); URL.revokeObjectURL(url)
    } catch { toast.error('Excel export failed') }
  }

  const load = async () => {
    try {
      const [woRes, progRes] = await Promise.all([
        api.get('/workorders/' + id),
        api.get('/workorders/' + id + '/progress'),
      ])
      setWo(woRes.data)
      setProgress(progRes.data)
    } catch { toast.error('Failed to load work order') }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handlePatch = async (data) => {
    try {
      const res = await api.patch('/workorders/' + id, data)
      setWo(p => ({ ...p, ...res.data }))
      toast.success('Updated')
    } catch { toast.error('Update failed') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!wo) return <div className="text-gray-400 p-6">Work order not found</div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/workorders')} className="text-gray-400 hover:text-white text-sm mb-2 block">← Work Orders</button>
          <h1 className="text-xl font-bold text-white">{wo.title}</h1>
          <p className="text-gray-400 text-sm">{wo.site?.name} · {TYPE_LABEL[wo.type]}</p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
          wo.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
          wo.status === 'active'    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                      'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }`}>{wo.status}</span>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-all"><Download size={12} /> PDF</button>
        <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all"><Download size={12} /> Excel</button>
        <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"><Trash2 size={12} /> Delete</button>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 bg-surface-300 border border-white/10 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${tab === t ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Overview'   && <OverviewTab   wo={wo} progress={progress} onPatch={handlePatch} />}
      {tab === 'Steps'      && <StepsTab      wo={wo} onRefresh={load} />}
      {tab === 'Materials'  && <MaterialsTab  wo={wo} onRefresh={load} />}
      {tab === 'Progress'   && <ProgressTab   progress={progress} />}
      {tab === 'Flats'      && <FlatsTab      wo={wo} />}
    </div>
  )
}
