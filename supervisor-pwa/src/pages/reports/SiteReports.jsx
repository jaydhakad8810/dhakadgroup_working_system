import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Loader2, Camera } from 'lucide-react'
import { PieChart, Pie, Cell } from 'recharts'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const WORK_TYPE_LABELS = { internal: 'Internal', external: 'External', oil: 'Oil', gypsum: 'Gypsum', other: 'Other' }

function getToken() {
  return sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` }
}

function getCellStyle(pct) {
  if (!pct || pct === 0) return { background: '#1a1a1a', color: '#555', textAlign: 'center', fontSize: '12px' }
  if (pct >= 100) return { background: '#14532d', color: '#22c55e', textAlign: 'center', fontWeight: 'bold', fontSize: '12px' }
  return { background: '#431407', color: '#fb923c', textAlign: 'center', fontSize: '12px' }
}

// ── Site selector ─────────────────────────────────────────────────────────────
function SiteList({ sites, onSelect }) {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-bold text-white mb-4">Reports</h2>
      {sites.map(site => (
        <button key={site.id} onClick={() => onSelect(site)}
          className="w-full text-left p-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
          style={{ background: '#1c1c1c' }}>
          <p className="font-semibold text-white">{site.name}</p>
          {site.client_name && <p className="text-xs mt-0.5" style={{ color: '#888' }}>{site.client_name}</p>}
        </button>
      ))}
      {sites.length === 0 && (
        <div className="text-center py-12"><p style={{ color: '#555' }}>No sites assigned</p></div>
      )}
    </div>
  )
}

// ── Process selector ──────────────────────────────────────────────────────────
function ProcessList({ site, processes, loading, onSelect, onBack }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl active:scale-95" style={{ background: '#1c1c1c' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div>
          <h2 className="text-base font-bold text-white">{site.name}</h2>
          <p className="text-xs" style={{ color: '#888' }}>Select a process</p>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin" style={{ color: '#FF8C00' }} /></div>
      ) : processes.length === 0 ? (
        <div className="text-center py-12"><p style={{ color: '#555' }}>No processes created for this site yet</p></div>
      ) : (
        processes.map(pm => (
          <button key={pm.id} onClick={() => onSelect(pm)}
            className="w-full text-left p-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
            style={{ background: '#1c1c1c' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{pm.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#FF8C00/15', color: '#FF8C00', border: '1px solid #FF8C00/30' }}>
                    {WORK_TYPE_LABELS[pm.work_type] || pm.work_type}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                    style={{ background: pm.status === 'active' ? '#14532d' : '#1c1c1c', color: pm.status === 'active' ? '#22c55e' : '#888' }}>
                    {pm.status}
                  </span>
                </div>
              </div>
              <span style={{ color: '#FF8C00', fontSize: '20px' }}>→</span>
            </div>
            <div className="flex gap-3 mt-2 text-xs" style={{ color: '#555' }}>
              <span>{pm.areas?.length || 0} areas</span>
              <span>{pm.flats?.length || 0} flats</span>
              <span>{pm.steps?.length || 0} steps</span>
            </div>
          </button>
        ))
      )}
    </div>
  )
}

// ── Progress grid ─────────────────────────────────────────────────────────────
function ProgressGrid({ process: pm, flats, steps, progress, loading, onBack, onPlanToday, planSaved, onStartCheckout, onCellClick, onExportExcel, onExportPDF, showExportMenu, setShowExportMenu, exporting }) {
  const totalCells = flats.length * steps.length
  const sumPct = progress.reduce((acc, p) => acc + (p.done_percentage || 0), 0)
  const completedCells = progress.filter(p => p.done_percentage >= 100).length
  const overallPct = totalCells > 0 ? Math.round(sumPct / (totalCells * 100) * 100) : 0

  const doneCells = completedCells
  const inProgressCells = progress.filter(p => p.done_percentage > 0 && p.done_percentage < 100).length
  const pendingCells = totalCells - doneCells - inProgressCells
  const overallData = [
    { name: 'Done', value: doneCells, color: '#22c55e' },
    { name: 'In Progress', value: inProgressCells, color: '#FF8C00' },
    { name: 'Pending', value: pendingCells, color: '#374151' }
  ].filter(d => d.value > 0)

  function getProg(flat_id, step_id) {
    return progress.find(p => p.flat_id === flat_id && p.step_id === step_id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={onBack} className="p-2 rounded-xl active:scale-95" style={{ background: '#1c1c1c' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white truncate">{pm?.title}</h2>
          <p className="text-xs" style={{ color: '#888' }}>Progress Grid</p>
        </div>
        <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowExportMenu(v => !v)} disabled={exporting}
            style={{ background: '#1a1a1a', border: '1px solid #444', borderRadius: '10px', padding: '8px 14px', color: '#ccc', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
            {exporting ? '⏳' : '⬇️'} Export
          </button>
          {showExportMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', zIndex: 100, minWidth: '150px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', marginTop: '4px' }}>
              <button onClick={onExportExcel}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', color: '#ccc', fontSize: '14px', cursor: 'pointer' }}>
                📊 Excel
              </button>
              <button onClick={onExportPDF}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', color: '#ccc', fontSize: '14px', cursor: 'pointer', borderTop: '1px solid #222' }}>
                📄 PDF
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4">
        <div className="p-3 rounded-2xl flex items-center justify-between gap-3" style={{ background: '#1c1c1c' }}>
          <div className="flex-1">
            <p className="text-xs mb-1.5" style={{ color: '#888' }}>
              {completedCells} of {totalCells} tasks completed — {overallPct}%
            </p>
            <div className="w-full h-2.5 rounded-full" style={{ background: '#333' }}>
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(overallPct, 100)}%`, background: '#FF8C00' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <button onClick={onPlanToday}
              style={{ background: '#FF8C00', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#000', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              📋 Plan Today
            </button>
            {planSaved && (
              <button onClick={onStartCheckout}
                style={{ background: '#22c55e', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#000', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ✓ Start Checkout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pie chart */}
      {totalCells > 0 && (
        <div className="px-4">
          <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '14px', border: '1px solid #222' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <PieChart width={100} height={100}>
                <Pie data={overallData} cx={45} cy={45} innerRadius={28} outerRadius={45} dataKey="value" strokeWidth={0}>
                  {overallData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '22px', lineHeight: 1 }}>{overallPct}%</div>
                <div style={{ color: '#888', fontSize: '12px', marginBottom: '10px' }}>Overall Complete</div>
                {overallData.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                    <span style={{ color: '#888', fontSize: '12px', flex: 1 }}>{item.name}</span>
                    <span style={{ color: '#ccc', fontSize: '12px', fontWeight: 'bold' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin" style={{ color: '#FF8C00' }} /></div>
      ) : flats.length === 0 || steps.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p style={{ color: '#555' }}>{flats.length === 0 ? 'No flats in this process.' : 'No steps in this process.'}</p>
        </div>
      ) : (
        <div className="px-2" style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '400px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 10, background: '#111', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #333', minWidth: '90px', color: '#888', fontSize: '11px' }}>Flat</th>
                {steps.map(step => (
                  <th key={step.id} style={{ padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #333', borderLeft: '1px solid #333', color: '#ccc', fontSize: '11px', minWidth: '80px', whiteSpace: 'nowrap' }}>
                    {step.step_name.length > 10 ? step.step_name.slice(0, 10) + '…' : step.step_name}
                    {step.coat_count > 1 && <span style={{ color: '#555', fontSize: '10px', display: 'block' }}>×{step.coat_count}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flats.map(flat => (
                <tr key={flat.id}>
                  <td style={{ position: 'sticky', left: 0, zIndex: 5, background: '#111', padding: '8px 10px', borderBottom: '1px solid #222', fontWeight: 'bold', color: '#fff', fontSize: '12px' }}>
                    {flat.flat_no}
                    {flat.bhk_type && <span style={{ color: '#555', fontSize: '10px', display: 'block', fontWeight: 'normal' }}>{flat.bhk_type}</span>}
                  </td>
                  {steps.map(step => {
                    const prog = getProg(flat.id, step.id)
                    const pct = prog?.done_percentage || 0
                    return (
                      <td key={step.id}
                        onClick={() => onCellClick && onCellClick(flat, step, prog)}
                        style={{ padding: '8px 4px', borderBottom: '1px solid #222', borderLeft: '1px solid #222', cursor: 'pointer', ...getCellStyle(pct) }}>
                        {pct >= 100 ? 'DONE' : pct > 0 ? `${pct}%` : '—'}
                        {prog?.date_updated && pct > 0 && pct < 100 && (
                          <div style={{ fontSize: '9px', color: '#f97316', marginTop: '1px' }}>
                            {new Date(prog.date_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Photo capture card ────────────────────────────────────────────────────────
function PhotoCaptureCard({ labour, photoUrl, onCapture, uploading }) {
  const inputRef = useRef(null)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', background: '#1c1c1c', border: `2px solid ${photoUrl ? '#22c55e' : '#555'}`, marginBottom: '10px' }}>
      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
        {photoUrl
          ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '18px' }}>👤</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0 }}>{labour.name}</p>
        {labour.trade && <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>{labour.trade}</p>}
      </div>
      {uploading ? (
        <Loader2 size={20} className="animate-spin" style={{ color: '#FF8C00' }} />
      ) : photoUrl ? (
        <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          style={{ background: '#FF8C00', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#000', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Camera size={14} /> Photo
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) onCapture(labour.id, e.target.files[0]) }} />
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ height: '4px', borderRadius: '2px', flex: 1, background: i < current ? '#FF8C00' : '#333', transition: 'background 0.3s' }} />
      ))}
    </div>
  )
}

// ── Extra material adder ──────────────────────────────────────────────────────
function ExtraMaterialAdder({ siteId, token, onAdd }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function search(q) {
    setQuery(q)
    if (!q || q.length < 1) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/site-materials?site_id=${siteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      const filtered = (Array.isArray(data) ? data : []).filter(m =>
        m.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        m.product_name?.toLowerCase().includes(q.toLowerCase())
      )
      setResults(filtered.slice(0, 10))
      setOpen(true)
    } catch {}
    setLoading(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', marginTop: '8px' }}>
      <input
        placeholder="+ Add extra material (search...)"
        value={query}
        onChange={e => search(e.target.value)}
        onFocus={() => query && setOpen(true)}
        style={{ width: '100%', background: '#111', color: '#fff', border: '1px dashed #444', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', boxSizing: 'border-box' }}
      />
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', zIndex: 100, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', marginTop: '4px' }}>
          {results.map(m => (
            <div key={m.id}
              onClick={() => { onAdd(m); setQuery(''); setResults([]); setOpen(false) }}
              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #222', fontSize: '13px', color: '#ccc' }}
              onMouseEnter={e => e.currentTarget.style.background = '#222'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ fontWeight: '500' }}>{m.full_name}</div>
              <div style={{ color: '#666', fontSize: '11px' }}>{m.unit} · {m.company_name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SiteReports (main component) ──────────────────────────────────────────────
export default function SiteReports() {
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(null)
  const [processes, setProcesses] = useState([])
  const [selectedProcess, setSelectedProcess] = useState(null)
  const [flats, setFlats] = useState([])
  const [steps, setSteps] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [processLoading, setProcessLoading] = useState(false)
  const [gridLoading, setGridLoading] = useState(false)
  const [view, setView] = useState('sites') // 'sites'|'processes'|'grid'|'plan'|'checkout'|'cell_history'
  const [planningProcess, setPlanningProcess] = useState(null)

  // Plan wizard state
  const [planStep, setPlanStep] = useState(1)
  const [planDate] = useState(new Date().toISOString().split('T')[0])
  const [planItems, setPlanItems] = useState([])
  const [selectedFlatIds, setSelectedFlatIds] = useState([])
  const [selectedStepIds, setSelectedStepIds] = useState([])
  const [savingPlan, setSavingPlan] = useState(false)
  const [planSaved, setPlanSaved] = useState(false)
  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [attendance, setAttendance] = useState({})
  const [checkInPhotos, setCheckInPhotos] = useState({})
  const [uploadingPhoto, setUploadingPhoto] = useState({})
  const [siteLabours, setSiteLabours] = useState([])
  const [siteStock, setSiteStock] = useState([])
  const [stockLoading, setStockLoading] = useState(false)
  const [requestModal, setRequestModal] = useState(null) // { material_name, unit }
  const [requestForm, setRequestForm] = useState({ qty: '', urgency: 'Normal' })
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // Checkout state
  const [checkoutItems, setCheckoutItems] = useState([])
  const [checkoutPhotos, setCheckoutPhotos] = useState({})
  const [uploadingCheckoutPhoto, setUploadingCheckoutPhoto] = useState({})
  const [submittingCheckout, setSubmittingCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(1)

  // Cell history state
  const [cellHistory, setCellHistory] = useState([])
  const [cellHistoryLoading, setCellHistoryLoading] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    api.get('/sites')
      .then(r => {
        const s = r.data || []
        setSites(s)
        if (s.length === 1) handleSelectSite(s[0])
      })
      .catch(() => toast.error('Failed to load sites'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelectSite = (site) => {
    setSelectedSite(site)
    setView('processes')
    setProcessLoading(true)
    api.get(`/process-master?site_id=${site.id}`)
      .then(r => setProcesses(r.data || []))
      .catch(() => toast.error('Failed to load processes'))
      .finally(() => setProcessLoading(false))
  }

  const handleSelectProcess = (pm) => {
    setSelectedProcess(pm)
    setView('grid')
    setGridLoading(true)
    api.get(`/process-master/${pm.id}/progress`)
      .then(r => {
        setFlats(r.data.flats || [])
        setSteps(r.data.steps || [])
        setProgress(r.data.progress || [])
      })
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setGridLoading(false))
  }

  async function fetchSiteLabours(siteId) {
    try {
      const res = await api.get(`/workorders/site-labours?site_id=${siteId}`, { headers: authHeaders() })
      setSiteLabours(res.data || [])
    } catch { /* non-fatal */ }
  }

  async function fetchSiteStock(siteId) {
    setStockLoading(true)
    try {
      const res = await api.get(`/godown/site-stock?site_id=${siteId}`, { headers: authHeaders() })
      setSiteStock(res.data || [])
    } catch { setSiteStock([]) }
    setStockLoading(false)
  }

  function getStockStatus(materialName) {
    if (!materialName) return 'unknown'
    const entry = siteStock.find(s =>
      s.material_name?.toLowerCase() === materialName.toLowerCase() ||
      s.full_name?.toLowerCase().includes(materialName.toLowerCase())
    )
    if (!entry) return 'unknown'
    const qty = parseFloat(entry.quantity || entry.qty || 0)
    const total = parseFloat(entry.total_received || entry.capacity || qty * 5 || 1)
    if (qty <= 0) return 'out'
    if (total > 0 && qty / total < 0.2) return 'low'
    return 'in'
  }

  function buildPlanItems() {
    const proc = planningProcess
    if (!proc) {
      toast.error('Process data not loaded. Please try again.')
      return
    }
    const items = []
    for (const flatId of selectedFlatIds) {
      const flat = flats.find(f => f.id === flatId)
      if (!flat) continue
      for (const stepId of selectedStepIds) {
        const step = proc.steps?.find(s => s.id === stepId)
        if (!step) continue
        const stepMaterials = (step.materials || []).map(m => ({
          site_material_id: m.site_material_id,
          material_name: m.siteMaterial?.full_name || '',
          unit: m.siteMaterial?.unit || '',
          qty_per_flat: parseFloat(m.quantity_per_flat || 0),
          actual_qty: m.quantity_per_flat ? String(m.quantity_per_flat) : '',
          in_stock: true,
          is_extra: false
        }))
        items.push({
          id: `${flatId}_${stepId}`,
          flat_id: flatId,
          flat_no: flat.flat_no,
          bhk_type: flat.bhk_type || '',
          step_id: stepId,
          step_name: step.step_name,
          process_id: proc.id,
          process_step_id: stepId,
          labour_ids: [],
          materials: stepMaterials
        })
      }
    }
    setPlanItems(items)
  }

  function updatePlanItemMaterial(itemId, matIdx, field, value) {
    setPlanItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, materials: item.materials.map((m, i) => i === matIdx ? { ...m, [field]: value } : m) }
        : item
    ))
  }

  function updatePlanItemLabour(itemId, labourIds) {
    setPlanItems(prev => prev.map(item => item.id === itemId ? { ...item, labour_ids: labourIds } : item))
  }

  async function saveDailyPlan() {
    setSavingPlan(true)
    try {
      const headers = authHeaders()
      const items = planItems.map(item => ({
        group_name: '',
        process_id: item.process_id,
        process_step_id: item.process_step_id,
        step_name: item.step_name,
        flat_nos: [item.flat_no],
        materials: item.materials.map(m => ({
          site_material_id: m.site_material_id,
          material_name: m.material_name,
          estimated_qty: parseFloat(m.actual_qty) || 0,
          unit: m.unit
        })),
        material_name: item.materials[0]?.material_name || '',
        estimated_qty: parseFloat(item.materials[0]?.actual_qty) || null,
        unit: item.materials[0]?.unit || ''
      }))

      const existing = await api.get(
        `/daily-plans?site_id=${selectedSite.id}&date=${planDate}`,
        { headers }
      )

      let planId
      if (existing.data?.exists) {
        planId = existing.data.plan.id
        await api.put(`/daily-plans/${planId}`, { notes: 'Created from Reports', items }, { headers })
      } else {
        const res = await api.post('/daily-plans',
          { site_id: selectedSite.id, date: planDate, notes: 'Created from Reports', items },
          { headers }
        )
        planId = res.data.id
      }

      await api.patch(`/daily-plans/${planId}/submit`, {}, { headers })
      setPlanSaved(true)
      toast.success('Plan saved and submitted!')

      const allLabourIds = [...new Set(planItems.flatMap(item => item.labour_ids))]
      const initAtt = {}
      allLabourIds.forEach(id => { initAtt[id] = 'present' })
      setAttendance(initAtt)

    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save plan')
    }
    setSavingPlan(false)
  }

  async function uploadCheckInPhoto(labourId, file) {
    setUploadingPhoto(prev => ({ ...prev, [labourId]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/upload/single', formData, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'multipart/form-data' }
      })
      setCheckInPhotos(prev => ({ ...prev, [labourId]: res.data.url }))
    } catch {
      toast.error('Photo upload failed')
    }
    setUploadingPhoto(prev => ({ ...prev, [labourId]: false }))
  }

  async function submitAttendance() {
    setSubmittingAttendance(true)
    try {
      const headers = authHeaders()
      const presentLabours = siteLabours.filter(l => attendance[l.id] !== 'absent')
      await api.post('/attendance/bulk', {
        site_id: selectedSite.id,
        date: planDate,
        labours: presentLabours.map(l => ({
          labour_id: l.id,
          status: attendance[l.id] || 'present',
          check_in_photo: checkInPhotos[l.id] || null
        }))
      }, { headers })

      toast.success('Attendance submitted! Day started.')
      setView('grid')
      setPlanStep(1)
      setPlanItems([])
      setSelectedFlatIds([])
      setSelectedStepIds([])
      setPlanSaved(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit attendance')
    }
    setSubmittingAttendance(false)
  }

  async function submitMaterialRequest() {
    if (!requestModal) return
    setSubmittingRequest(true)
    try {
      const headers = authHeaders()
      await api.post('/godown/requests/batch', {
        site_id: selectedSite.id,
        urgency: requestForm.urgency,
        notes: 'Requested from daily plan',
        items: [{ material_name: requestModal.material_name, quantity: parseFloat(requestForm.qty) || 0, unit: requestModal.unit }]
      }, { headers })
      toast.success('Material requested')
      setRequestModal(null)
      setRequestForm({ qty: '', urgency: 'Normal' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Request failed')
    }
    setSubmittingRequest(false)
  }

  function initializeCheckout() {
    const items = planItems.map(item => ({
      ...item,
      done_percentage: 0,
      status: 'pending',
      materials: (item.materials || []).map(m => ({ ...m, actual_qty_used: '' }))
    }))
    setCheckoutItems(items)
    setCheckoutStep(1)
  }

  function updateCheckoutItem(itemId, updates) {
    setCheckoutItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    ))
  }

  async function uploadCheckoutPhoto(labourId, file) {
    setUploadingCheckoutPhoto(prev => ({ ...prev, [labourId]: true }))
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/upload/single', formData, {
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'multipart/form-data' }
      })
      setCheckoutPhotos(prev => ({ ...prev, [labourId]: res.data.url }))
    } catch {
      toast.error('Photo upload failed')
    }
    setUploadingCheckoutPhoto(prev => ({ ...prev, [labourId]: false }))
  }

  async function submitCheckout() {
    setSubmittingCheckout(true)
    try {
      const headers = authHeaders()
      for (const item of checkoutItems) {
        await api.patch(
          `/daily-plans/items/${item.plan_item_id || item.id}/checkout`,
          {
            done_percentage: item.done_percentage || 0,
            status: item.done_percentage >= 100 ? 'done' : item.done_percentage > 0 ? 'in_progress' : 'pending',
            actual_qty: item.materials?.[0] ? parseFloat(item.materials[0].actual_qty_used || 0) : 0,
            materials: item.materials?.map(m => ({
              material_name: m.material_name,
              quantity_used: parseFloat(m.actual_qty_used || 0),
              unit: m.unit
            })) || [],
            checkout_notes: '',
            date_worked: planDate,
            process_step_id: item.process_step_id,
            process_id: item.process_id,
            labour_ids: item.labour_ids || []
          },
          { headers }
        )
      }
      toast.success('Day completed! Great work.')
      setView('grid')
      setCheckoutStep(1)
      setPlanItems([])
      setSelectedFlatIds([])
      setSelectedStepIds([])
      setPlanSaved(false)
      const res = await api.get(`/process-master/${selectedProcess.id}/progress`, { headers })
      setFlats(res.data.flats || [])
      setSteps(res.data.steps || [])
      setProgress(res.data.progress || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed')
    }
    setSubmittingCheckout(false)
  }

  async function openCellHistory(flat, step, progressRecord) {
    setSelectedCell({
      flat_no: flat.flat_no,
      bhk_type: flat.bhk_type,
      step_name: step.step_name,
      flat_progress_id: progressRecord?.id
    })
    setCellHistoryLoading(true)
    setView('cell_history')
    if (progressRecord?.id) {
      try {
        const res = await api.get(
          `/process-master/progress/${progressRecord.id}/history`,
          { headers: authHeaders() }
        )
        setCellHistory(res.data || [])
      } catch {
        setCellHistory([])
      }
    } else {
      setCellHistory([])
    }
    setCellHistoryLoading(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 size={32} className="animate-spin" style={{ color: '#FF8C00' }} />
      </div>
    )
  }

  // ── Plan wizard ─────────────────────────────────────────────────────────────
  if (view === 'plan') {
    const formattedDate = new Date(planDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

    // group flats by area
    const flatsByArea = {}
    flats.forEach(f => {
      const areaKey = f.area_name || 'All Flats'
      if (!flatsByArea[areaKey]) flatsByArea[areaKey] = []
      flatsByArea[areaKey].push(f)
    })

    const sortedSteps = [...steps].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0))

    function getFlatProgress(flatId) {
      const recs = progress.filter(p => p.flat_id === flatId)
      if (!recs.length) return 0
      return Math.round(recs.reduce((s, p) => s + (p.done_percentage || 0), 0) / recs.length)
    }

    function getStepProgressForFlats(stepId, flatIds) {
      const recs = progress.filter(p => p.step_id === stepId && flatIds.includes(p.flat_id))
      if (!recs.length) return 0
      return Math.round(recs.reduce((s, p) => s + (p.done_percentage || 0), 0) / recs.length)
    }

    // Step 4 labour list
    const assignedLabours = siteLabours.filter(l =>
      planItems.some(item => item.labour_ids.includes(l.id))
    )
    const displayLabours = assignedLabours.length > 0 ? assignedLabours : siteLabours

    const presentLabourIds = displayLabours.filter(l => attendance[l.id] !== 'absent').map(l => l.id)
    const allPresentHavePhotos = presentLabourIds.every(id => checkInPhotos[id])

    return (
      <div style={{ minHeight: '100vh', background: '#111', paddingBottom: '80px' }}>
        {/* Header */}
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222', position: 'sticky', top: 0, background: '#111', zIndex: 20 }}>
          <button onClick={() => {
            if (planStep > 1) { if (window.confirm('Go back? Progress in this step will be lost.')) setPlanStep(s => s - 1) }
            else setView('grid')
          }} style={{ background: '#1c1c1c', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#FF8C00', fontWeight: 700, fontSize: '15px', margin: 0 }}>Plan for {formattedDate}</p>
            <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Step {planStep} of 4</p>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          <StepIndicator current={planStep} total={4} />

          {/* ── STEP 1: Select Flats ─────────────────────────────── */}
          {planStep === 1 && (
            <div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>Select Flats for Today</h3>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>Which flats will you work on today?</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#FF8C00', fontSize: '13px', fontWeight: 600 }}>{selectedFlatIds.length} flats selected</span>
                <button onClick={() => setSelectedFlatIds(flats.length === selectedFlatIds.length ? [] : flats.map(f => f.id))}
                  style={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', padding: '6px 14px', color: '#ccc', fontSize: '13px', cursor: 'pointer' }}>
                  {flats.length === selectedFlatIds.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {Object.entries(flatsByArea).map(([area, areaFlats]) => (
                <div key={area} style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>{area}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                    {areaFlats.map(flat => {
                      const sel = selectedFlatIds.includes(flat.id)
                      const pct = getFlatProgress(flat.id)
                      return (
                        <button key={flat.id} onClick={() => setSelectedFlatIds(prev => sel ? prev.filter(id => id !== flat.id) : [...prev, flat.id])}
                          style={{ background: sel ? 'rgba(255,140,0,0.12)' : '#1c1c1c', border: `2px solid ${sel ? '#FF8C00' : '#333'}`, borderRadius: '12px', padding: '12px 8px', cursor: 'pointer', position: 'relative', textAlign: 'center' }}>
                          {sel && <span style={{ position: 'absolute', top: '6px', right: '8px', color: '#FF8C00', fontSize: '14px' }}>✓</span>}
                          <p style={{ color: '#fff', fontWeight: 700, fontSize: '16px', margin: '0 0 2px' }}>{flat.flat_no}</p>
                          {flat.bhk_type && <p style={{ color: '#888', fontSize: '10px', margin: '0 0 4px' }}>{flat.bhk_type}</p>}
                          <p style={{ color: pct >= 100 ? '#22c55e' : pct > 0 ? '#FF8C00' : '#555', fontSize: '11px', margin: 0 }}>{pct >= 100 ? 'Done' : pct > 0 ? `${pct}%` : '—'}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              <button disabled={selectedFlatIds.length === 0} onClick={() => setPlanStep(2)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: selectedFlatIds.length > 0 ? '#FF8C00' : '#333', color: selectedFlatIds.length > 0 ? '#000' : '#666', fontWeight: 700, fontSize: '16px', cursor: selectedFlatIds.length > 0 ? 'pointer' : 'not-allowed', marginTop: '20px' }}>
                Next → {selectedFlatIds.length > 0 ? `(${selectedFlatIds.length} flats)` : ''}
              </button>
            </div>
          )}

          {/* ── STEP 2: Select Steps ─────────────────────────────── */}
          {planStep === 2 && (
            <div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>Select Steps for Today</h3>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>What work will be done?</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#FF8C00', fontSize: '13px', fontWeight: 600 }}>{selectedStepIds.length} steps selected</span>
                <button onClick={() => setSelectedStepIds(sortedSteps.length === selectedStepIds.length ? [] : sortedSteps.map(s => s.id))}
                  style={{ background: '#1c1c1c', border: '1px solid #333', borderRadius: '8px', padding: '6px 14px', color: '#ccc', fontSize: '13px', cursor: 'pointer' }}>
                  {sortedSteps.length === selectedStepIds.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sortedSteps.map(step => {
                  const sel = selectedStepIds.includes(step.id)
                  const pct = getStepProgressForFlats(step.id, selectedFlatIds)
                  const allDone = pct >= 100
                  return (
                    <button key={step.id} onClick={() => setSelectedStepIds(prev => sel ? prev.filter(id => id !== step.id) : [...prev, step.id])}
                      style={{ background: sel ? 'rgba(255,140,0,0.10)' : '#1c1c1c', border: `2px solid ${sel ? '#FF8C00' : '#333'}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>{step.step_name}</p>
                        <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>
                          {allDone ? '' : `${pct}% done across selected flats`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {allDone && <span style={{ background: '#14532d', color: '#22c55e', borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>Completed ✓</span>}
                        {sel && <span style={{ color: '#FF8C00', fontSize: '18px' }}>✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>

              <button disabled={selectedStepIds.length === 0} onClick={() => { buildPlanItems(); setPlanStep(3); fetchSiteStock(selectedSite.id) }}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: selectedStepIds.length > 0 ? '#FF8C00' : '#333', color: selectedStepIds.length > 0 ? '#000' : '#666', fontWeight: 700, fontSize: '16px', cursor: selectedStepIds.length > 0 ? 'pointer' : 'not-allowed', marginTop: '20px' }}>
                Next → {selectedStepIds.length > 0 ? `(${selectedStepIds.length} steps)` : ''}
              </button>
            </div>
          )}

          {/* ── STEP 3: Materials + Labour ───────────────────────── */}
          {planStep === 3 && (
            <div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>Confirm Materials</h3>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>{planItems.length} task{planItems.length !== 1 ? 's' : ''} to plan</p>

              {planItems.map((item, itemIdx) => (
                <div key={item.id} style={{ background: '#111', borderRadius: '12px', border: '1px solid #222', marginBottom: '14px', overflow: 'hidden' }}>
                  {/* Card header */}
                  <div style={{ padding: '12px 14px', background: '#1a1a1a', borderBottom: '1px solid #222' }}>
                    <div style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '15px' }}>
                      Flat {item.flat_no}
                      {item.bhk_type && <span style={{ color: '#888', fontWeight: 'normal', fontSize: '13px', marginLeft: '6px' }}>({item.bhk_type})</span>}
                    </div>
                    <div style={{ color: '#ccc', fontSize: '13px', marginTop: '2px' }}>Step: {item.step_name}</div>
                  </div>

                  <div style={{ padding: '14px' }}>
                    {/* Materials section */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ color: '#888', fontSize: '11px', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.5px' }}>MATERIALS</div>

                      {item.materials.length === 0 && (
                        <div style={{ color: '#555', fontSize: '13px', fontStyle: 'italic', padding: '8px 0' }}>No materials linked to this step</div>
                      )}

                      {item.materials.map((mat, matIdx) => (
                        <div key={matIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '10px', background: '#1e1e1e', borderRadius: '8px', border: '1px solid #2a2a2a' }}>
                          <div style={{ flex: 2 }}>
                            <div style={{ color: '#ccc', fontSize: '13px', fontWeight: '500' }}>{mat.material_name}</div>
                            {mat.qty_per_flat > 0 && (
                              <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>Planned: {mat.qty_per_flat} {mat.unit}/flat</div>
                            )}
                            {mat.is_extra && <div style={{ color: '#f97316', fontSize: '11px', marginTop: '2px' }}>Extra material</div>}
                          </div>
                          <input
                            type="number"
                            placeholder="Qty"
                            value={mat.actual_qty || ''}
                            onChange={e => {
                              const updated = [...planItems]
                              updated[itemIdx].materials[matIdx].actual_qty = e.target.value
                              setPlanItems(updated)
                            }}
                            style={{ width: '70px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                          />
                          <span style={{ color: '#888', fontSize: '12px', minWidth: '30px' }}>{mat.unit}</span>
                          {mat.is_extra && (
                            <button
                              onClick={() => {
                                const updated = [...planItems]
                                updated[itemIdx].materials = updated[itemIdx].materials.filter((_, i) => i !== matIdx)
                                setPlanItems(updated)
                              }}
                              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px' }}>×</button>
                          )}
                        </div>
                      ))}

                      <ExtraMaterialAdder
                        siteId={selectedSite?.id}
                        token={getToken()}
                        onAdd={(mat) => {
                          const updated = [...planItems]
                          updated[itemIdx].materials.push({
                            site_material_id: mat.id,
                            material_name: mat.full_name,
                            unit: mat.unit,
                            qty_per_flat: 0,
                            actual_qty: '',
                            in_stock: true,
                            is_extra: true
                          })
                          setPlanItems(updated)
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={async () => {
                    await saveDailyPlan()
                    sessionStorage.setItem('daily_plan_context', JSON.stringify({
                      site_id: selectedSite.id,
                      site_name: selectedSite.name,
                      date: planDate,
                      tasks: planItems.map(item => ({
                        flat_no: item.flat_no,
                        bhk_type: item.bhk_type,
                        step_name: item.step_name,
                        materials: item.materials
                      }))
                    }))
                    window.location.href = '/attendance'
                  }}
                  disabled={savingPlan}
                  style={{ background: '#FF8C00', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%', opacity: savingPlan ? 0.7 : 1 }}>
                  {savingPlan ? 'Saving...' : '✓ Save Plan & Go to Attendance →'}
                </button>
                <button
                  onClick={saveDailyPlan}
                  disabled={savingPlan}
                  style={{ background: 'none', border: '1px solid #444', borderRadius: '12px', padding: '12px', color: '#888', fontSize: '14px', cursor: 'pointer', width: '100%' }}>
                  Save as Draft Only
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Attendance ───────────────────────────────── */}
          {planStep === 4 && (
            <div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>Mark Attendance</h3>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>Check in your team for today</p>

              {displayLabours.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ color: '#555' }}>No labour assigned. Add workers to the plan first.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                    <button onClick={() => { const a = {}; displayLabours.forEach(l => { a[l.id] = 'present' }); setAttendance(a) }}
                      style={{ background: '#14532d', border: '1px solid #22c55e', borderRadius: '8px', padding: '6px 14px', color: '#22c55e', fontSize: '13px', cursor: 'pointer' }}>
                      All Present
                    </button>
                  </div>

                  {displayLabours.map(l => {
                    const status = attendance[l.id] || 'present'
                    return (
                      <div key={l.id} style={{ background: '#1c1c1c', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', border: '1px solid #333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>👤</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: 0 }}>{l.name}</p>
                            {l.trade && <p style={{ color: '#888', fontSize: '11px', margin: 0 }}>{l.trade}</p>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginBottom: status !== 'absent' ? '10px' : 0 }}>
                          {['present', 'half_day', 'absent'].map(s => (
                            <button key={s} onClick={() => setAttendance(prev => ({ ...prev, [l.id]: s }))}
                              style={{ flex: 1, padding: '6px 4px', borderRadius: '8px', border: `1.5px solid ${status === s ? (s === 'present' ? '#22c55e' : s === 'half_day' ? '#fb923c' : '#ef4444') : '#333'}`, background: status === s ? (s === 'present' ? 'rgba(34,197,94,0.12)' : s === 'half_day' ? 'rgba(251,146,60,0.12)' : 'rgba(239,68,68,0.12)') : '#2a2a2a', color: status === s ? (s === 'present' ? '#22c55e' : s === 'half_day' ? '#fb923c' : '#ef4444') : '#666', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                              {s === 'present' ? 'Present' : s === 'half_day' ? 'Half Day' : 'Absent'}
                            </button>
                          ))}
                        </div>
                        {status !== 'absent' && (
                          <PhotoCaptureCard
                            labour={l}
                            photoUrl={checkInPhotos[l.id]}
                            uploading={uploadingPhoto[l.id]}
                            onCapture={uploadCheckInPhoto}
                          />
                        )}
                      </div>
                    )
                  })}

                  <div style={{ background: '#1c1c1c', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#888', fontSize: '13px' }}>Photos taken</span>
                    <span style={{ color: '#FF8C00', fontWeight: 700, fontSize: '14px' }}>
                      {presentLabourIds.filter(id => checkInPhotos[id]).length} / {presentLabourIds.length}
                    </span>
                  </div>

                  <button disabled={!allPresentHavePhotos || submittingAttendance} onClick={submitAttendance}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: allPresentHavePhotos ? '#22c55e' : '#333', color: allPresentHavePhotos ? '#000' : '#666', fontWeight: 700, fontSize: '16px', cursor: allPresentHavePhotos ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submittingAttendance ? 0.7 : 1 }}>
                    {submittingAttendance ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : 'Submit Attendance ✓'}
                  </button>
                  <p style={{ color: '#555', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
                    {!allPresentHavePhotos ? `Take check-in photos for all present workers to continue` : 'Ready to start the day!'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Material Request Modal */}
        {requestModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ background: '#1c1c1c', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '480px', margin: '0 auto' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Request Material</h3>
              <p style={{ color: '#FF8C00', fontSize: '14px', marginBottom: '20px' }}>{requestModal.material_name}</p>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Quantity ({requestModal.unit})</label>
                <input type="number" value={requestForm.qty} onChange={e => setRequestForm(p => ({ ...p, qty: e.target.value }))}
                  placeholder="0" style={{ width: '100%', padding: '10px 14px', background: '#2a2a2a', border: '1px solid #444', borderRadius: '10px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '6px' }}>Urgency</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Normal', 'Urgent', 'Critical'].map(u => (
                    <button key={u} onClick={() => setRequestForm(p => ({ ...p, urgency: u }))}
                      style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1.5px solid ${requestForm.urgency === u ? '#FF8C00' : '#444'}`, background: requestForm.urgency === u ? 'rgba(255,140,0,0.15)' : '#2a2a2a', color: requestForm.urgency === u ? '#FF8C00' : '#888', fontSize: '13px', cursor: 'pointer' }}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setRequestModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #444', background: '#2a2a2a', color: '#aaa', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
                <button disabled={submittingRequest || !requestForm.qty} onClick={submitMaterialRequest}
                  style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#FF8C00', color: '#000', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: submittingRequest || !requestForm.qty ? 0.6 : 1 }}>
                  {submittingRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Cell history view ────────────────────────────────────────────────────────
  if (view === 'cell_history') {
    const DONE_OPTIONS_DISPLAY = [10, 30, 50, 70, 90, 100]
    return (
      <div style={{ minHeight: '100vh', background: '#111', paddingBottom: '80px' }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222', position: 'sticky', top: 0, background: '#111', zIndex: 20 }}>
          <button onClick={() => setView('grid')} style={{ background: '#1c1c1c', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>
              Flat {selectedCell?.flat_no} — {selectedCell?.step_name}
            </p>
            {selectedCell?.bhk_type && <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>{selectedCell.bhk_type}</p>}
          </div>
        </div>
        <div style={{ padding: '16px' }}>
          {cellHistoryLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: '#FF8C00' }} />
            </div>
          ) : cellHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#555' }}>
              No work recorded yet for this task
            </div>
          ) : (
            cellHistory.map((entry, i) => (
              <div key={i} style={{ background: '#1a1a1a', borderRadius: '10px', padding: '14px', marginBottom: '12px', border: '1px solid #222' }}>
                <div style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                  {new Date(entry.date_worked).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ display: 'inline-block', background: entry.done_percentage >= 100 ? '#14532d' : '#1a1200', color: entry.done_percentage >= 100 ? '#22c55e' : '#FF8C00', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', marginBottom: '10px' }}>
                  {entry.done_percentage >= 100 ? 'Done ✓' : `${entry.done_percentage}% Complete`}
                </div>
                {entry.labour_names?.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px' }}>LABOUR</div>
                    <div style={{ color: '#ccc', fontSize: '13px' }}>👷 {entry.labour_names.join(', ')}</div>
                  </div>
                )}
                {entry.material_used?.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px' }}>MATERIALS USED</div>
                    {entry.material_used.map((m, mi) => (
                      <div key={mi} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#111', borderRadius: '6px', marginBottom: '4px' }}>
                        <span style={{ color: '#aaa', fontSize: '12px' }}>{m.material_name}</span>
                        <span style={{ color: '#FF8C00', fontSize: '12px', fontWeight: 'bold' }}>{m.quantity_used} {m.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
                {entry.notes && (
                  <div style={{ color: '#666', fontSize: '12px', fontStyle: 'italic', marginTop: '4px' }}>"{entry.notes}"</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // ── Checkout view ────────────────────────────────────────────────────────────
  if (view === 'checkout') {
    const DONE_OPTIONS = [10, 30, 50, 70, 90, 100]
    const presentLabours = siteLabours.filter(l => attendance[l.id] !== 'absent')

    return (
      <div style={{ minHeight: '100vh', background: '#111', paddingBottom: '80px' }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #222', position: 'sticky', top: 0, background: '#111', zIndex: 20 }}>
          <button onClick={() => setView('grid')} style={{ background: '#1c1c1c', border: 'none', borderRadius: '10px', padding: '8px', cursor: 'pointer' }}>
            <ArrowLeft size={18} color="#fff" />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#FF8C00', fontWeight: 700, fontSize: '15px', margin: 0 }}>
              {checkoutStep === 1 ? 'Checkout — What did you complete?' : 'Checkout — Photos'}
            </p>
            <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Step {checkoutStep} of 2</p>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          <StepIndicator current={checkoutStep} total={2} />

          {/* Step 1: Task completion */}
          {checkoutStep === 1 && (
            <div>
              {checkoutItems.map(item => (
                <div key={item.id} style={{ background: '#1c1c1c', borderRadius: '14px', border: '1px solid #333', marginBottom: '14px', overflow: 'hidden' }}>
                  <div style={{ background: '#2a1500', padding: '12px 16px', borderBottom: '1px solid #333' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0 }}>Flat {item.flat_no}{item.bhk_type ? ` (${item.bhk_type})` : ''}</p>
                    <p style={{ color: '#FF8C00', fontSize: '12px', margin: '2px 0 0' }}>{item.step_name}</p>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    <p style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>How much was completed?</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
                      {DONE_OPTIONS.map(pct => (
                        <button key={pct}
                          onClick={() => updateCheckoutItem(item.id, { done_percentage: pct, status: pct === 100 ? 'done' : 'in_progress' })}
                          style={{ padding: '10px 6px', borderRadius: '8px', border: item.done_percentage === pct ? '2px solid #FF8C00' : '1px solid #333', background: item.done_percentage === pct ? (pct === 100 ? '#14532d' : '#1a1200') : '#1a1a1a', color: item.done_percentage === pct ? (pct === 100 ? '#22c55e' : '#FF8C00') : '#666', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                          {pct === 100 ? 'Done ✓' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                    {item.materials.length > 0 && (
                      <div>
                        <p style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Material Used</p>
                        {item.materials.map((mat, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px', background: '#1e1e1e', borderRadius: '8px' }}>
                            <span style={{ flex: 2, color: '#ccc', fontSize: '13px' }}>{mat.material_name}</span>
                            <input type="number" placeholder="Used qty" value={mat.actual_qty_used || ''}
                              onChange={e => {
                                const updated = [...checkoutItems]
                                const itemIdx = updated.findIndex(ci => ci.id === item.id)
                                updated[itemIdx].materials[idx].actual_qty_used = e.target.value
                                setCheckoutItems(updated)
                              }}
                              style={{ width: '70px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', textAlign: 'center' }} />
                            <span style={{ color: '#888', fontSize: '12px', minWidth: '30px' }}>{mat.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  if (!checkoutItems.some(item => item.done_percentage > 0)) {
                    toast.error('Mark at least one task as completed')
                    return
                  }
                  setCheckoutStep(2)
                }}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FF8C00', color: '#000', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginTop: '8px' }}>
                Continue to Photos →
              </button>
            </div>
          )}

          {/* Step 2: Checkout photos */}
          {checkoutStep === 2 && (
            <div>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>Checkout Photos</h3>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>Optional — capture end-of-day photos</p>
              {presentLabours.map(l => (
                <PhotoCaptureCard key={l.id}
                  labour={l}
                  photoUrl={checkoutPhotos[l.id]}
                  uploading={uploadingCheckoutPhoto[l.id]}
                  onCapture={uploadCheckoutPhoto} />
              ))}
              {presentLabours.length === 0 && (
                <p style={{ color: '#555', fontSize: '13px', marginBottom: '16px' }}>No labour on attendance record.</p>
              )}
              <button disabled={submittingCheckout} onClick={submitCheckout}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#22c55e', color: '#000', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submittingCheckout ? 0.7 : 1 }}>
                {submittingCheckout ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : '✓ Complete Day'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  async function exportToExcel() {
    setExporting(true)
    setShowExportMenu(false)
    try {
      const XLSX = (await import('xlsx')).default || (await import('xlsx'))
      const headers = ['Flat No', 'BHK Type', ...steps.map(s => s.step_name)]
      const rows = flats.map(flat => {
        const row = [flat.flat_no, flat.bhk_type || '']
        steps.forEach(step => {
          const prog = progress.find(p => p.flat_id === flat.id && p.step_id === step.id)
          const pct = prog?.done_percentage || 0
          row.push(pct >= 100 ? 'DONE' : pct > 0 ? `${pct}%` : 'Pending')
        })
        return row
      })
      rows.push([])
      rows.push(['SUMMARY', '', ...steps.map(step => {
        const done = progress.filter(p => p.step_id === step.id && p.done_percentage >= 100).length
        return `${done}/${flats.length} done`
      })])
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      ws['!cols'] = [{ wch: 12 }, { wch: 10 }, ...steps.map(() => ({ wch: 18 }))]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Progress Report')
      const siteName = selectedSite?.name || 'Site'
      const processTitle = selectedProcess?.title || 'Process'
      const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '-')
      XLSX.writeFile(wb, `${siteName}_${processTitle}_Progress_${date}.xlsx`)
      toast.success('Excel exported')
    } catch (err) {
      toast.error('Export failed: ' + err.message)
    }
    setExporting(false)
  }

  async function exportToPDF() {
    setExporting(true)
    setShowExportMenu(false)
    try {
      const siteName = selectedSite?.name || 'Site'
      const processTitle = selectedProcess?.title || 'Process'
      const date = new Date().toLocaleDateString('en-IN')
      const totalCells = flats.length * steps.length
      const doneCells = progress.filter(p => p.done_percentage >= 100).length
      let html = `<html><head><style>
        body{font-family:Arial,sans-serif;font-size:11px}
        h1{color:#C9A84C;font-size:18px;margin-bottom:4px}
        h2{color:#333;font-size:14px;margin-bottom:16px}
        table{border-collapse:collapse;width:100%}
        th{background:#C9A84C;color:white;padding:6px 8px;text-align:center;border:1px solid #ddd;font-size:10px}
        td{padding:5px 8px;border:1px solid #ddd;text-align:center;font-size:10px}
        tr:nth-child(even){background:#f9f9f9}
        .done{color:#16a34a;font-weight:bold}.progress{color:#ea580c}.pending{color:#9ca3af}
      </style></head><body>
      <h1>Dhakad Group</h1>
      <h2>${siteName} — ${processTitle}</h2>
      <p>Generated: ${date} | Flats: ${flats.length} | Steps: ${steps.length} | Overall: ${totalCells > 0 ? Math.round((doneCells / totalCells) * 100) : 0}% Complete</p>
      <table><tr><th>Flat</th><th>Type</th>${steps.map(s => `<th>${s.step_name}</th>`).join('')}</tr>`
      flats.forEach(flat => {
        html += '<tr>'
        html += `<td><b>${flat.flat_no}</b></td><td>${flat.bhk_type || ''}</td>`
        steps.forEach(step => {
          const prog = progress.find(p => p.flat_id === flat.id && p.step_id === step.id)
          const pct = prog?.done_percentage || 0
          const cls = pct >= 100 ? 'done' : pct > 0 ? 'progress' : 'pending'
          html += `<td class="${cls}">${pct >= 100 ? 'DONE' : pct > 0 ? `${pct}%` : '—'}</td>`
        })
        html += '</tr>'
      })
      html += '</table></body></html>'
      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print(); win.close() }, 500)
      toast.success('PDF ready to print/save')
    } catch (err) {
      toast.error('PDF export failed: ' + err.message)
    }
    setExporting(false)
  }

  // ── Grid view ───────────────────────────────────────────────────────────────
  if (view === 'grid') {
    return (
      <ProgressGrid
        process={selectedProcess}
        flats={flats}
        steps={steps}
        progress={progress}
        loading={gridLoading}
        planSaved={planSaved}
        onBack={() => setView('processes')}
        onStartCheckout={() => { initializeCheckout(); setView('checkout') }}
        onCellClick={openCellHistory}
        onExportExcel={exportToExcel}
        onExportPDF={exportToPDF}
        showExportMenu={showExportMenu}
        setShowExportMenu={setShowExportMenu}
        exporting={exporting}
        onPlanToday={async () => {
          setSelectedFlatIds([])
          setSelectedStepIds([])
          setPlanItems([])
          setPlanStep(1)
          setPlanSaved(false)
          setAttendance({})
          setCheckInPhotos({})
          fetchSiteLabours(selectedSite.id)
          setView('plan')
          try {
            const res = await api.get(
              `/process-master/for-planning?site_id=${selectedSite.id}`,
              { headers: authHeaders() }
            )
            const fullProcess = (res.data || []).find(p => p.id === selectedProcess?.id)
            console.log('planningProcess steps:', fullProcess?.steps?.map(
              s => ({ name: s.step_name, materials: s.materials?.length })
            ))
            setPlanningProcess(fullProcess || res.data?.[0] || selectedProcess)
          } catch {
            setPlanningProcess(selectedProcess)
          }
        }}
      />
    )
  }

  if (view === 'processes') {
    return (
      <ProcessList
        site={selectedSite}
        processes={processes}
        loading={processLoading}
        onSelect={handleSelectProcess}
        onBack={() => sites.length > 1 ? setView('sites') : null}
      />
    )
  }

  return <SiteList sites={sites} onSelect={handleSelectSite} />
}
