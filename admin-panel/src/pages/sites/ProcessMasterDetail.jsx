import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, Modal } from '../../components/ui'
import toast from 'react-hot-toast'

const STEP_PRESETS = {
  internal: [
    { name: 'Joint Repairing', coat_count: 1 },
    { name: 'Corus Putty', coat_count: 1 },
    { name: 'Fine Putty', coat_count: 2 },
    { name: 'Putty Rubbing', coat_count: 1 },
    { name: 'Aster Coat', coat_count: 1 },
    { name: 'Internal Colour', coat_count: 2 },
  ],
  external: [
    { name: 'Washing', coat_count: 1 },
    { name: 'Grading', coat_count: 1 },
    { name: 'Joint Repairing', coat_count: 1 },
    { name: 'Crack Filling', coat_count: 1 },
    { name: 'Texture', coat_count: 1 },
    { name: 'Primer Coat', coat_count: 1 },
    { name: 'Base Coat', coat_count: 1 },
    { name: 'Colour', coat_count: 2 },
  ],
  oil: [
    { name: 'Scrapping', coat_count: 1 },
    { name: 'Metal Primer', coat_count: 1 },
    { name: 'Wood Primer', coat_count: 1 },
    { name: 'Wall Primer', coat_count: 1 },
    { name: 'Putty', coat_count: 2 },
    { name: 'Putty Rubbing', coat_count: 1 },
    { name: 'Colour', coat_count: 2 },
  ],
  gypsum: [
    { name: 'Right Angle', coat_count: 1 },
    { name: 'Olimba', coat_count: 1 },
    { name: 'Tikki and Dhad', coat_count: 1 },
    { name: 'Gypsum Panelling', coat_count: 1 },
  ],
  other: [],
}

// ── Step 1: Areas & Flats ───────────────────────────────────────────────────
function Step1AreasFlats({ process, onSaved, onComplete }) {
  const [areas, setAreas] = useState(process.areas || [])
  const [newAreaName, setNewAreaName] = useState('')
  const [areaType, setAreaType] = useState('wing')
  const [saving, setSaving] = useState(false)

  // Flat generation state per area
  const [flatBuilders, setFlatBuilders] = useState({})
  const [flatPreviews, setFlatPreviews] = useState({})
  const [savingFlats, setSavingFlats] = useState({})
  const [flatSummaries, setFlatSummaries] = useState({})

  const fb = (areaId, k, v) => setFlatBuilders(p => ({ ...p, [areaId]: { ...(p[areaId] || {}), [k]: v } }))

  const addArea = async () => {
    if (!newAreaName.trim()) return
    setSaving(true)
    try {
      const res = await api.post(`/process-master/${process.id}/areas`, { area_name: newAreaName.trim(), area_type: areaType })
      setAreas(p => [...p, { ...res.data, flats: [] }])
      setNewAreaName('')
      toast.success('Area added')
    } catch { toast.error('Failed to add area') }
    setSaving(false)
  }

  const generateFlats = (areaId) => {
    const b = flatBuilders[areaId] || {}
    const from = parseInt(b.from_no)
    const to = parseInt(b.to_no)
    const bhk = b.bhk_type || '2BHK'
    const perFloor = parseInt(b.flats_per_floor) || 0
    if (!from || !to || from > to) { toast.error('Enter valid From/To flat numbers'); return }

    const flats = []
    let currentNo = from
    while (currentNo <= to) {
      flats.push({ flat_no: currentNo.toString(), bhk_type: bhk, isEditing: false, showCustomBhk: false })
      currentNo++
      if (perFloor > 0) {
        const lastTwo = parseInt(currentNo.toString().slice(-2))
        if (lastTwo > perFloor) {
          const floorPart = parseInt(currentNo.toString().slice(0, -2)) + 1
          currentNo = parseInt(floorPart.toString() + '01')
        }
      }
    }

    const floors = perFloor > 0
      ? new Set(flats.map(f => f.flat_no.toString().slice(0, -2))).size
      : null
    setFlatPreviews(p => ({ ...p, [areaId]: flats }))
    setFlatSummaries(p => ({ ...p, [areaId]: { total: flats.length, floors } }))
  }

  const updateFlat = (areaId, idx, patch) => {
    setFlatPreviews(p => {
      const arr = [...(p[areaId] || [])]
      arr[idx] = { ...arr[idx], ...patch }
      return { ...p, [areaId]: arr }
    })
  }

  const setBulkBhk = (areaId, bhk) => {
    setFlatPreviews(p => ({
      ...p,
      [areaId]: (p[areaId] || []).map(f => ({ ...f, bhk_type: bhk, showCustomBhk: false }))
    }))
  }

  const saveFlats = async (areaId) => {
    const preview = flatPreviews[areaId] || []
    if (!preview.length) { toast.error('Generate flats first'); return }
    setSavingFlats(p => ({ ...p, [areaId]: true }))
    try {
      await api.post(`/process-master/${process.id}/flats`, {
        flats: preview.map((f, i) => ({ area_id: areaId, flat_no: f.flat_no, bhk_type: f.bhk_type, sequence_order: i }))
      })
      toast.success(`${preview.length} flats saved`)
      setFlatPreviews(p => ({ ...p, [areaId]: [] }))
      onSaved()
      onComplete()
    } catch { toast.error('Failed to save flats') }
    setSavingFlats(p => ({ ...p, [areaId]: false }))
  }

  const isInternal = process.work_type === 'internal'

  return (
    <div className="space-y-6">
      {/* Add area */}
      <div className="card space-y-3">
        <h4 className="font-semibold" style={{ color: 'var(--text)' }}>
          {isInternal ? 'Add Wing / Tower' : process.work_type === 'external' ? 'Add Direction / Side' : 'Add Work Area'}
        </h4>
        <div className="flex gap-3">
          <select className="select w-40" value={areaType} onChange={e => setAreaType(e.target.value)}>
            <option value="wing">Wing</option>
            <option value="direction">Direction</option>
            <option value="ceiling_wall">Ceiling/Wall</option>
            <option value="custom">Custom</option>
          </select>
          <input className="input flex-1" value={newAreaName} onChange={e => setNewAreaName(e.target.value)}
            placeholder={isInternal ? 'e.g. Wing A, Tower B' : 'e.g. Front Side, Backside Wall'} />
          <button onClick={addArea} disabled={saving} className="btn-gold whitespace-nowrap">+ Add Area</button>
        </div>
      </div>

      {/* Areas list */}
      {areas.map(area => (
        <div key={area.id} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gold-400">{area.area_name}</h4>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{area.flats?.length || 0} flats saved</span>
          </div>

          {isInternal && (
            <div className="space-y-3 p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Generate Flats</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="label text-xs">From Flat No</label>
                  <input type="number" className="input" value={flatBuilders[area.id]?.from_no || ''} onChange={e => fb(area.id, 'from_no', e.target.value)} placeholder="101" />
                </div>
                <div>
                  <label className="label text-xs">To Flat No</label>
                  <input type="number" className="input" value={flatBuilders[area.id]?.to_no || ''} onChange={e => fb(area.id, 'to_no', e.target.value)} placeholder="202" />
                </div>
                <div>
                  <label className="label text-xs">Flats per Floor</label>
                  <input type="number" min={1} max={20} className="input" value={flatBuilders[area.id]?.flats_per_floor || ''} onChange={e => fb(area.id, 'flats_per_floor', e.target.value)} placeholder="e.g. 4" />
                </div>
                <div>
                  <label className="label text-xs">Default BHK</label>
                  <select className="select" value={flatBuilders[area.id]?.bhk_type || '2BHK'} onChange={e => fb(area.id, 'bhk_type', e.target.value)}>
                    <option>1BHK</option><option>2BHK</option><option>3BHK</option><option>4BHK</option><option>Studio</option><option>Other</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => generateFlats(area.id)} className="btn-outline w-full">Generate</button>
                </div>
              </div>

              {flatPreviews[area.id]?.length > 0 && (
                <div className="space-y-3">
                  {flatSummaries[area.id] && (
                    <p className="text-xs font-medium text-gold-400">
                      Total: {flatSummaries[area.id].total} flats{flatSummaries[area.id].floors ? ` across ${flatSummaries[area.id].floors} floor(s)` : ''}
                    </p>
                  )}
                  <div style={{ marginBottom: '8px' }}>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>Set all to: </span>
                    {['1BHK','2BHK','3BHK','4BHK'].map(bhk => (
                      <button key={bhk} onClick={() => setBulkBhk(area.id, bhk)}
                        style={{ marginLeft: '6px', padding: '2px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer' }}>
                        {bhk}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                    {flatPreviews[area.id].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', background: 'var(--bg2)' }}>
                        {/* Flat number — inline editable */}
                        {f.isEditing ? (
                          <input
                            value={f.flat_no} autoFocus
                            onChange={e => updateFlat(area.id, i, { flat_no: e.target.value })}
                            onBlur={() => updateFlat(area.id, i, { isEditing: false })}
                            onKeyDown={e => e.key === 'Enter' && updateFlat(area.id, i, { isEditing: false })}
                            style={{ width: '72px', padding: '3px 6px', background: 'var(--bg3)', border: '1px solid var(--gold)', borderRadius: '4px', color: 'var(--text)', fontSize: '13px', fontWeight: 'bold' }}
                          />
                        ) : (
                          <span style={{ minWidth: '60px', fontWeight: 'bold', color: 'var(--text)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            {f.flat_no}
                            <button onClick={() => updateFlat(area.id, i, { isEditing: true })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '11px', padding: '0', lineHeight: 1 }}>✏</button>
                          </span>
                        )}
                        {/* BHK selector */}
                        <select
                          value={['1BHK','2BHK','3BHK','4BHK','Studio'].includes(f.bhk_type) ? f.bhk_type : 'Other'}
                          onChange={e => updateFlat(area.id, i, {
                            bhk_type: e.target.value === 'Other' ? '' : e.target.value,
                            showCustomBhk: e.target.value === 'Other'
                          })}
                          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', color: 'var(--text)', fontSize: '13px' }}>
                          <option>1BHK</option><option>2BHK</option><option>3BHK</option><option>4BHK</option><option>Studio</option><option>Other</option>
                        </select>
                        {f.showCustomBhk && (
                          <input
                            placeholder="e.g. 5BHK"
                            value={f.bhk_type}
                            onChange={e => updateFlat(area.id, i, { bhk_type: e.target.value })}
                            style={{ width: '72px', padding: '4px 6px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '13px' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => saveFlats(area.id)} disabled={savingFlats[area.id]} className="btn-gold text-sm">
                    {savingFlats[area.id] ? 'Saving...' : `Save ${flatPreviews[area.id].length} Flats`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {areas.length === 0 && (
        <div className="card text-center py-8">
          <p style={{ color: 'var(--muted)' }}>No areas yet. Add one above to get started.</p>
        </div>
      )}
    </div>
  )
}

// ── Step 2: Process Steps ───────────────────────────────────────────────────
function expandStepByCoats(name, coatCount) {
  if (coatCount <= 1) return [name]
  const ordinals = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th']
  return Array.from({ length: coatCount }, (_, i) => `${name} ${ordinals[i]} Coat`)
}

function Step2Steps({ process, onSaved, onComplete }) {
  const initialPresets = STEP_PRESETS[process.work_type] || []
  const [allSteps, setAllSteps] = useState([])
  const [newCustom, setNewCustom] = useState('')
  const [saving, setSaving] = useState(false)

  const isSelected = (name) => allSteps.some(s => s.name === name && !s.is_custom)

  const togglePreset = (preset) => {
    if (isSelected(preset.name)) {
      setAllSteps(p => p.filter(s => !(s.name === preset.name && !s.is_custom)))
    } else {
      setAllSteps(p => [...p, { id: `preset-${preset.name}`, name: preset.name, coat_count: preset.coat_count, is_custom: false }])
    }
  }

  const addCustom = () => {
    if (!newCustom.trim()) return
    setAllSteps(p => [...p, { id: `custom-${Date.now()}`, name: newCustom.trim(), coat_count: 1, is_custom: true }])
    setNewCustom('')
  }

  const moveStep = (idx, dir) => {
    setAllSteps(p => {
      const arr = [...p]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  const updateCoatCount = (idx, val) => {
    setAllSteps(p => p.map((s, i) => i === idx ? { ...s, coat_count: parseInt(val) || 1 } : s))
  }

  const removeStep = (idx) => setAllSteps(p => p.filter((_, i) => i !== idx))

  const saveSteps = async () => {
    if (!allSteps.length) { toast.error('Select at least one step'); return }
    let seq = 0
    const expandedSteps = []
    for (const s of allSteps) {
      for (const stepName of expandStepByCoats(s.name, s.coat_count)) {
        expandedSteps.push({ step_name: stepName, coat_count: 1, sequence_order: seq++, is_optional: false, is_custom: s.is_custom })
      }
    }
    setSaving(true)
    try {
      await api.post(`/process-master/${process.id}/steps`, { steps: expandedSteps })
      toast.success(`${expandedSteps.length} steps saved`)
      onSaved()
      onComplete()
    } catch { toast.error('Failed to save steps') }
    setSaving(false)
  }

  const totalExpanded = allSteps.reduce((sum, s) => sum + s.coat_count, 0)

  return (
    <div className="space-y-6">
      {/* Preset checkboxes */}
      {initialPresets.length > 0 && (
        <div className="card space-y-3">
          <h4 className="font-semibold" style={{ color: 'var(--text)' }}>Preset Steps — {process.work_type}</h4>
          <div className="space-y-2">
            {initialPresets.map(preset => (
              <div key={preset.name} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--bg3)' }}>
                <input type="checkbox" checked={isSelected(preset.name)} onChange={() => togglePreset(preset)} className="w-4 h-4 accent-gold-500" id={`p-${preset.name}`} />
                <label htmlFor={`p-${preset.name}`} className="flex-1 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>{preset.name}</label>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{preset.coat_count} coat{preset.coat_count > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom step input */}
      <div className="card space-y-3">
        <h4 className="font-semibold" style={{ color: 'var(--text)' }}>Add Custom Step</h4>
        <div className="flex gap-2">
          <input className="input flex-1" value={newCustom} onChange={e => setNewCustom(e.target.value)}
            placeholder="Custom step name" onKeyDown={e => e.key === 'Enter' && addCustom()} />
          <button onClick={addCustom} className="btn-outline whitespace-nowrap">+ Add</button>
        </div>
      </div>

      {/* Unified ordered list */}
      {allSteps.length > 0 && (
        <div className="card space-y-3">
          <h4 className="font-semibold" style={{ color: 'var(--text)' }}>Steps in Order ({allSteps.length} selected → {totalExpanded} total)</h4>
          <div className="space-y-2">
            {allSteps.map((step, idx) => {
              const preview = expandStepByCoats(step.name, step.coat_count)
              return (
                <div key={step.id} className="p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
                  <div className="flex items-center gap-2">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                        style={{ background: 'none', border: '1px solid #555', borderRadius: '3px', padding: '1px 5px', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1, color: 'var(--text)', fontSize: '10px' }}>▲</button>
                      <button onClick={() => moveStep(idx, 1)} disabled={idx === allSteps.length - 1}
                        style={{ background: 'none', border: '1px solid #555', borderRadius: '3px', padding: '1px 5px', cursor: 'pointer', opacity: idx === allSteps.length - 1 ? 0.3 : 1, color: 'var(--text)', fontSize: '10px' }}>▼</button>
                    </div>
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--text)' }}>{idx + 1}. {step.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>Coats:</span>
                      <input type="number" min={1} max={10} className="input w-16 text-sm py-0.5"
                        value={step.coat_count} onChange={e => updateCoatCount(idx, e.target.value)} />
                    </div>
                    {step.is_custom && <span className="text-xs px-1 rounded" style={{ background: 'var(--bg2)', color: 'var(--muted)' }}>custom</span>}
                    <button onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-300 text-sm">×</button>
                  </div>
                  {step.coat_count > 1 && (
                    <p className="text-xs mt-1 pl-8" style={{ color: 'var(--muted)' }}>
                      Will create: {preview.join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <button onClick={saveSteps} disabled={saving} className="btn-gold">
        {saving ? 'Saving...' : `Save & Continue →`}
      </button>
    </div>
  )
}

// ── Step 3: Materials per Step ──────────────────────────────────────────────
function Step3Materials({ process, siteId }) {
  const [siteMaterials, setSiteMaterials] = useState([])
  const [stepMaterials, setStepMaterials] = useState({})
  const [addingFor, setAddingFor] = useState(null)
  const [matForm, setMatForm] = useState({ site_material_id: '', quantity_per_flat: '', unit: '' })
  const [saving, setSaving] = useState(false)
  const [materialSearch, setMaterialSearch] = useState({})

  useEffect(() => {
    api.get(`/site-materials?site_id=${siteId}`).then(r => setSiteMaterials(r.data || []))
    // load existing materials per step
    if (process.steps) {
      const map = {}
      process.steps.forEach(s => { map[s.id] = s.materials || [] })
      setStepMaterials(map)
    }
  }, [siteId])

  const openAdd = (stepId) => {
    setAddingFor(stepId)
    setMatForm({ site_material_id: '', quantity_per_flat: '', unit: '' })
  }

  const handleAdd = async () => {
    if (!matForm.site_material_id) { toast.error('Select a material'); return }
    setSaving(true)
    try {
      const res = await api.post(`/process-master/steps/${addingFor}/materials`, matForm)
      const mat = siteMaterials.find(m => m.id === matForm.site_material_id)
      setStepMaterials(p => ({ ...p, [addingFor]: [...(p[addingFor] || []), { ...res.data, siteMaterial: mat }] }))
      setAddingFor(null)
      toast.success('Material added')
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleRemove = async (stepId, materialId) => {
    try {
      await api.delete(`/process-master/steps/${stepId}/materials/${materialId}`)
      setStepMaterials(p => ({ ...p, [stepId]: (p[stepId] || []).filter(m => m.id !== materialId) }))
      toast.success('Removed')
    } catch { toast.error('Failed') }
  }

  const steps = process.steps || []

  return (
    <div className="space-y-4">
      {steps.length === 0 && <div className="card text-center py-8"><p style={{ color: 'var(--muted)' }}>No steps yet. Go back and add steps first.</p></div>}
      {steps.map(step => (
        <div key={step.id} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold" style={{ color: 'var(--text)' }}>{step.step_name} <span className="text-xs text-gold-400">({step.coat_count} coat{step.coat_count > 1 ? 's' : ''})</span></h4>
            <button onClick={() => openAdd(step.id)} className="btn-outline text-xs">+ Add Material</button>
          </div>

          {(stepMaterials[step.id] || []).length === 0 && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>No materials assigned</p>
          )}
          {(stepMaterials[step.id] || []).map(m => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--bg3)' }}>
              <span className="text-sm" style={{ color: 'var(--text)' }}>{m.siteMaterial?.full_name || m.site_material_id}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{m.quantity_per_flat} {m.unit}/flat</span>
                <button onClick={() => handleRemove(step.id, m.id)} className="text-red-400 hover:text-red-300 text-xs">×</button>
              </div>
            </div>
          ))}

          {addingFor === step.id && (
            <div className="p-3 rounded-lg space-y-3 border" style={{ background: 'var(--bg3)', borderColor: 'var(--bg2)' }}>
              <div>
                <label className="label text-xs">Material</label>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <input
                    placeholder="Search material by name, shade, code..."
                    value={materialSearch[step.id] || ''}
                    onChange={e => setMaterialSearch(p => ({ ...p, [step.id]: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>🔍</span>
                  {materialSearch[step.id] && (
                    <button onClick={() => setMaterialSearch(p => ({ ...p, [step.id]: '' }))}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>×</button>
                  )}
                </div>
                <select className="select" value={matForm.site_material_id}
                  onChange={e => {
                    const m = siteMaterials.find(x => x.id === e.target.value)
                    setMatForm(p => ({ ...p, site_material_id: e.target.value, unit: m?.unit || '' }))
                  }}>
                  <option value="">Select material...</option>
                  {(() => {
                    const q = (materialSearch[step.id] || '').toLowerCase()
                    const filtered = q ? siteMaterials.filter(m =>
                      m.full_name?.toLowerCase().includes(q) ||
                      m.product_name?.toLowerCase().includes(q) ||
                      m.shade_name?.toLowerCase().includes(q) ||
                      m.shade_code?.toLowerCase().includes(q) ||
                      m.company_name?.toLowerCase().includes(q)
                    ) : siteMaterials
                    return ['Paints','Painting Kit','Other Material'].map(cat => {
                      const mats = filtered.filter(m => m.main_category === cat)
                      if (!mats.length) return null
                      return <optgroup key={cat} label={cat}>{mats.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}</optgroup>
                    })
                  })()}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label text-xs">Qty per flat</label>
                  <input type="number" className="input" value={matForm.quantity_per_flat} onChange={e => setMatForm(p => ({ ...p, quantity_per_flat: e.target.value }))} />
                </div>
                <div>
                  <label className="label text-xs">Unit</label>
                  <input className="input" value={matForm.unit} onChange={e => setMatForm(p => ({ ...p, unit: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAddingFor(null)} className="btn-ghost text-sm">Cancel</button>
                <button onClick={handleAdd} disabled={saving} className="btn-gold text-sm">{saving ? 'Saving...' : 'Add'}</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 4: Review & Activate ───────────────────────────────────────────────
function Step4Review({ process, siteId }) {
  const navigate = useNavigate()
  const [activating, setActivating] = useState(false)

  const areas = process.areas || []
  const steps = process.steps || []
  const allFlats = areas.flatMap(a => a.flats || [])

  const activate = async () => {
    setActivating(true)
    try {
      await api.patch(`/process-master/${process.id}/status`, { status: 'active' })
      toast.success('Process activated successfully')
      navigate(`/sites/${siteId}?tab=process`)
    } catch { toast.error('Failed to activate') }
    setActivating(false)
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h4 className="font-semibold" style={{ color: 'var(--text)' }}>Summary</h4>
        <div className="flex gap-3 flex-wrap">
          <span className="badge-blue">{process.work_type}</span>
          <StatusBadge status={process.status} />
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
            <p className="text-2xl font-bold text-gold-400">{areas.length}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Areas</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
            <p className="text-2xl font-bold text-gold-400">{allFlats.length}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Flats</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
            <p className="text-2xl font-bold text-gold-400">{steps.length}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Steps</p>
          </div>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h4 className="font-semibold" style={{ color: 'var(--text)' }}>Steps & Materials</h4>
          </div>
          {[...steps].sort((a, b) => (a.sequence_order || 0) - (b.sequence_order || 0)).map((s, i) => (
            <div key={s.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: (s.materials || []).length > 0 ? '8px' : '0' }}>
                <span style={{ color: 'var(--muted)', fontSize: '13px', minWidth: '24px' }}>{i + 1}.</span>
                <span style={{ color: 'var(--text)', fontWeight: '500' }}>{s.step_name}</span>
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>— {s.coat_count || 1} coat</span>
              </div>
              {(s.materials || []).length > 0 && (
                <div style={{ marginLeft: '32px' }}>
                  {s.materials.map((m, mi) => (
                    <div key={mi} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg3)', borderRadius: '6px', marginBottom: '4px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted)' }}>📦 {m.siteMaterial?.full_name || m.material_name || 'Material'}</span>
                      <span style={{ color: 'var(--gold)' }}>{m.quantity_per_flat ? `${m.quantity_per_flat} ${m.unit || ''}/flat` : 'qty not set'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {allFlats.length > 0 && (
        <div className="card space-y-2">
          <h4 className="font-semibold" style={{ color: 'var(--text)' }}>Flat Preview (first 10)</h4>
          <div className="flex flex-wrap gap-2">
            {allFlats.slice(0, 10).map(f => (
              <span key={f.id} className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--bg3)', color: 'var(--muted)' }}>
                {f.flat_no}{f.bhk_type ? ` (${f.bhk_type})` : ''}
              </span>
            ))}
            {allFlats.length > 10 && <span className="text-xs" style={{ color: 'var(--muted)' }}>+{allFlats.length - 10} more</span>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button onClick={activate} disabled={activating} className="btn-gold" style={{ minWidth: '180px' }}>
          {activating ? 'Activating...' : '⚡ Save & Activate'}
        </button>
        <button onClick={() => navigate(`/sites/${siteId}/process/${process.id}/progress`)} className="btn-outline">
          View Progress Grid →
        </button>
      </div>
    </div>
  )
}

// ── ProcessMasterDetail ──────────────────────────────────────────────────────
export default function ProcessMasterDetail() {
  const { siteId, processId } = useParams()
  const navigate = useNavigate()
  const [process, setProcess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeStep, setActiveStep] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/process-master/${processId}`)
      setProcess(res.data)
    } catch { toast.error('Failed to load process') }
    setLoading(false)
  }

  useEffect(() => { load() }, [processId])

  useEffect(() => {
    if (activeStep === 4) {
      api.get(`/process-master/${processId}`)
        .then(res => setProcess(res.data))
        .catch(() => {})
    }
  }, [activeStep])

  if (loading) return <LoadingPage />
  if (!process) return <div className="text-gray-400">Process not found</div>

  const STEPS = ['Areas & Flats', 'Process Steps', 'Materials per Step', 'Review & Activate']

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/sites/${siteId}`} className="btn-ghost"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{process.title}</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{process.work_type} • Process Master</p>
        </div>
        <StatusBadge status={process.status} />
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 p-1 rounded-xl w-fit overflow-x-auto" style={{ background: 'var(--bg2)' }}>
        {STEPS.map((label, i) => (
          <button key={i} onClick={() => setActiveStep(i + 1)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeStep === i + 1 ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {activeStep === 1 && <Step1AreasFlats process={process} onSaved={load} onComplete={() => setActiveStep(2)} />}
      {activeStep === 2 && <Step2Steps process={process} onSaved={load} onComplete={() => setActiveStep(3)} />}
      {activeStep === 3 && <Step3Materials process={process} siteId={siteId} />}
      {activeStep === 4 && <Step4Review process={process} siteId={siteId} />}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <button onClick={() => setActiveStep(s => Math.max(1, s - 1))} disabled={activeStep === 1} className="btn-outline disabled:opacity-30">← Previous</button>
        <button onClick={() => setActiveStep(s => Math.min(4, s + 1))} disabled={activeStep === 4} className="btn-outline disabled:opacity-30">Next →</button>
      </div>
    </div>
  )
}
