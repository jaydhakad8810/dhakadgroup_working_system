import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Plus, X, AlertCircle, Loader2, ClipboardList, Camera, CheckCircle, Users } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const TODAY = new Date().toISOString().split('T')[0]

function fmtDate(d) {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length !== 3) return d
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1]} ${parts[0]}`
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cls = {
    draft: 'bg-gray-500/20 text-gray-400',
    submitted: 'bg-blue-500/20 text-blue-400',
    in_progress: 'bg-orange-500/20 text-orange-400',
    completed: 'bg-green-500/20 text-green-400',
  }
  const labels = { draft: 'Draft', submitted: 'Submitted', in_progress: 'In Progress', completed: 'Completed' }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {labels[status] || status}
    </span>
  )
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onContinue, onMarkAttendance }) {
  const canContinue = plan.status === 'draft' || plan.status === 'submitted'
  const isSubmitted = plan.status === 'submitted'
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium text-sm">{fmtDate(plan.date)}</span>
            <StatusBadge status={plan.status} />
          </div>
          <p className="text-xs text-gray-500">{plan.item_count || 0} tasks</p>
        </div>
        <div className="flex flex-col gap-1.5 ml-2 items-end">
          {canContinue && (
            <button
              onClick={() => onContinue(plan)}
              className="bg-primary-500/20 text-primary-400 border border-primary-500/30 text-xs px-3 py-1.5 rounded-lg font-medium active:scale-95 transition-all"
            >
              Continue
            </button>
          )}
          {isSubmitted && onMarkAttendance && (
            <button
              onClick={() => onMarkAttendance(plan)}
              className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs px-3 py-1.5 rounded-lg font-medium active:scale-95 transition-all"
            >
              Mark Attendance
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── GroupCard ────────────────────────────────────────────────────────────────
function GroupCard({ group, index, workOrderSteps, siteMaterials, onUpdate, onRemove, isCarryForward, siteId }) {
  const [labourGroups, setLabourGroups] = useState([])
  const [multiMaterials, setMultiMaterials] = useState([])

  useEffect(() => {
    if (!siteId) return
    api.get(`/labour-groups?site_id=${siteId}`).then(res => setLabourGroups(res.data || [])).catch(() => {})
  }, [siteId])

  function handleStepChange(stepId) {
    const step = workOrderSteps.find(s => s.id === stepId)
    if (!step) {
      onUpdate(group.id, { work_order_step_id: '', step_name: '', flat_nos: [] })
      return
    }
    onUpdate(group.id, { work_order_step_id: stepId, step_name: step.step_name })

    const sl = step.step_name.toLowerCase()
    let matches = []
    if (sl.includes('primer')) {
      matches = siteMaterials.filter(m => m.product_name.toLowerCase().includes('primer'))
    } else if (sl.includes('putty')) {
      matches = siteMaterials.filter(m => {
        const n = m.product_name.toLowerCase()
        return n.includes('putty') || n.includes('fine putty')
      })
    } else if (sl.includes('paint') || sl.includes('emulsion')) {
      matches = siteMaterials.filter(m => {
        const n = m.product_name.toLowerCase()
        return n.includes('paint') || n.includes('emulsion')
      })
    } else if (sl.includes('rub') || sl.includes('sand')) {
      matches = siteMaterials.filter(m => {
        const n = m.product_name.toLowerCase()
        return n.includes('paper') || n.includes('sand')
      })
    }

    if (matches.length === 1) {
      onUpdate(group.id, { material_name: matches[0].product_name, unit: matches[0].unit })
    } else if (matches.length > 1) {
      setMultiMaterials(matches)
    }
  }

  const selectedStep = workOrderSteps.find(s => s.id === group.work_order_step_id)
  const stepFlats = selectedStep ? (selectedStep.flat_nos || []) : []

  return (
    <div className="card" style={{ borderLeft: '3px solid #F97316' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">Group {index + 1}</span>
          {isCarryForward && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
              Carried Forward
            </span>
          )}
        </div>
        {!isCarryForward && (
          <button onClick={() => onRemove(group.id)} className="text-gray-500 hover:text-red-400 p-1 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mb-3">
        <label className="label">Labour Group</label>
        <select
          className="select"
          value={group.group_id || ''}
          onChange={e => {
            const sel = labourGroups.find(g => g.id === e.target.value)
            onUpdate(group.id, { group_id: e.target.value, group_name: sel ? sel.name : '' })
          }}
        >
          <option value="">Select group</option>
          {labourGroups.map(g => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="label">Task / Step</label>
        <select
          className="select"
          value={group.work_order_step_id || ''}
          onChange={e => handleStepChange(e.target.value)}
        >
          <option value="">Select step</option>
          {workOrderSteps.filter(s => s.status !== 'completed').map(s => (
            <option key={s.id} value={s.id}>{s.work_order_name} — {s.step_name}</option>
          ))}
        </select>
      </div>

      {multiMaterials.length > 0 && (
        <div className="mb-3">
          <label className="label">Select Material</label>
          <select
            className="select"
            value={group.material_name || ''}
            onChange={e => {
              const m = multiMaterials.find(x => x.product_name === e.target.value)
              onUpdate(group.id, { material_name: e.target.value, unit: m ? m.unit : group.unit })
              setMultiMaterials([])
            }}
          >
            <option value="">Pick one</option>
            {multiMaterials.map(m => (
              <option key={m.id} value={m.product_name}>{m.product_name}</option>
            ))}
          </select>
        </div>
      )}

      {stepFlats.length > 0 ? (
        <div className="mb-3">
          <label className="label">Flats</label>
          <div className="flex flex-wrap gap-2">
            {stepFlats.map(flat => {
              const isSelected = (group.flat_nos || []).includes(flat)
              return (
                <button
                  key={flat}
                  type="button"
                  onClick={() => {
                    const curr = group.flat_nos || []
                    const next = isSelected ? curr.filter(f => f !== flat) : [...curr, flat]
                    onUpdate(group.id, { flat_nos: next })
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-400 text-gray-400 border border-white/10'
                  }`}
                >
                  {flat}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <label className="label">Flat / Area</label>
          <input
            className="input"
            placeholder="Enter flat/area description"
            value={(group.flat_nos || []).join(', ')}
            onChange={e => onUpdate(group.id, { flat_nos: e.target.value ? [e.target.value] : [] })}
          />
        </div>
      )}

      <div className="mb-3">
        <label className="label">Material</label>
        <input
          className="input"
          placeholder="Material name"
          value={group.material_name || ''}
          onChange={e => onUpdate(group.id, { material_name: e.target.value })}
        />
        {siteMaterials.length > 0 && !group.material_name && (
          <select
            className="select mt-2"
            value=""
            onChange={e => {
              const m = siteMaterials.find(x => x.product_name === e.target.value)
              onUpdate(group.id, { material_name: e.target.value, unit: m ? m.unit : group.unit })
            }}
          >
            <option value="">Pick from site stock</option>
            {siteMaterials.map(m => (
              <option key={m.id} value={m.product_name}>{m.product_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Estimated Qty</label>
          <input
            type="number"
            className="input"
            placeholder="0"
            value={group.estimated_qty || ''}
            onChange={e => onUpdate(group.id, { estimated_qty: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Unit</label>
          <input
            className="input"
            placeholder="bags / ltr / m²"
            value={group.unit || ''}
            onChange={e => onUpdate(group.id, { unit: e.target.value })}
          />
        </div>
      </div>
    </div>
  )
}

// ─── LabourAttendanceCard ─────────────────────────────────────────────────────
function LabourAttendanceCard({ labour, status, onStatusChange }) {
  const initials = labour.name ? labour.name[0].toUpperCase() : '?'
  const buttons = [
    { key: 'present',  label: 'Present',  active: 'bg-green-500 text-white',  inactive: 'bg-surface-400 text-gray-400 border border-white/10' },
    { key: 'half_day', label: 'Half Day', active: 'bg-yellow-500 text-white', inactive: 'bg-surface-400 text-gray-400 border border-white/10' },
    { key: 'absent',   label: 'Absent',   active: 'bg-red-500 text-white',    inactive: 'bg-surface-400 text-gray-400 border border-white/10' },
  ]
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        {labour.photo
          ? <img src={labour.photo} className="w-10 h-10 rounded-full object-cover shrink-0" alt={labour.name} />
          : <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold shrink-0">{initials}</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{labour.name}</p>
          {labour.employee_id && <p className="text-gray-500 text-xs">{labour.employee_id}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        {buttons.map(btn => (
          <button
            key={btn.key}
            type="button"
            onClick={() => onStatusChange(labour.id, btn.key)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${status === btn.key ? btn.active : btn.inactive}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── PhotoCaptureCard ─────────────────────────────────────────────────────────
function PhotoCaptureCard({ labour, photoUrl, onPhotoCapture, uploading }) {
  const fileRef = useRef(null)
  const initials = labour.name ? labour.name[0].toUpperCase() : '?'
  const isUploading = uploading[labour.id]
  const hasPhoto = !!photoUrl
  return (
    <div className={`card ${hasPhoto ? 'border-green-500/40' : 'border-red-500/30'}`}>
      <div className="flex items-center gap-3">
        {labour.photo
          ? <img src={labour.photo} className="w-10 h-10 rounded-full object-cover shrink-0" alt={labour.name} />
          : <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold shrink-0">{initials}</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{labour.name}</p>
          {labour.employee_id && <p className="text-gray-500 text-xs">{labour.employee_id}</p>}
        </div>
        {hasPhoto && <CheckCircle size={20} className="text-green-400 shrink-0" />}
      </div>
      {hasPhoto ? (
        <div className="mt-3 flex items-center gap-3">
          <img src={photoUrl} className="w-16 h-16 rounded-lg object-cover border border-green-500/30" alt="check-in" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
          >
            Retake
          </button>
        </div>
      ) : (
        <div className="mt-3">
          {isUploading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={16} className="animate-spin text-primary-400" />
              <span className="text-xs text-gray-400">Uploading...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-2 rounded-lg border border-primary-500/40 text-primary-400 text-xs font-medium flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Camera size={14} />
              Take Photo
            </button>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files[0] && onPhotoCapture(labour.id, e.target.files[0])}
      />
    </div>
  )
}

// ─── CheckoutItemCard ─────────────────────────────────────────────────────────
function CheckoutItemCard({ item, onUpdate, extraMaterials, onAddExtra, onRemoveExtra, onUpdateExtra }) {
  const itemExtras = extraMaterials[item.id] || []
  const allFlats = item.flat_nos || []
  const completedFlats = item.completed_flat_nos || []
  const statusOptions = [
    { value: 'done',          label: 'Done',      cls: 'bg-green-500 text-white' },
    { value: 'carry_forward', label: 'Carry Fwd', cls: 'bg-orange-500 text-white' },
    { value: 'partial',       label: 'Partial',   cls: 'bg-yellow-500 text-white' },
  ]
  return (
    <div className="card" style={{ borderLeft: '3px solid #F97316' }}>
      {/* Header */}
      <div className="mb-3">
        {item.group_name && <p className="text-orange-400 font-bold text-sm">{item.group_name}</p>}
        <p className="text-gray-400 text-xs mt-0.5">{item.step_name || 'Task'}</p>
        {item.material_name && (
          <p className="text-gray-500 text-xs mt-1">
            {item.material_name}
            {item.estimated_qty && <span className="text-gray-600"> · Est. {item.estimated_qty} {item.unit}</span>}
          </p>
        )}
      </div>

      {/* Flat toggles — all selected by default */}
      {allFlats.length > 0 && (
        <div className="mb-3">
          <label className="label">Flats Done Today</label>
          <div className="flex flex-wrap gap-2">
            {allFlats.map(flat => {
              const isDone = completedFlats.includes(flat)
              return (
                <button
                  key={flat}
                  type="button"
                  onClick={() => {
                    const next = isDone
                      ? completedFlats.filter(f => f !== flat)
                      : [...completedFlats, flat]
                    onUpdate(item.id, { completed_flat_nos: next })
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${isDone ? 'bg-primary-500 text-white' : 'bg-surface-400 text-gray-500 border border-white/10'}`}
                >
                  {flat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Actual qty */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="label">Actual Qty *</label>
          <input
            type="number"
            className="input"
            placeholder="0"
            value={item.actual_qty || ''}
            onChange={e => onUpdate(item.id, { actual_qty: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Unit</label>
          <input className="input text-gray-500" value={item.unit || ''} readOnly />
        </div>
      </div>

      {/* Extra material rows */}
      {itemExtras.map((extra, idx) => (
        <div key={idx} className="flex gap-2 mb-2 items-end">
          <div className="flex-1">
            {idx === 0 && <label className="label">Extra Material</label>}
            <input
              className="input"
              placeholder="Material name"
              value={extra.material_name}
              onChange={e => onUpdateExtra(item.id, idx, 'material_name', e.target.value)}
            />
          </div>
          <div className="w-20">
            {idx === 0 && <label className="label">Qty</label>}
            <input
              type="number"
              className="input"
              placeholder="0"
              value={extra.qty}
              onChange={e => onUpdateExtra(item.id, idx, 'qty', e.target.value)}
            />
          </div>
          <div className="w-16">
            {idx === 0 && <label className="label">Unit</label>}
            <input
              className="input"
              placeholder="unit"
              value={extra.unit}
              onChange={e => onUpdateExtra(item.id, idx, 'unit', e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveExtra(item.id, idx)}
            className="p-2 text-red-400 hover:text-red-300 transition-colors shrink-0"
          >
            <X size={15} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onAddExtra(item.id)}
        className="text-xs text-primary-400 flex items-center gap-1 mb-3 transition-all active:scale-95"
      >
        <Plus size={13} />
        Add Extra Material
      </button>

      {/* Status */}
      <div className="mb-3">
        <label className="label">Status</label>
        <div className="flex gap-2">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate(item.id, { status: opt.value })}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${item.status === opt.value ? opt.cls : 'bg-surface-400 text-gray-400 border border-white/10'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Partial flat selector */}
      {item.status === 'partial' && allFlats.length > 0 && (
        <div className="mb-3">
          <label className="label">Completed Flats (Partial)</label>
          <div className="flex flex-wrap gap-2">
            {allFlats.map(flat => {
              const selected = (item.partial_flat_nos || []).includes(flat)
              return (
                <button
                  key={flat}
                  type="button"
                  onClick={() => {
                    const curr = item.partial_flat_nos || []
                    const next = selected ? curr.filter(f => f !== flat) : [...curr, flat]
                    onUpdate(item.id, { partial_flat_nos: next })
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${selected ? 'bg-yellow-500 text-white' : 'bg-surface-400 text-gray-400 border border-white/10'}`}
                >
                  {flat}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="label">Notes</label>
        <input
          className="input"
          placeholder="Any checkout notes..."
          value={item.checkout_notes || ''}
          onChange={e => onUpdate(item.id, { checkout_notes: e.target.value })}
        />
      </div>
    </div>
  )
}

// ─── CheckoutPhotoCard ────────────────────────────────────────────────────────
function CheckoutPhotoCard({ labour, photoUrl, onPhotoCapture, uploading }) {
  const fileRef = useRef(null)
  const initials = labour.name ? labour.name[0].toUpperCase() : '?'
  const isUploading = uploading[labour.id]
  const hasPhoto = !!photoUrl
  return (
    <div className={`card ${hasPhoto ? 'border-green-500/40' : 'border-white/10'}`}>
      <div className="flex items-center gap-3">
        {labour.photo
          ? <img src={labour.photo} className="w-10 h-10 rounded-full object-cover shrink-0" alt={labour.name} />
          : <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold shrink-0">{initials}</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{labour.name}</p>
        </div>
        {hasPhoto && <CheckCircle size={20} className="text-green-400 shrink-0" />}
      </div>
      {hasPhoto ? (
        <div className="mt-3 flex items-center gap-3">
          <img src={photoUrl} className="w-16 h-16 rounded-lg object-cover border border-green-500/30" alt="checkout" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="text-xs text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all">
            Retake
          </button>
        </div>
      ) : (
        <div className="mt-3">
          {isUploading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={16} className="animate-spin text-primary-400" />
              <span className="text-xs text-gray-400">Uploading...</span>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full py-2 rounded-lg border border-primary-500/40 text-primary-400 text-xs font-medium flex items-center justify-center gap-2 active:scale-95 transition-all">
              <Camera size={14} />
              Take Checkout Photo
            </button>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => e.target.files[0] && onPhotoCapture(labour.id, e.target.files[0])}
      />
    </div>
  )
}

// ─── DailyPlan (main) ─────────────────────────────────────────────────────────
export default function DailyPlan() {
  const [view, setView] = useState('list')
  const [siteId, setSiteId] = useState('')
  const [todayPlan, setTodayPlan] = useState(null)
  const [planHistory, setPlanHistory] = useState([])
  const [carryForwardItems, setCarryForwardItems] = useState([])
  const [groups, setGroups] = useState([])
  const [planDate, setPlanDate] = useState(TODAY)
  const [planNotes, setPlanNotes] = useState('')
  const [workOrderSteps, setWorkOrderSteps] = useState([])
  const [siteMaterials, setSiteMaterials] = useState([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Attendance flow state
  const [labours, setLabours] = useState([])
  const [attendance, setAttendance] = useState({})
  const [checkInPhotos, setCheckInPhotos] = useState({})
  const [attendanceStep, setAttendanceStep] = useState(1)
  const [uploadingPhoto, setUploadingPhoto] = useState({})
  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [attendancePlanId, setAttendancePlanId] = useState(null)

  // Checkout flow state
  const [checkoutItems, setCheckoutItems] = useState([])
  const [checkoutPhotos, setCheckoutPhotos] = useState({})
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [uploadingCheckoutPhoto, setUploadingCheckoutPhoto] = useState({})
  const [submittingCheckout, setSubmittingCheckout] = useState(false)
  const [extraMaterials, setExtraMaterials] = useState({})

  async function fetchInitialData(sid) {
    if (!sid) return
    try {
      const [planRes, historyRes, cfRes, woRes, matRes] = await Promise.allSettled([
        api.get(`/daily-plans?site_id=${sid}&date=${TODAY}`),
        api.get(`/daily-plans/history?site_id=${sid}`),
        api.get(`/daily-plans/carry-forward?site_id=${sid}`),
        api.get(`/workorders?site_id=${sid}`),
        api.get(`/workorders/site-materials?site_id=${sid}`),
      ])
      if (planRes.status === 'fulfilled') {
        const d = planRes.value.data
        setTodayPlan(d.exists ? d.plan : null)
      }
      if (historyRes.status === 'fulfilled') setPlanHistory(historyRes.value.data || [])
      if (cfRes.status === 'fulfilled') setCarryForwardItems(cfRes.value.data || [])
      if (woRes.status === 'fulfilled') {
        const wos = woRes.value.data || []
        const flatSteps = wos.flatMap(wo =>
          (wo.steps || []).map(step => ({
            ...step,
            work_order_name: wo.title,
            flat_nos: (wo.flats || []).map(f => f.wing ? `${f.wing}-${f.flat_no}` : String(f.flat_no)),
          }))
        )
        setWorkOrderSteps(flatSteps)
      }
      if (matRes.status === 'fulfilled') setSiteMaterials(matRes.value.data || [])
    } catch {
      toast.error('Failed to load plan data')
    }
    setLoading(false)
  }

  useEffect(() => {
    api.get('/sites')
      .then(res => {
        const s = (res.data || [])[0]
        if (s) {
          setSiteId(s.id)
          fetchInitialData(s.id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  function initializeGroups(existingPlan, carryForwards) {
    const cfGroups = carryForwards.map(item => ({
      id: item.id,
      group_id: item.group_id || '',
      group_name: item.group_name || '',
      work_order_step_id: item.work_order_step_id || '',
      step_name: item.step_name || '',
      flat_nos: item.flat_nos || [],
      material_name: item.material_name || '',
      estimated_qty: item.estimated_qty || '',
      unit: item.unit || '',
      isCarryForward: true,
    }))
    if (existingPlan && existingPlan.items) {
      const existingGroups = existingPlan.items
        .filter(i => i.status !== 'carry_forward')
        .map(item => ({ ...item, id: item.id, isCarryForward: false }))
      setGroups([...cfGroups, ...existingGroups])
    } else {
      setGroups(cfGroups)
    }
  }

  function updateGroup(groupId, updates) {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, ...updates } : g))
  }

  function removeGroup(groupId) {
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }

  function openCreateView(existingPlan) {
    initializeGroups(existingPlan, carryForwardItems)
    setPlanNotes(existingPlan ? existingPlan.notes || '' : '')
    setView('create')
  }

  async function savePlan(submitStatus) {
    if (submitStatus === 'submitted' && groups.length === 0) {
      toast.error('Add at least one group')
      return
    }
    setSaving(true)
    try {
      const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
      const items = groups.map(g => ({
        group_id: g.group_id || null,
        group_name: g.group_name || '',
        work_order_step_id: g.work_order_step_id || null,
        step_name: g.step_name || '',
        flat_nos: g.flat_nos || [],
        material_name: g.material_name || '',
        estimated_qty: g.estimated_qty ? parseFloat(g.estimated_qty) : null,
        unit: g.unit || '',
      }))

      let plan
      if (todayPlan && todayPlan.id) {
        const res = await api.put(
          `/daily-plans/${todayPlan.id}`,
          { notes: planNotes, items },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        plan = res.data
      } else {
        const res = await api.post(
          '/daily-plans',
          { site_id: siteId, date: planDate, notes: planNotes, items },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        plan = res.data
      }

      if (submitStatus === 'submitted') {
        await api.patch(
          `/daily-plans/${plan.id}/submit`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
        toast.success('Plan submitted successfully')
      } else {
        toast.success('Plan saved as draft')
      }

      setTodayPlan({ ...plan, status: submitStatus })
      setView('list')
      fetchInitialData(siteId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  async function loadLaboursForAttendance() {
    try {
      const res = await api.get(`/labour?site_id=${siteId}&is_active=true`)
      const fetched = res.data || []
      setLabours(fetched)
      const defaults = {}
      fetched.forEach(l => { defaults[l.id] = 'present' })
      setAttendance(defaults)
    } catch {
      toast.error('Failed to load labours')
    }
  }

  async function uploadCheckInPhoto(labourId, file) {
    setUploadingPhoto(prev => ({ ...prev, [labourId]: true }))
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/upload/single', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.url || res.data?.data?.url || ''
      setCheckInPhotos(prev => ({ ...prev, [labourId]: url }))
    } catch {
      toast.error('Photo upload failed')
    } finally {
      setUploadingPhoto(prev => { const n = { ...prev }; delete n[labourId]; return n })
    }
  }

  async function submitAttendance() {
    setSubmittingAttendance(true)
    try {
      const date = todayPlan?.date || TODAY
      const records = labours.map(l => ({
        labour_id: l.id,
        status: attendance[l.id] || 'absent',
        date,
        site_id: siteId,
      }))
      const bulkRes = await api.post('/attendance/bulk', { site_id: siteId, date, records })
      const attRecords = bulkRes.data?.data || bulkRes.data || []

      const presentRecords = attRecords.filter(r => r.status === 'present' || r.status === 'half_day')
      await Promise.allSettled(
        presentRecords.map(r => {
          const photoUrl = checkInPhotos[r.labour_id]
          if (!photoUrl) return Promise.resolve()
          return api.patch(`/attendance/${r._id || r.id}/checkin`, { check_in_photo: photoUrl })
        })
      )

      if (attendancePlanId) {
        await api.put(`/daily-plans/${attendancePlanId}`, { status: 'in_progress' })
      }

      toast.success('Attendance submitted successfully')
      setView('list')
      fetchInitialData(siteId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit attendance')
    } finally {
      setSubmittingAttendance(false)
    }
  }

  function handleMarkAttendance(plan) {
    setAttendancePlanId(plan.id)
    setTodayPlan(plan)
    setAttendanceStep(1)
    setCheckInPhotos({})
    setAttendance({})
    loadLaboursForAttendance()
    setView('attend')
  }

  async function initializeCheckoutItems() {
    let items = todayPlan?.items
    if (!items) {
      try {
        const res = await api.get(`/daily-plans?site_id=${siteId}&date=${todayPlan?.date || TODAY}`)
        items = res.data?.plan?.items
      } catch {}
    }
    setCheckoutItems((items || []).map(item => ({
      ...item,
      completed_flat_nos: item.flat_nos || [],
      actual_qty: '',
      status: 'done',
      partial_flat_nos: [],
      checkout_notes: '',
    })))
    setExtraMaterials({})
    setCheckoutStep(1)
  }

  function updateCheckoutItem(itemId, updates) {
    setCheckoutItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i))
  }

  function addExtraMaterial(itemId) {
    setExtraMaterials(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { material_name: '', qty: '', unit: '' }],
    }))
  }

  function removeExtraMaterial(itemId, index) {
    setExtraMaterials(prev => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, i) => i !== index),
    }))
  }

  function updateExtraMaterial(itemId, index, field, value) {
    setExtraMaterials(prev => ({
      ...prev,
      [itemId]: prev[itemId].map((e, i) => i === index ? { ...e, [field]: value } : e),
    }))
  }

  async function uploadCheckoutPhoto(labourId, file) {
    setUploadingCheckoutPhoto(prev => ({ ...prev, [labourId]: true }))
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/upload/single', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = res.data?.url || res.data?.data?.url || ''
      setCheckoutPhotos(prev => ({ ...prev, [labourId]: url }))
    } catch {
      toast.error('Photo upload failed')
    } finally {
      setUploadingCheckoutPhoto(prev => { const n = { ...prev }; delete n[labourId]; return n })
    }
  }

  async function submitCheckout() {
    setSubmittingCheckout(true)
    try {
      const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
      const headers = { Authorization: `Bearer ${token}` }

      await Promise.allSettled(
        checkoutItems.map(item =>
          api.patch(`/daily-plans/items/${item.id}/checkout`, {
            actual_qty: parseFloat(item.actual_qty) || 0,
            status: item.status,
            partial_flat_nos: item.status === 'partial' ? (item.partial_flat_nos || []) : [],
            checkout_notes: item.checkout_notes || '',
          }, { headers })
        )
      )

      const date = todayPlan?.date || TODAY
      try {
        const attRes = await api.get(`/attendance?site_id=${siteId}&date=${date}`)
        const attRecords = attRes.data?.data || attRes.data || []
        await Promise.allSettled(
          attRecords
            .filter(r => r.status === 'present' || r.status === 'half_day')
            .map(r => {
              const photoUrl = checkoutPhotos[r.labour_id]
              if (!photoUrl) return Promise.resolve()
              return api.patch(`/attendance/${r._id || r.id}/checkout`, { check_out_photo: photoUrl }, { headers })
            })
        )
      } catch {}

      await api.put(`/daily-plans/${todayPlan.id}`, { status: 'completed' }, { headers })
      toast.success('Day completed successfully!')
      setView('list')
      fetchInitialData(siteId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed')
    } finally {
      setSubmittingCheckout(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    )
  }

  if (view === 'attend') {
    const presentLabours = labours.filter(l => attendance[l.id] !== 'absent')
    const presentCount  = labours.filter(l => attendance[l.id] === 'present').length
    const halfCount     = labours.filter(l => attendance[l.id] === 'half_day').length
    const absentCount   = labours.filter(l => attendance[l.id] === 'absent').length
    const photosCount   = presentLabours.filter(l => checkInPhotos[l.id]).length
    const totalForPhotos = presentLabours.length
    const allPhotosReady = totalForPhotos > 0 && photosCount === totalForPhotos

    // ── Step 1: Mark Present / Absent ──
    if (attendanceStep === 1) {
      return (
        <div className="page-content" style={{ paddingBottom: 120 }}>
          <div className="card">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="text-gray-400 hover:text-white p-1 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h1 className="text-base font-bold text-white">Attendance — Step 1 of 3</h1>
                <p className="text-xs text-gray-500">{fmtDate(todayPlan?.date)}</p>
              </div>
              <button
                onClick={() => {
                  const all = {}
                  labours.forEach(l => { all[l.id] = 'present' })
                  setAttendance(all)
                }}
                className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg font-medium active:scale-95 transition-all"
              >
                All Present
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3].map(n => (
              <div key={n} className={`h-2 rounded-full transition-all ${n === attendanceStep ? 'w-8 bg-primary-500' : n < attendanceStep ? 'w-6 bg-primary-500/60' : 'w-6 bg-surface-400'}`} />
            ))}
          </div>

          <div className="card">
            <div className="flex gap-4 text-xs">
              <span className="text-green-400 font-medium">Present: {presentCount}</span>
              <span className="text-yellow-400 font-medium">Half Day: {halfCount}</span>
              <span className="text-red-400 font-medium">Absent: {absentCount}</span>
            </div>
          </div>

          {labours.length === 0 ? (
            <div className="text-center py-12">
              <Users size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400 font-medium">No labours assigned to this site</p>
              <p className="text-gray-500 text-sm mt-1">Add labours in the Labour section first</p>
            </div>
          ) : (
            labours.map(l => (
              <LabourAttendanceCard
                key={l.id}
                labour={l}
                status={attendance[l.id] || 'present'}
                onStatusChange={(id, s) => setAttendance(prev => ({ ...prev, [id]: s }))}
              />
            ))
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setView('list')}
              className="py-3 px-5 rounded-xl bg-surface-400 text-gray-300 font-semibold text-sm transition-all active:scale-95"
            >
              Back
            </button>
            <button
              onClick={() => setAttendanceStep(2)}
              disabled={presentLabours.length === 0}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-40"
            >
              Next — Check-in Photos
            </button>
          </div>
        </div>
      )
    }

    // ── Step 2: Check-in Photos ──
    return (
      <div className="page-content" style={{ paddingBottom: 120 }}>
        <div className="card">
          <div className="flex items-center gap-3">
            <button onClick={() => setAttendanceStep(1)} className="text-gray-400 hover:text-white p-1 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-white">Check-in Photos — Step 2 of 3</h1>
              <p className="text-xs text-gray-500">{fmtDate(todayPlan?.date)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(n => (
            <div key={n} className={`h-2 rounded-full transition-all ${n === attendanceStep ? 'w-8 bg-primary-500' : n < attendanceStep ? 'w-6 bg-primary-500/60' : 'w-6 bg-surface-400'}`} />
          ))}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-white font-medium">Photos taken: {photosCount} / {totalForPhotos}</p>
          </div>
          <div className="h-2 rounded-full bg-surface-400 overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: totalForPhotos > 0 ? `${Math.round((photosCount / totalForPhotos) * 100)}%` : '0%' }}
            />
          </div>
        </div>

        {presentLabours.map(l => (
          <PhotoCaptureCard
            key={l.id}
            labour={l}
            photoUrl={checkInPhotos[l.id] || ''}
            onPhotoCapture={uploadCheckInPhoto}
            uploading={uploadingPhoto}
          />
        ))}

        {!allPhotosReady && totalForPhotos > 0 && (
          <p className="text-center text-xs text-gray-500">Take photos for all present labours to continue</p>
        )}

        <button
          onClick={submitAttendance}
          disabled={!allPhotosReady || submittingAttendance}
          className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
        >
          {submittingAttendance && <Loader2 size={15} className="animate-spin" />}
          Submit Attendance
        </button>
      </div>
    )
  }

  if (view === 'list') {
    const canContinueToday = todayPlan && (todayPlan.status === 'draft' || todayPlan.status === 'submitted')
    const todayBlocked = todayPlan && (todayPlan.status === 'in_progress' || todayPlan.status === 'completed')

    return (
      <div className="page-content" style={{ paddingBottom: 100 }}>
        <div className="card">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <ClipboardList size={18} className="text-primary-400" />
            Daily Plans
          </h1>
          <p className="text-xs text-gray-400 mt-1">Plan your site's tasks for the day</p>
        </div>

        {todayPlan && todayPlan.status === 'in_progress' ? (
          <div className="flex gap-3">
            <div className="flex-1 py-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-center">
              <p className="text-green-400 font-semibold text-sm">Attendance Done ✓</p>
              <p className="text-green-500/70 text-xs mt-0.5">{fmtDate(todayPlan.date)}</p>
            </div>
            <button
              onClick={() => { initializeCheckoutItems(); loadLaboursForAttendance(); setView('checkout') }}
              className="py-4 px-4 rounded-2xl bg-orange-500 text-white border border-orange-500/30 font-medium text-sm transition-all active:scale-95"
            >
              Start Checkout
            </button>
          </div>
        ) : (
          <button
            className={`w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 ${
              canContinueToday || !todayPlan
                ? 'bg-primary-500 text-white'
                : 'bg-surface-400 text-gray-400 border border-white/10'
            }`}
            onClick={() => {
              if (todayBlocked) {
                toast(`Today's Plan is ${todayPlan.status.replace(/_/g, ' ')}`)
              } else if (canContinueToday) {
                openCreateView(todayPlan)
              } else {
                openCreateView(null)
              }
            }}
          >
            {canContinueToday
              ? "Continue Today's Plan"
              : todayBlocked
              ? `Today's Plan — ${todayPlan.status.replace(/_/g, ' ')}`
              : 'Plan for Today'}
          </button>
        )}

        {carryForwardItems.length > 0 && (
          <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-orange-400 shrink-0" />
            <p className="text-orange-300 text-sm">{carryForwardItems.length} tasks carried forward from yesterday</p>
          </div>
        )}

        {planHistory.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Recent Plans</p>
            {planHistory.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onContinue={async p => {
                  try {
                    const res = await api.get(`/daily-plans?site_id=${siteId}&date=${p.date}`)
                    openCreateView(res.data?.plan || p)
                  } catch {
                    openCreateView(p)
                  }
                }}
                onMarkAttendance={handleMarkAttendance}
              />
            ))}
          </div>
        )}

        {planHistory.length === 0 && !todayPlan && (
          <div className="text-center py-12">
            <ClipboardList size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No plans yet</p>
            <p className="text-gray-500 text-sm mt-1">Start by planning today's tasks</p>
          </div>
        )}
      </div>
    )
  }

  if (view === 'checkout') {
    const presentLabours = labours.filter(l => !attendance[l.id] || attendance[l.id] !== 'absent')
    const photoCount = presentLabours.filter(l => checkoutPhotos[l.id]).length

    // ── Step 1: Task Results ──
    if (checkoutStep === 1) {
      return (
        <div className="page-content" style={{ paddingBottom: 120 }}>
          <div className="card">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('list')} className="text-gray-400 hover:text-white p-1 transition-colors">
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h1 className="text-base font-bold text-white">Checkout — Step 1 of 2</h1>
                <p className="text-xs text-gray-500">{fmtDate(todayPlan?.date)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            {[1, 2].map(n => (
              <div key={n} className={`h-2 rounded-full transition-all ${n === 1 ? 'w-8 bg-primary-500' : 'w-6 bg-surface-400'}`} />
            ))}
          </div>

          {checkoutItems.length === 0 ? (
            <div className="card text-center py-6">
              <p className="text-gray-500 text-sm">No tasks to checkout</p>
            </div>
          ) : (
            checkoutItems.map(item => (
              <CheckoutItemCard
                key={item.id}
                item={item}
                onUpdate={updateCheckoutItem}
                extraMaterials={extraMaterials}
                onAddExtra={addExtraMaterial}
                onRemoveExtra={removeExtraMaterial}
                onUpdateExtra={updateExtraMaterial}
              />
            ))
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setView('list')}
              className="py-3 px-5 rounded-xl bg-surface-400 text-gray-300 font-semibold text-sm transition-all active:scale-95"
            >
              Back
            </button>
            <button
              onClick={() => {
                const invalid = checkoutItems.filter(i => i.material_name && !i.actual_qty)
                if (invalid.length > 0) {
                  toast.error(`Enter actual qty for: ${invalid[0].step_name || 'task'}`)
                  return
                }
                setCheckoutStep(2)
              }}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm transition-all active:scale-95"
            >
              Continue to Photos →
            </button>
          </div>
        </div>
      )
    }

    // ── Step 2: Checkout Photos ──
    return (
      <div className="page-content" style={{ paddingBottom: 120 }}>
        <div className="card">
          <div className="flex items-center gap-3">
            <button onClick={() => setCheckoutStep(1)} className="text-gray-400 hover:text-white p-1 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-white">Checkout — Step 2 of 2</h1>
              <p className="text-xs text-gray-500">{fmtDate(todayPlan?.date)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {[1, 2].map(n => (
            <div key={n} className={`h-2 rounded-full transition-all ${n === 2 ? 'w-8 bg-primary-500' : 'w-6 bg-primary-500/60'}`} />
          ))}
        </div>

        <div className="card">
          <p className="text-sm text-white font-medium">Photos: {photoCount} / {presentLabours.length}</p>
          <p className="text-xs text-gray-500 mt-1">Photos are optional but recommended</p>
        </div>

        {presentLabours.length === 0 ? (
          <div className="card text-center py-4">
            <p className="text-gray-500 text-sm">No present labours for checkout photos</p>
          </div>
        ) : (
          presentLabours.map(l => (
            <CheckoutPhotoCard
              key={l.id}
              labour={l}
              photoUrl={checkoutPhotos[l.id] || ''}
              onPhotoCapture={uploadCheckoutPhoto}
              uploading={uploadingCheckoutPhoto}
            />
          ))
        )}

        <button
          onClick={submitCheckout}
          disabled={submittingCheckout}
          className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
        >
          {submittingCheckout && <Loader2 size={15} className="animate-spin" />}
          {submittingCheckout ? 'Completing...' : 'Complete Day'}
        </button>
      </div>
    )
  }

  return (
    <div className="page-content" style={{ paddingBottom: 120 }}>
      <div className="card">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="text-gray-400 hover:text-white p-1 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base font-bold text-white">Plan for {fmtDate(planDate)}</h1>
            <p className="text-xs text-gray-500">Add task groups for your team</p>
          </div>
        </div>
      </div>

      <div className="card">
        <label className="label">Date</label>
        <input
          type="date"
          className="input"
          value={planDate}
          min={TODAY}
          disabled={!!(todayPlan && todayPlan.id)}
          onChange={e => setPlanDate(e.target.value)}
        />
      </div>

      {carryForwardItems.length > 0 && (
        <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-orange-400 shrink-0" />
          <p className="text-orange-300 text-sm">{carryForwardItems.length} tasks carried over from yesterday</p>
        </div>
      )}

      {groups.map((group, index) => (
        <GroupCard
          key={group.id}
          group={group}
          index={index}
          workOrderSteps={workOrderSteps}
          siteMaterials={siteMaterials}
          onUpdate={updateGroup}
          onRemove={removeGroup}
          isCarryForward={!!group.isCarryForward}
          siteId={siteId}
        />
      ))}

      <button
        className="w-full py-3 rounded-xl border border-primary-500/40 text-primary-400 text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-primary-500/10"
        onClick={() => setGroups(prev => [...prev, {
          id: Date.now().toString(),
          group_id: '',
          group_name: '',
          work_order_step_id: '',
          step_name: '',
          flat_nos: [],
          material_name: '',
          estimated_qty: '',
          unit: '',
          isCarryForward: false,
        }])}
      >
        <Plus size={16} />
        Add Group
      </button>

      <div className="card">
        <label className="label">Notes (optional)</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Any notes for today's plan (optional)"
          value={planNotes}
          onChange={e => setPlanNotes(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => savePlan('draft')}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-surface-400 text-gray-300 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Save as Draft
        </button>
        <button
          onClick={() => savePlan('submitted')}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Submit Plan
        </button>
      </div>
    </div>
  )
}
