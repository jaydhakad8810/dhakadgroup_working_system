import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Building2, Droplets, Plus, X, ChevronUp, ChevronDown, Loader2, Check } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

// ── Autocomplete input — defined OUTSIDE parent ──────────────────────────────
function AutocompleteInput({ value, onChange, placeholder, fieldType, siteId, className }) {
  const [suggestions, setSuggestions] = useState([])
  const [show, setShow] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchHints = async (q) => {
    if (q.length < 2) { setSuggestions([]); setShow(false); return }
    try {
      const params = `field_type=${fieldType}&query=${encodeURIComponent(q)}${siteId ? '&site_id=' + siteId : ''}`
      const res = await api.get('/workorders/hints?' + params)
      setSuggestions(Array.isArray(res.data) ? res.data : [])
      setShow(true)
    } catch { setSuggestions([]) }
  }

  const handleChange = (e) => { onChange(e.target.value); fetchHints(e.target.value) }
  const pick = (val) => { onChange(val); setSuggestions([]); setShow(false) }

  return (
    <div className="relative" ref={ref}>
      <input
        value={value}
        onChange={handleChange}
        onFocus={() => value.length >= 2 && suggestions.length && setShow(true)}
        placeholder={placeholder}
        className={className || 'w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50'}
      />
      {show && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-200 border border-white/15 rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onMouseDown={() => pick(s.value)}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-yellow-500/10 hover:text-white transition-colors">
              {s.value}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={i} className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
              done ? 'bg-yellow-500 text-black' : active ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400' : 'bg-surface-300 text-gray-500'
            }`}>
              {done ? <Check size={14} /> : n}
            </div>
            <span className={`text-xs truncate hidden sm:block ${active ? 'text-yellow-400 font-semibold' : done ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
            {i < steps.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${done ? 'bg-yellow-500' : 'bg-surface-300'}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Basic Info ────────────────────────────────────────────────────────
function Step1({ data, onChange, sites }) {
  const types = [
    { key: 'internal', label: 'Internal Paint', sub: 'Flat-by-flat tracking', icon: Home,      border: 'border-blue-500',   bg: 'bg-blue-500/10',   text: 'text-blue-400' },
    { key: 'external', label: 'External Paint', sub: 'Direction-based work',  icon: Building2, border: 'border-green-500',  bg: 'bg-green-500/10',  text: 'text-green-400' },
    { key: 'oil',      label: 'Oil Paint',      sub: 'Metal & wood areas',    icon: Droplets,  border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  ]

  const handleStartDate = (v) => {
    onChange('start_date', v)
    if (!data.end_date && v) {
      const d = new Date(v); d.setDate(d.getDate() + 30)
      onChange('end_date', d.toISOString().split('T')[0])
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Site *</label>
        <select value={data.site_id} onChange={e => onChange('site_id', e.target.value)}
          className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50">
          <option value="">Select site…</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">Work Order Type *</label>
        <div className="grid grid-cols-3 gap-3">
          {types.map(t => {
            const Icon = t.icon
            const sel = data.type === t.key
            return (
              <button key={t.key} type="button" onClick={() => onChange('type', t.key)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${sel ? `${t.border} ${t.bg}` : 'border-white/10 bg-surface-300 hover:border-white/20'}`}>
                <Icon size={22} className={sel ? t.text : 'text-gray-500'} />
                <p className={`font-semibold text-sm mt-2 ${sel ? 'text-white' : 'text-gray-400'}`}>{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.sub}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
        <input value={data.title} onChange={e => onChange('title', e.target.value)}
          placeholder="e.g. Tower A Internal Paint 2025"
          className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Start Date *</label>
          <input type="date" value={data.start_date} onChange={e => handleStartDate(e.target.value)}
            className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">End Date *</label>
          <input type="date" value={data.end_date} min={data.start_date} onChange={e => onChange('end_date', e.target.value)}
            className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Notes <span className="text-gray-500">(optional)</span></label>
        <textarea value={data.notes} onChange={e => onChange('notes', e.target.value)} rows={3}
          placeholder="Additional notes or instructions…"
          className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 resize-none" />
      </div>
    </div>
  )
}

// ── Step 2: Site Structure ────────────────────────────────────────────────────
function Step2({ data, onChange, type }) {
  const [wingInput, setWingInput] = useState('')
  const [customDir, setCustomDir] = useState('')

  const wings = Array.isArray(data.wing_config) ? data.wing_config : []
  const dirs  = Array.isArray(data.directions)  ? data.directions  : []

  const addWing = () => {
    const v = wingInput.trim()
    if (!v || wings.includes(v)) return
    onChange('wing_config', [...wings, v]); setWingInput('')
  }

  const removeWing = (w) => onChange('wing_config', wings.filter(x => x !== w))

  const toggleDir = (d) => {
    dirs.includes(d) ? onChange('directions', dirs.filter(x => x !== d)) : onChange('directions', [...dirs, d])
  }

  const addCustomDir = () => {
    const v = customDir.trim()
    if (!v || dirs.includes(v)) return
    onChange('directions', [...dirs, v]); setCustomDir('')
  }

  const flatCount = Math.max(0, (wings.length || 1) * (parseInt(data.floor_count) || 0) * (parseInt(data.flats_per_floor) || 0))

  if (type === 'internal') {
    return (
      <div className="space-y-6">
        {/* Wings */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Wing Names <span className="text-gray-500">(optional — leave blank for single wing)</span></label>
          <div className="flex gap-2 mb-2">
            <input value={wingInput} onChange={e => setWingInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWing())}
              placeholder="e.g. A, B, C…"
              className="flex-1 bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50" />
            <button type="button" onClick={addWing} className="px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/30">Add</button>
          </div>
          {wings.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {wings.map(w => (
                <span key={w} className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                  {w} <button type="button" onClick={() => removeWing(w)}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Floor Count *</label>
            <input type="number" min={1} value={data.floor_count || ''} onChange={e => onChange('floor_count', e.target.value)}
              className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Flats/Floor *</label>
            <input type="number" min={1} value={data.flats_per_floor || ''} onChange={e => onChange('flats_per_floor', e.target.value)}
              className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">First Flat No *</label>
            <input type="number" min={1} value={data.first_flat_no || ''} onChange={e => onChange('first_flat_no', e.target.value)}
              className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50" />
          </div>
        </div>

        {flatCount > 0 && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-400">
            Will generate <strong>{flatCount}</strong> flat records
          </div>
        )}
      </div>
    )
  }

  if (type === 'external') {
    const defaultDirs = ['East', 'West', 'North', 'South', 'Parking', 'Flat No']
    return (
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Directions / Areas *</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {defaultDirs.map(d => (
              <button key={d} type="button" onClick={() => toggleDir(d)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${dirs.includes(d) ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-surface-300 text-gray-400 border-white/10 hover:border-white/20'}`}>
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={customDir} onChange={e => setCustomDir(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomDir())}
              placeholder="Add custom direction…"
              className="flex-1 bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50" />
            <button type="button" onClick={addCustomDir} className="px-4 py-2 rounded-xl bg-yellow-500/20 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/30">Add</button>
          </div>
        </div>
        {dirs.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Work description per area</label>
            {dirs.map(d => (
              <div key={d}>
                <p className="text-xs text-gray-500 mb-1">{d}</p>
                <textarea rows={2} value={data[`dir_notes_${d}`] || ''}
                  onChange={e => onChange(`dir_notes_${d}`, e.target.value)}
                  placeholder={`Describe work on ${d}…`}
                  className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-yellow-500/50 resize-none" />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // oil
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Areas / Locations for oil paint work</label>
      <textarea rows={5} value={data.oil_areas || ''} onChange={e => onChange('oil_areas', e.target.value)}
        placeholder="List the areas, doors, windows, grills, etc. to be covered…"
        className="w-full bg-surface-300 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500/50 resize-none" />
    </div>
  )
}

// ── Step 3: Work Steps ────────────────────────────────────────────────────────
const DEFAULT_STEPS = {
  internal: ['Rubbing', 'Joint Repairing', 'Putty 1st Coat', 'Putty 2nd Coat', 'Internal Primer 1st Coat', 'Internal Primer 2nd Coat', 'Rubbing', 'Internal Paint 1st Coat', 'Internal Paint 2nd Coat', 'Cleaning'],
  external: ['External Primer', 'Crack Filling', 'Texture', 'External Paint 1st Coat', 'External Paint 2nd Coat', 'Cleaning'],
  oil:      ['Rubbing', 'Metal Primer', 'Oil Paint 1st Coat', 'Oil Paint 2nd Coat', 'Cleaning'],
}

function Step3({ steps, setSteps, type }) {
  const add = () => setSteps(s => [...s, { step_name: '', sequence_order: s.length + 1, start_date: '', end_date: '', notes: '', is_custom: true }])

  const update = (i, k, v) => setSteps(s => s.map((x, idx) => idx === i ? { ...x, [k]: v } : x))

  const remove = (i) => setSteps(s => s.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, sequence_order: idx + 1 })))

  const moveUp = (i) => {
    if (i === 0) return
    setSteps(s => { const a = [...s]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a.map((x, idx) => ({ ...x, sequence_order: idx + 1 })) })
  }

  const moveDown = (i) => {
    setSteps(s => { if (i >= s.length - 1) return s; const a = [...s]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a.map((x, idx) => ({ ...x, sequence_order: idx + 1 })) })
  }

  const PAINT_KEYWORDS = ['primer', 'putty', 'paint', 'texture', 'gypsum', 'oil paint']
  const isKeyStep = (name) => PAINT_KEYWORDS.some(k => name.toLowerCase().includes(k))

  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className={`p-3 rounded-xl border ${isKeyStep(step.step_name) ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10 bg-surface-300'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <input value={step.step_name} onChange={e => update(i, 'step_name', e.target.value)}
              placeholder="Step name…"
              className="flex-1 bg-surface-200 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-yellow-500/50" />
            <div className="flex gap-1">
              <button type="button" onClick={() => moveUp(i)} className="p-1 text-gray-500 hover:text-white"><ChevronUp size={14} /></button>
              <button type="button" onClick={() => moveDown(i)} className="p-1 text-gray-500 hover:text-white"><ChevronDown size={14} /></button>
              <button type="button" onClick={() => remove(i)} className="p-1 text-gray-500 hover:text-red-400"><X size={14} /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Start</label>
              <input type="date" value={step.start_date || ''} onChange={e => update(i, 'start_date', e.target.value)}
                className="w-full bg-surface-200 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500">End</label>
              <input type="date" value={step.end_date || ''} onChange={e => update(i, 'end_date', e.target.value)}
                className="w-full bg-surface-200 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50" />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-white/10 text-gray-500 hover:border-yellow-500/40 hover:text-yellow-400 text-sm flex items-center justify-center gap-2 transition-all">
        <Plus size={16} /> Add Custom Step
      </button>
    </div>
  )
}

// ── Step 4: Materials ─────────────────────────────────────────────────────────
const CATEGORIES = ['Primer', 'Putty', 'Paint', 'Gypsum', 'Metal Primer', 'Oil Paint', 'Other']
const UNITS      = ['LTR', 'KG', 'Nos', 'Unit']
const PAINT_CATS = ['Primer', 'Paint', 'Metal Primer', 'Oil Paint']

function Step4({ materials, setMaterials, steps, siteId, flatCount }) {
  const add = (stepId = null) => setMaterials(m => [...m, {
    step_id: stepId, product_category: 'Paint', company_name: '', product_name: '', shade: '', unit: 'LTR', total_quantity: '', per_flat_quantity: '', notes: '',
  }])

  const update = (i, k, v) => setMaterials(m => m.map((x, idx) => idx === i ? { ...x, [k]: v } : x))

  const remove = (i) => setMaterials(m => m.filter((_, idx) => idx !== i))

  const copyToAll = (i) => {
    const perFlat = parseFloat(materials[i].per_flat_quantity)
    if (!perFlat || !flatCount) return toast.error('Enter per-flat quantity and ensure structure is set')
    update(i, 'total_quantity', String((perFlat * flatCount).toFixed(2)))
  }

  const grouped = steps.reduce((acc, step) => {
    acc[step.step_name] = materials.filter(m => m.step_id === (step.id || step._tmpId || step.step_name))
    return acc
  }, { General: materials.filter(m => !m.step_id) })

  return (
    <div className="space-y-6">
      {/* General materials */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">General Materials</h3>
          <button type="button" onClick={() => add(null)} className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300">
            <Plus size={14} /> Add
          </button>
        </div>
        <MaterialRows
          rows={materials.filter(m => !m.step_id)}
          allMaterials={materials}
          setMaterials={setMaterials}
          siteId={siteId}
          flatCount={flatCount}
          update={update}
          remove={remove}
          copyToAll={copyToAll}
        />
      </div>

      {/* Per-step materials */}
      {steps.map((step, si) => {
        const stepKey = step.id || step.step_name
        const stepMats = materials.map((m, i) => ({ ...m, _idx: i })).filter(m => m.step_id === stepKey)
        return (
          <div key={si}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold text-sm">{step.step_name || `Step ${si + 1}`}</h3>
              <button type="button" onClick={() => {
                setMaterials(prev => [...prev, { step_id: stepKey, product_category: 'Paint', company_name: '', product_name: '', shade: '', unit: 'LTR', total_quantity: '', per_flat_quantity: '', notes: '' }])
              }} className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300">
                <Plus size={14} /> Add
              </button>
            </div>
            {stepMats.length === 0 && <p className="text-gray-600 text-xs text-center py-2">No materials — click Add to link one</p>}
            {stepMats.map(m => (
              <MaterialRow key={m._idx} mat={m} idx={m._idx} siteId={siteId} flatCount={flatCount} update={update} remove={remove} copyToAll={copyToAll} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function MaterialRows({ rows, allMaterials, setMaterials, siteId, flatCount, update, remove, copyToAll }) {
  return (
    <div className="space-y-2">
      {rows.length === 0 && <p className="text-gray-600 text-xs text-center py-2">No general materials yet</p>}
      {rows.map((m, _) => {
        const idx = allMaterials.indexOf(m)
        return <MaterialRow key={idx} mat={m} idx={idx} siteId={siteId} flatCount={flatCount} update={update} remove={remove} copyToAll={copyToAll} />
      })}
    </div>
  )
}

function MaterialRow({ mat, idx, siteId, flatCount, update, remove, copyToAll }) {
  const showShade = PAINT_CATS.includes(mat.product_category)
  return (
    <div className="p-3 bg-surface-300 border border-white/10 rounded-xl space-y-2 mb-2">
      <div className="flex items-center gap-2">
        <select value={mat.product_category} onChange={e => update(idx, 'product_category', e.target.value)}
          className="flex-1 bg-surface-200 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" onClick={() => remove(idx)} className="text-gray-500 hover:text-red-400"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <AutocompleteInput value={mat.company_name} onChange={v => update(idx, 'company_name', v)} placeholder="Company" fieldType="company_name" siteId={siteId}
          className="w-full bg-surface-200 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50" />
        <AutocompleteInput value={mat.product_name} onChange={v => update(idx, 'product_name', v)} placeholder="Product name" fieldType="product_name" siteId={siteId}
          className="w-full bg-surface-200 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50" />
      </div>
      {showShade && (
        <AutocompleteInput value={mat.shade || ''} onChange={v => update(idx, 'shade', v)} placeholder="Shade / Colour" fieldType="shade" siteId={siteId}
          className="w-full bg-surface-200 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50" />
      )}
      <div className="grid grid-cols-3 gap-2">
        <select value={mat.unit} onChange={e => update(idx, 'unit', e.target.value)}
          className="bg-surface-200 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50">
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <input type="number" value={mat.total_quantity} onChange={e => update(idx, 'total_quantity', e.target.value)} placeholder="Total qty"
          className="bg-surface-200 border border-white/10 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50" />
        <div className="flex gap-1">
          <input type="number" value={mat.per_flat_quantity} onChange={e => update(idx, 'per_flat_quantity', e.target.value)} placeholder="Per flat"
            className="flex-1 bg-surface-200 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-yellow-500/50" />
          {flatCount > 0 && (
            <button type="button" onClick={() => copyToAll(idx)} title="Calculate total = per flat × flat count"
              className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs hover:bg-yellow-500/30">×{flatCount}</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Wizard ───────────────────────────────────────────────────────────────
export default function WorkOrderCreate() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [sites, setSites] = useState([])

  const [formData, setFormData] = useState({
    site_id: '', type: 'internal', title: '', start_date: '', end_date: '', notes: '',
    wing_config: [], floor_count: '', flats_per_floor: '', first_flat_no: '',
    directions: [],
  })

  const [steps, setSteps] = useState([])
  const [materials, setMaterials] = useState([])

  useEffect(() => {
    api.get('/sites').then(r => setSites(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  // Auto-fill default steps when type changes
  useEffect(() => {
    if (formData.type && DEFAULT_STEPS[formData.type]) {
      setSteps(DEFAULT_STEPS[formData.type].map((name, i) => ({
        step_name: name, sequence_order: i + 1, start_date: '', end_date: '', notes: '', is_custom: false,
      })))
    }
  }, [formData.type])

  const updateForm = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  const flatCount = formData.type === 'internal'
    ? Math.max(0, (Array.isArray(formData.wing_config) && formData.wing_config.length > 0 ? formData.wing_config.length : 1) * (parseInt(formData.floor_count) || 0) * (parseInt(formData.flats_per_floor) || 0))
    : 0

  const canNext = () => {
    if (currentStep === 1) return formData.site_id && formData.type && formData.title && formData.start_date && formData.end_date
    if (currentStep === 2) return true
    if (currentStep === 3) return steps.every(s => s.step_name.trim())
    return true
  }

  const handleCreate = async () => {
    if (!canNext()) return toast.error('Please complete all required fields')
    setSaving(true)
    try {
      const body = {
        site_id:         formData.site_id,
        type:            formData.type,
        title:           formData.title,
        start_date:      formData.start_date,
        end_date:        formData.end_date,
        notes:           formData.notes || null,
        wing_config:     formData.type === 'internal' && formData.wing_config?.length ? formData.wing_config : null,
        floor_count:     formData.type === 'internal' ? parseInt(formData.floor_count) || null : null,
        flats_per_floor: formData.type === 'internal' ? parseInt(formData.flats_per_floor) || null : null,
        first_flat_no:   formData.type === 'internal' ? parseInt(formData.first_flat_no) || null : null,
        directions:      formData.type === 'external' && formData.directions?.length ? formData.directions : null,
      }

      const { data: wo } = await api.post('/workorders', body)

      if (steps.length > 0) {
        await api.post(`/workorders/${wo.id}/steps`, { steps })
      }
      if (materials.length > 0) {
        await api.post(`/workorders/${wo.id}/materials`, { materials })
      }

      toast.success('Work order created!')
      navigate('/workorders/' + wo.id)
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create work order') }
    setSaving(false)
  }

  const STEP_LABELS = ['Basic Info', 'Structure', 'Steps', 'Materials']

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/workorders')} className="text-gray-400 hover:text-white text-sm">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Work Order</h1>
          <p className="text-gray-400 text-sm">New paint / construction work order</p>
        </div>
      </div>

      <StepIndicator current={currentStep} steps={STEP_LABELS} />

      <div className="bg-surface-300 border border-white/10 rounded-2xl p-6">
        {currentStep === 1 && <Step1 data={formData} onChange={updateForm} sites={sites} />}
        {currentStep === 2 && <Step2 data={formData} onChange={updateForm} type={formData.type} />}
        {currentStep === 3 && <Step3 steps={steps} setSteps={setSteps} type={formData.type} />}
        {currentStep === 4 && <Step4 materials={materials} setMaterials={setMaterials} steps={steps} siteId={formData.site_id} flatCount={flatCount} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        {currentStep > 1 ? (
          <button onClick={() => setCurrentStep(s => s - 1)}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:border-white/20 text-sm transition-all">
            ← Back
          </button>
        ) : <div />}

        {currentStep < 4 ? (
          <button onClick={() => { if (!canNext()) return toast.error('Fill required fields'); setCurrentStep(s => s + 1) }}
            className="px-6 py-2.5 rounded-xl bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-400 transition-all disabled:opacity-50">
            Next →
          </button>
        ) : (
          <button onClick={handleCreate} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-yellow-500 text-black font-semibold text-sm hover:bg-yellow-400 transition-all disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Creating…' : 'Create Work Order'}
          </button>
        )}
      </div>
    </div>
  )
}
