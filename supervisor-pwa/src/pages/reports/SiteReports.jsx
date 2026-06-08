import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Loader2, Camera } from 'lucide-react'
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
function ProgressGrid({ process: pm, flats, steps, progress, loading, onBack, onPlanToday }) {
  const totalCells = flats.length * steps.length
  const sumPct = progress.reduce((acc, p) => acc + (p.done_percentage || 0), 0)
  const completedCells = progress.filter(p => p.done_percentage >= 100).length
  const overallPct = totalCells > 0 ? Math.round(sumPct / (totalCells * 100) * 100) : 0

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
          <button onClick={onPlanToday}
            style={{ background: '#FF8C00', border: 'none', borderRadius: '10px', padding: '10px 20px', color: '#000', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            📋 Plan Today
          </button>
        </div>
      </div>

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
                      <td key={step.id} style={{ padding: '8px 4px', borderBottom: '1px solid #222', borderLeft: '1px solid #222', ...getCellStyle(pct) }}>
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
  const [view, setView] = useState('sites') // 'sites'|'processes'|'grid'|'plan'

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
    const processDetail = selectedProcess
    const items = []
    for (const flatId of selectedFlatIds) {
      const flat = flats.find(f => f.id === flatId)
      if (!flat) continue
      for (const stepId of selectedStepIds) {
        const step = steps.find(s => s.id === stepId)
        if (!step) continue
        // Get materials from selectedProcess steps detail (may be in process.steps)
        const detailStep = processDetail?.steps?.find(s => s.id === stepId)
        const stepMaterials = (detailStep?.materials || []).map(m => ({
          site_material_id: m.site_material_id,
          material_name: m.siteMaterial?.full_name || m.material_name || '',
          unit: m.siteMaterial?.unit || m.unit || '',
          qty_per_flat: m.quantity_per_flat || 0,
          actual_qty: m.quantity_per_flat || '',
          in_stock: true
        }))
        items.push({
          id: `${flatId}_${stepId}`,
          flat_id: flatId,
          flat_no: flat.flat_no,
          bhk_type: flat.bhk_type || '',
          step_id: stepId,
          step_name: step.step_name,
          process_id: processDetail.id,
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
        group_name: item.labour_ids.length > 0
          ? siteLabours.filter(l => item.labour_ids.includes(l.id)).map(l => l.name).join(', ')
          : '',
        labour_ids: item.labour_ids,
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
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>Confirm Materials & Assign Labour</h3>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>{planItems.length} task{planItems.length !== 1 ? 's' : ''} to plan</p>

              {planItems.map(item => (
                <div key={item.id} style={{ background: '#1c1c1c', borderRadius: '14px', border: '1px solid #333', marginBottom: '14px', overflow: 'hidden' }}>
                  <div style={{ background: '#222', padding: '12px 16px', borderBottom: '1px solid #333' }}>
                    <p style={{ color: '#fff', fontWeight: 700, fontSize: '14px', margin: 0 }}>Flat {item.flat_no}{item.bhk_type ? ` (${item.bhk_type})` : ''}</p>
                    <p style={{ color: '#FF8C00', fontSize: '12px', margin: '2px 0 0' }}>{item.step_name}</p>
                  </div>

                  <div style={{ padding: '12px 16px' }}>
                    {/* Materials */}
                    {item.materials.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Materials</p>
                        {item.materials.map((mat, mi) => {
                          const stockStatus = getStockStatus(mat.material_name)
                          return (
                            <div key={mi} style={{ background: '#2a2a2a', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                <p style={{ color: '#ccc', fontSize: '13px', fontWeight: 600, margin: 0, flex: 1 }}>{mat.material_name || 'Unnamed material'}</p>
                                {!stockLoading && (
                                  <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '8px', flexShrink: 0, color: stockStatus === 'in' ? '#22c55e' : stockStatus === 'low' ? '#fb923c' : stockStatus === 'out' ? '#ef4444' : '#666' }}>
                                    {stockStatus === 'in' ? '✓ In Stock' : stockStatus === 'low' ? '⚠️ Low Stock' : stockStatus === 'out' ? '❌ Out of Stock' : ''}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="number" value={mat.actual_qty}
                                  onChange={e => updatePlanItemMaterial(item.id, mi, 'actual_qty', e.target.value)}
                                  style={{ width: '90px', padding: '6px 10px', background: '#333', border: '1px solid #444', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
                                <span style={{ color: '#888', fontSize: '13px' }}>{mat.unit}</span>
                                {stockStatus === 'out' && (
                                  <button onClick={() => { setRequestModal({ material_name: mat.material_name, unit: mat.unit }); setRequestForm({ qty: mat.actual_qty || '', urgency: 'Normal' }) }}
                                    style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: '8px', padding: '4px 10px', color: '#fca5a5', fontSize: '12px', cursor: 'pointer', marginLeft: 'auto' }}>
                                    Request Material
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                        {item.materials.length === 0 && <p style={{ color: '#555', fontSize: '12px' }}>No materials assigned to this step</p>}
                      </div>
                    )}

                    {/* Labour */}
                    <div>
                      <p style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Assign Labour</p>
                      {siteLabours.length === 0 ? (
                        <p style={{ color: '#555', fontSize: '12px' }}>No labour registered for this site</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {siteLabours.map(l => {
                            const sel = item.labour_ids.includes(l.id)
                            return (
                              <button key={l.id} onClick={() => updatePlanItemLabour(item.id, sel ? item.labour_ids.filter(id => id !== l.id) : [...item.labour_ids, l.id])}
                                style={{ background: sel ? 'rgba(255,140,0,0.15)' : '#2a2a2a', border: `1.5px solid ${sel ? '#FF8C00' : '#444'}`, borderRadius: '20px', padding: '6px 12px', color: sel ? '#FF8C00' : '#aaa', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {sel && <span>✓</span>}
                                {l.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button disabled={savingPlan} onClick={async () => { await saveDailyPlan(); if (!savingPlan) setPlanStep(4) }}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#FF8C00', color: '#000', fontWeight: 700, fontSize: '16px', cursor: 'pointer', marginTop: '8px', opacity: savingPlan ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {savingPlan ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : 'Save Plan & Continue →'}
              </button>
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

  // ── Grid view ───────────────────────────────────────────────────────────────
  if (view === 'grid') {
    return (
      <ProgressGrid
        process={selectedProcess}
        flats={flats}
        steps={steps}
        progress={progress}
        loading={gridLoading}
        onBack={() => setView('processes')}
        onPlanToday={() => {
          setSelectedFlatIds([])
          setSelectedStepIds([])
          setPlanItems([])
          setPlanStep(1)
          setPlanSaved(false)
          setAttendance({})
          setCheckInPhotos({})
          fetchSiteLabours(selectedSite.id)
          setView('plan')
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
