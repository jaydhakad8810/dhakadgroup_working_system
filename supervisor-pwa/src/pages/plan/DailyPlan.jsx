import { useState, useEffect, useRef, useMemo } from 'react'
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

// ─── UNITS ────────────────────────────────────────────────────────────────────
const UNITS = ['Kg', 'Ltr', 'Nos']

// ─── FlatStatusPopup ──────────────────────────────────────────────────────────
function FlatStatusPopup({ flat, onClose }) {
  const flatLabel = flat.wing ? `${flat.wing}-${flat.flat_no}` : String(flat.flat_no)
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 1000, display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px'
    }}>
      <div style={{
        background: '#1a1a1a', borderRadius: '12px',
        padding: '20px', width: '100%', maxWidth: '340px',
        border: '1px solid #333'
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '16px'
        }}>
          <span style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '16px' }}>
            Flat {flatLabel}
          </span>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>
        {(flat.allSteps || []).map((step, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '10px 0',
            borderBottom: '1px solid #2a2a2a'
          }}>
            <span style={{ color: '#ccc', fontSize: '14px' }}>{step.step_name}</span>
            {step.status === 'done'
              ? <span style={{ color: '#22c55e', fontSize: '13px', fontWeight: 'bold' }}>✓ Done</span>
              : <span style={{ color: '#888', fontSize: '13px' }}>⬜ Pending</span>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MaterialRow ──────────────────────────────────────────────────────────────
function MaterialRow({ material, index, siteMaterials, onChange, onRemove }) {
  const selectedMat = siteMaterials.find(m => m.material_name === material.material_name)
  const remaining = selectedMat ? parseFloat(selectedMat.quantity || 0) : null
  const isLow = remaining !== null && remaining > 0 && remaining < 5
  const isOut = remaining !== null && remaining <= 0

  return (
    <div style={{
      background: '#1e1e1e', borderRadius: '8px',
      padding: '12px', marginBottom: '8px', border: '1px solid #2a2a2a'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: '#888', fontSize: '12px' }}>Material {index + 1}</span>
        <button onClick={onRemove}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px' }}>×</button>
      </div>

      <select
        value={material.material_name || ''}
        onChange={e => {
          const sel = siteMaterials.find(m => m.material_name === e.target.value)
          const patch = { material_name: e.target.value }
          if (sel) patch.unit = sel.unit || 'Nos'
          onChange(patch)
        }}
        style={{
          width: '100%', background: '#111', color: '#fff',
          border: '1px solid #FF8C00', borderRadius: '8px',
          padding: '10px', marginBottom: '8px', fontSize: '14px'
        }}
      >
        <option value="">Select material</option>
        {siteMaterials.map(m => (
          <option key={m.id} value={m.material_name}>
            {m.material_name} — {m.quantity} {m.unit}
            {m.quantity <= 0 ? ' ❌ Out' : m.quantity < 5 ? ' ⚠️ Low' : ' ✅'}
          </option>
        ))}
      </select>

      {isOut && (
        <div style={{
          background: '#2a0a0a', border: '1px solid #c53030',
          borderRadius: '6px', padding: '8px', color: '#fc8181',
          fontSize: '12px', marginBottom: '8px'
        }}>
          Out of stock
        </div>
      )}
      {isLow && !isOut && (
        <div style={{
          background: '#2a1a0a', border: '1px solid #d97706',
          borderRadius: '6px', padding: '8px', color: '#fbbf24',
          fontSize: '12px', marginBottom: '8px'
        }}>
          ⚠️ Low stock — {remaining !== null ? remaining.toFixed ? remaining.toFixed(1) : remaining : '?'} remaining
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="number"
          placeholder="Est. qty"
          value={material.estimated_qty}
          onChange={e => onChange({ estimated_qty: e.target.value })}
          style={{
            flex: 2, background: '#111', color: '#fff',
            border: '1px solid #333', borderRadius: '8px',
            padding: '10px', fontSize: '14px'
          }}
        />
        <select
          value={material.unit}
          onChange={e => onChange({ unit: e.target.value })}
          style={{
            flex: 1, background: '#111', color: '#fff',
            border: '1px solid #333', borderRadius: '8px',
            padding: '10px', fontSize: '14px'
          }}
        >
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── ProcessPlanCard ──────────────────────────────────────────────────────────
function ProcessPlanCard({ group, index, siteLabours, activeProcesses, onUpdate, onRemove }) {
  const process = activeProcesses.find(p => p.id === group.process_id) || null
  const availableFlats = process?.flats || []
  const availableSteps = process?.steps || []

  const stepMaterials = useMemo(() => {
    if (!group.step_id || !process) return []
    const step = process.steps?.find(s => s.id === group.step_id)
    return step?.materials?.map(m => ({
      site_material_id: m.site_material_id,
      material_name: m.siteMaterial?.full_name || '',
      unit: m.siteMaterial?.unit || '',
      estimated_qty: ''
    })) || []
  }, [group.step_id, process])

  useEffect(() => {
    if (group.step_id && stepMaterials.length > 0 &&
        (!group.materials || group.materials.length === 0)) {
      onUpdate(group.id, { materials: stepMaterials })
    }
  }, [group.step_id])

  const selectedLabourIds = group.labour_ids || []

  return (
    <div style={{
      background: '#111', borderRadius: '12px',
      border: '1px solid #222', marginBottom: '16px', overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '14px 16px', background: '#1a1a1a'
      }}>
        <span style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '15px' }}>
          Task {index + 1}
        </span>
        <button onClick={() => onRemove(group.id)}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>×</button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Process selector */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Process</label>
          <select
            value={group.process_id || ''}
            onChange={e => onUpdate(group.id, {
              process_id: e.target.value,
              flat_id: '', flat_no: '', bhk_type: '',
              step_id: '', step_name: '', materials: []
            })}
            style={{ width: '100%', background: '#111', color: '#fff',
              border: '1px solid #FF8C00', borderRadius: '8px',
              padding: '12px', fontSize: '14px' }}>
            <option value="">Select process</option>
            {activeProcesses.map(p => (
              <option key={p.id} value={p.id}>{p.title} ({p.work_type})</option>
            ))}
          </select>
        </div>

        {/* Flat selector */}
        {group.process_id && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Flat / Area</label>
            <select
              value={group.flat_id || ''}
              onChange={e => {
                const flat = availableFlats.find(f => f.id === e.target.value)
                onUpdate(group.id, {
                  flat_id: e.target.value,
                  flat_no: flat?.flat_no || '',
                  bhk_type: flat?.bhk_type || ''
                })
              }}
              style={{ width: '100%', background: '#111', color: '#fff',
                border: '1px solid #333', borderRadius: '8px',
                padding: '12px', fontSize: '14px' }}>
              <option value="">Select flat</option>
              {availableFlats.map(flat => (
                <option key={flat.id} value={flat.id}>
                  {flat.flat_no}{flat.bhk_type ? ` — ${flat.bhk_type}` : ''}{flat.area?.area_name ? ` (${flat.area.area_name})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step selector */}
        {group.flat_id && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Task / Step</label>
            <select
              value={group.step_id || ''}
              onChange={e => {
                const step = availableSteps.find(s => s.id === e.target.value)
                onUpdate(group.id, {
                  step_id: e.target.value,
                  step_name: step?.step_name || '',
                  coat_count: step?.coat_count || 1,
                  materials: []
                })
              }}
              style={{ width: '100%', background: '#111', color: '#fff',
                border: '1px solid #333', borderRadius: '8px',
                padding: '12px', fontSize: '14px' }}>
              <option value="">Select step</option>
              {availableSteps.map(step => (
                <option key={step.id} value={step.id}>
                  {step.step_name}{step.coat_count > 1 ? ` (${step.coat_count} coats)` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Labour multi-select */}
        {group.step_id && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
              Assign Labour ({selectedLabourIds.length} selected)
            </label>
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #333', borderRadius: '8px' }}>
              {siteLabours.length === 0
                ? <div style={{ padding: '12px', color: '#666', fontSize: '13px', textAlign: 'center' }}>No labourers found</div>
                : siteLabours.map(labour => {
                    const selected = selectedLabourIds.includes(labour.id)
                    return (
                      <div key={labour.id}
                        onClick={() => {
                          const updated = selected
                            ? selectedLabourIds.filter(id => id !== labour.id)
                            : [...selectedLabourIds, labour.id]
                          onUpdate(group.id, {
                            labour_ids: updated,
                            labour_names: siteLabours.filter(l => updated.includes(l.id)).map(l => l.name)
                          })
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '10px 12px', borderBottom: '1px solid #1e1e1e',
                          cursor: 'pointer', background: selected ? '#1a1200' : 'transparent'
                        }}>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                          background: selected ? '#FF8C00' : 'none',
                          border: selected ? '2px solid #FF8C00' : '2px solid #444',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {selected && <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                        </div>
                        <span style={{ color: selected ? '#fff' : '#aaa', fontSize: '14px' }}>{labour.name}</span>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        )}

        {/* Materials — auto-filled from process step */}
        {group.step_id && (
          <div>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Materials</label>
            {(group.materials || []).length === 0 && (
              <div style={{ color: '#555', fontSize: '13px', padding: '8px', textAlign: 'center' }}>
                No materials linked to this step
              </div>
            )}
            {(group.materials || []).map((mat, idx) => (
              <div key={idx} style={{
                background: '#1e1e1e', borderRadius: '8px',
                padding: '10px', marginBottom: '8px', border: '1px solid #2a2a2a'
              }}>
                <div style={{ color: '#ccc', fontSize: '13px', marginBottom: '8px', fontWeight: '500' }}>
                  {mat.material_name}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    placeholder="Est. qty"
                    value={mat.estimated_qty || ''}
                    onChange={e => {
                      const updated = [...(group.materials || [])]
                      updated[idx] = { ...updated[idx], estimated_qty: e.target.value }
                      onUpdate(group.id, { materials: updated })
                    }}
                    style={{ flex: 2, background: '#111', color: '#fff',
                      border: '1px solid #333', borderRadius: '8px', padding: '8px', fontSize: '14px' }}
                  />
                  <span style={{ flex: 1, color: '#888', fontSize: '13px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {mat.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── GroupCard ────────────────────────────────────────────────────────────────
function GroupCard({
  group, index, siteLabours, workOrderSteps,
  flatProgress, siteMaterials,
  onUpdate, onRemove, isCarryForward
}) {
  const [showFlatPopup, setShowFlatPopup] = useState(null)

  const stepsForFlats = useMemo(() => {
    if (!group.work_order_step_id) return []
    const result = []
    flatProgress.forEach(wo => {
      ;(wo.flats || []).forEach(flat => {
        const stepStatus = flat.step_progress?.[group.work_order_step_id] || 'pending'
        result.push({
          id: flat.id,
          flat_no: flat.flat_no,
          wing: flat.wing,
          stepStatus,
          allSteps: (wo.steps || []).map(s => ({
            step_name: s.step_name,
            status: flat.step_progress?.[s.id] || 'pending',
          })),
        })
      })
    })
    return result
  }, [group.work_order_step_id, flatProgress])

  const stepMaterials = useMemo(() => {
    if (!group.work_order_step_id) return siteMaterials
    const filtered = siteMaterials.filter(m => m.step_id === group.work_order_step_id)
    return filtered.length > 0 ? filtered : siteMaterials
  }, [group.work_order_step_id, siteMaterials])

  function toggleFlat(flatNumber, stepStatus) {
    if (stepStatus === 'done') return
    const current = group.flat_nos || []
    const updated = current.includes(flatNumber)
      ? current.filter(f => f !== flatNumber)
      : [...current, flatNumber]
    onUpdate(group.id, { flat_nos: updated })
  }

  function addMaterial() {
    const mats = group.materials || []
    onUpdate(group.id, {
      materials: [...mats, { id: Date.now().toString(), material_name: '', estimated_qty: '', unit: 'Nos' }]
    })
  }

  function updateMaterial(matId, patch) {
    const mats = (group.materials || []).map(m => m.id === matId ? { ...m, ...patch } : m)
    onUpdate(group.id, { materials: mats })
  }

  function removeMaterial(matId) {
    onUpdate(group.id, { materials: (group.materials || []).filter(m => m.id !== matId) })
  }

  const selectedLabourIds = group.labour_ids || []

  return (
    <div style={{
      background: '#111', borderRadius: '12px',
      border: isCarryForward ? '1px solid #FF8C00' : '1px solid #222',
      marginBottom: '16px', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '14px 16px', background: '#1a1a1a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '15px' }}>Group {index + 1}</span>
          {isCarryForward && (
            <span style={{
              background: '#FF8C0022', color: '#FF8C00', fontSize: '11px',
              padding: '2px 8px', borderRadius: '20px', border: '1px solid #FF8C00'
            }}>Carried Forward</span>
          )}
        </div>
        {!isCarryForward && (
          <button onClick={() => onRemove(group.id)}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>×</button>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {/* Labour multi-select */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
            Labour ({selectedLabourIds.length} selected)
          </label>
          <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #333', borderRadius: '8px' }}>
            {siteLabours.length === 0
              ? <div style={{ padding: '12px', color: '#666', fontSize: '13px', textAlign: 'center' }}>
                  No labourers found for this site
                </div>
              : siteLabours.map(labour => {
                  const selected = selectedLabourIds.includes(labour.id)
                  return (
                    <div
                      key={labour.id}
                      onClick={() => {
                        const updated = selected
                          ? selectedLabourIds.filter(id => id !== labour.id)
                          : [...selectedLabourIds, labour.id]
                        onUpdate(group.id, {
                          labour_ids: updated,
                          labour_names: siteLabours.filter(l => updated.includes(l.id)).map(l => l.name)
                        })
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 12px', borderBottom: '1px solid #1e1e1e',
                        cursor: 'pointer', background: selected ? '#1a1200' : 'transparent'
                      }}
                    >
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                        background: selected ? '#FF8C00' : 'none',
                        border: selected ? '2px solid #FF8C00' : '2px solid #444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {selected && <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                      </div>
                      {labour.photo
                        ? <img src={labour.photo} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        : <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: '#333', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: '#888', fontSize: '12px'
                          }}>{labour.name?.charAt(0)}</div>
                      }
                      <span style={{ color: selected ? '#fff' : '#aaa', fontSize: '14px' }}>{labour.name}</span>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* Task/Step selector */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Task / Step</label>
          <select
            value={group.work_order_step_id || ''}
            onChange={e => {
              const sel = workOrderSteps.find(s => s.id === e.target.value)
              onUpdate(group.id, {
                work_order_step_id: e.target.value,
                step_name: sel?.step_name || '',
                flat_nos: []
              })
            }}
            style={{
              width: '100%', background: '#111', color: '#fff',
              border: '1px solid #FF8C00', borderRadius: '8px',
              padding: '12px', fontSize: '14px'
            }}
          >
            <option value="">Select step</option>
            {workOrderSteps.map(step => (
              <option key={step.id} value={step.id}>
                {step.work_order_title} — {step.step_name}
              </option>
            ))}
          </select>
        </div>

        {/* Flat grid — only show when step selected and flats exist */}
        {group.work_order_step_id && stepsForFlats.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
              Select Flats (tap ℹ️ to see full progress)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
              {stepsForFlats.map(flat => {
                const isDone = flat.stepStatus === 'done'
                const flatLabel = flat.wing ? `${flat.wing}-${flat.flat_no}` : String(flat.flat_no)
                const isSelected = (group.flat_nos || []).includes(flatLabel)
                return (
                  <div key={flat.id} style={{ position: 'relative' }}>
                    <div
                      onClick={() => !isDone && toggleFlat(flatLabel, flat.stepStatus)}
                      style={{
                        borderRadius: '8px', padding: '10px 6px', textAlign: 'center',
                        cursor: isDone ? 'not-allowed' : 'pointer',
                        background: isDone ? '#0a2a0a' : isSelected ? '#2a1a00' : '#1a1a1a',
                        border: isDone ? '1px solid #166534' : isSelected ? '1px solid #FF8C00' : '1px solid #333',
                        opacity: isDone ? 0.7 : 1
                      }}
                    >
                      <div style={{
                        fontSize: '13px', fontWeight: 'bold',
                        color: isDone ? '#22c55e' : isSelected ? '#FF8C00' : '#ccc',
                        marginBottom: '2px'
                      }}>{flatLabel}</div>
                      <div style={{ fontSize: '10px', color: isDone ? '#22c55e' : '#666' }}>
                        {isDone ? '✓ Done' : '⬜ Pending'}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setShowFlatPopup(flat) }}
                      style={{
                        position: 'absolute', top: '-6px', right: '-6px',
                        width: '18px', height: '18px', background: '#333',
                        border: 'none', borderRadius: '50%', color: '#888',
                        fontSize: '10px', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: 0
                      }}
                    >ℹ</button>
                  </div>
                )
              })}
            </div>
            {group.flat_nos?.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#FF8C00' }}>
                {group.flat_nos.length} flat(s) selected for today
              </div>
            )}
          </div>
        )}

        {/* No flats found — free-text input */}
        {group.work_order_step_id && stepsForFlats.length === 0 && (
          <div style={{ marginBottom: '14px' }}>
            <input
              placeholder="Enter flat/area description"
              value={group.flat_description || ''}
              onChange={e => onUpdate(group.id, { flat_description: e.target.value })}
              style={{
                width: '100%', background: '#111', color: '#fff',
                border: '1px solid #333', borderRadius: '8px',
                padding: '12px', fontSize: '14px', boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {/* Materials section */}
        <div>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>Materials</label>
          {(group.materials || []).map((mat, idx) => (
            <MaterialRow
              key={mat.id}
              material={mat}
              index={idx}
              siteMaterials={stepMaterials}
              onChange={patch => updateMaterial(mat.id, patch)}
              onRemove={() => removeMaterial(mat.id)}
            />
          ))}
          <button
            onClick={addMaterial}
            style={{
              width: '100%', background: 'none', border: '1px dashed #444',
              color: '#888', borderRadius: '8px', padding: '10px',
              fontSize: '13px', cursor: 'pointer'
            }}
          >
            + Add Material
          </button>
        </div>
      </div>

      {showFlatPopup && (
        <FlatStatusPopup
          flat={showFlatPopup}
          onClose={() => setShowFlatPopup(null)}
        />
      )}
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
function CheckoutItemCard({ item, onUpdate }) {
  const PERCENTAGES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

  return (
    <div style={{
      background: '#111', borderRadius: '12px',
      border: '1px solid #222', marginBottom: '14px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px', background: '#1a1a1a',
        borderBottom: '1px solid #222'
      }}>
        <div style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '14px' }}>
          {item.flat_no || item.flat_nos?.[0] || 'Flat'}
          {item.bhk_type && (
            <span style={{ color: '#888', fontWeight: 'normal', fontSize: '12px', marginLeft: '6px' }}>
              {item.bhk_type}
            </span>
          )}
        </div>
        <div style={{ color: '#ccc', fontSize: '13px', marginTop: '2px' }}>
          {item.step_name || 'Task'}
        </div>
        {(item.labour_names?.length > 0 || item.labour_ids?.length > 0) && (
          <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>
            👷 {item.labour_names?.join(', ') || `${item.labour_ids?.length} labourers`}
          </div>
        )}
      </div>

      <div style={{ padding: '14px' }}>
        {/* Done percentage selector */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
            Work Completed
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '6px' }}>
            {PERCENTAGES.map(pct => (
              <button
                key={pct}
                onClick={() => onUpdate(item.id, {
                  done_percentage: pct,
                  status: pct === 100 ? 'done' : 'in_progress'
                })}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: item.done_percentage === pct ? '2px solid #FF8C00' : '1px solid #333',
                  background: item.done_percentage === pct
                    ? pct === 100 ? '#14532d' : '#1a1200'
                    : '#1a1a1a',
                  color: item.done_percentage === pct
                    ? pct === 100 ? '#22c55e' : '#FF8C00'
                    : '#666',
                  fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                }}>
                {pct === 100 ? 'DONE' : `${pct}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Materials used */}
        {(item.materials?.length > 0) && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ color: '#888', fontSize: '12px', display: 'block', marginBottom: '8px' }}>
              Materials Used
            </label>
            {item.materials.map((mat, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '8px'
              }}>
                <span style={{ flex: 2, color: '#ccc', fontSize: '13px' }}>
                  {mat.material_name}
                </span>
                <input
                  type="number"
                  placeholder="Qty used"
                  value={mat.actual_qty || ''}
                  onChange={e => {
                    const updated = [...item.materials]
                    updated[idx] = { ...updated[idx], actual_qty: e.target.value }
                    onUpdate(item.id, { materials: updated })
                  }}
                  style={{
                    flex: 1, background: '#111', color: '#fff',
                    border: '1px solid #333', borderRadius: '8px',
                    padding: '8px', fontSize: '14px'
                  }}
                />
                <span style={{ color: '#888', fontSize: '12px', minWidth: '30px' }}>
                  {mat.unit}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Carry forward option */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
          <button
            onClick={() => onUpdate(item.id, {
              status: item.status === 'carry_forward' ? 'in_progress' : 'carry_forward',
              done_percentage: item.status === 'carry_forward' ? item.done_percentage : 0
            })}
            style={{
              padding: '6px 12px', borderRadius: '8px', fontSize: '12px',
              border: item.status === 'carry_forward' ? '1px solid #f97316' : '1px solid #333',
              background: item.status === 'carry_forward' ? '#431407' : '#1a1a1a',
              color: item.status === 'carry_forward' ? '#f97316' : '#666',
              cursor: 'pointer'
            }}>
            ↩ Carry Forward
          </button>
          <span style={{ color: '#555', fontSize: '12px' }}>
            {item.status === 'carry_forward' ? "Will appear in tomorrow's plan" : 'Mark if not completing today'}
          </span>
        </div>

        {/* Notes */}
        <input
          placeholder="Notes (optional)"
          value={item.checkout_notes || ''}
          onChange={e => onUpdate(item.id, { checkout_notes: e.target.value })}
          style={{
            width: '100%', background: '#111', color: '#fff',
            border: '1px solid #222', borderRadius: '8px',
            padding: '8px', fontSize: '13px',
            marginTop: '8px', boxSizing: 'border-box'
          }}
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
  const [view, setView] = useState('site_select')
  const [selectedSite, setSelectedSite] = useState(null)
  const [supervisorSites, setSupervisorSites] = useState([])
  const [siteId, setSiteId] = useState('')
  const [todayPlan, setTodayPlan] = useState(null)
  const [planHistory, setPlanHistory] = useState([])
  const [carryForwardItems, setCarryForwardItems] = useState([])
  const [groups, setGroups] = useState([])
  const [planDate, setPlanDate] = useState(TODAY)
  const [planNotes, setPlanNotes] = useState('')
  const [workOrderSteps, setWorkOrderSteps] = useState([])
  const [siteMaterials, setSiteMaterials] = useState([])
  const [siteLabours, setSiteLabours] = useState([])
  const [flatProgress, setFlatProgress] = useState([])
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

  // Process Master planning state
  const [activeProcesses, setActiveProcesses] = useState([])

  async function fetchInitialData(siteId) {
    if (!siteId) return
    const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
    const headers = { Authorization: `Bearer ${token}` }
    try {
      const [laboursRes, flatRes, materialsRes, historyRes, cfRes, planRes] = await Promise.all([
        api.get(`/workorders/site-labours?site_id=${siteId}`, { headers }),
        api.get(`/workorders/flat-progress?site_id=${siteId}`, { headers }),
        api.get(`/godown/site-stock?site_id=${siteId}`, { headers }),
        api.get(`/daily-plans/history?site_id=${siteId}`, { headers }),
        api.get(`/daily-plans/carry-forward?site_id=${siteId}`, { headers }),
        api.get(`/daily-plans?site_id=${siteId}&date=${TODAY}`, { headers }),
      ])
      setSiteLabours(laboursRes.data || [])
      const wos = flatRes.data?.work_orders || []
      const allSteps = []
      wos.forEach(wo => {
        ;(wo.steps || []).forEach(s => {
          allSteps.push({
            id: s.id,
            step_name: s.step_name,
            sequence_order: s.sequence_order,
            status: s.status,
            work_order_id: wo.id,
            work_order_title: wo.title,
          })
        })
      })
      setWorkOrderSteps(allSteps)
      setFlatProgress(wos)
      setSiteMaterials(materialsRes.data || [])
      setPlanHistory(historyRes.data || [])
      setCarryForwardItems(cfRes.data || [])
      const d = planRes.data
      setTodayPlan(d?.exists ? d.plan : null)
      // Fetch active processes for this site
      try {
        const procRes = await api.get(`/process-master/for-planning?site_id=${siteId}`)
        setActiveProcesses(procRes.data || [])
      } catch (err) {
        console.error('Process fetch error:', err.message)
      }
    } catch {
      toast.error('Failed to load plan data')
    }
    setLoading(false)
  }

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        const sites = res.data?.sites || []
        setSupervisorSites(sites)
        if (sites.length === 1) {
          const s = sites[0]
          setSelectedSite(s)
          setSiteId(s.id)
          setView('list')
          fetchInitialData(s.id)
        } else if (sites.length > 1) {
          setLoading(false)
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
        group_name: g.labour_names?.join(', ') || g.group_name || '',
        labour_ids: g.labour_ids || [],
        work_order_step_id: g.work_order_step_id || null,
        process_id: g.process_id || null,
        process_step_id: g.step_id || null,
        step_name: g.step_name || '',
        flat_nos: g.flat_id ? [g.flat_no] : (g.flat_nos || []),
        flat_description: g.flat_description || '',
        materials: g.materials || [],
        material_name: g.materials?.[0]?.material_name || g.material_name || '',
        estimated_qty: g.materials?.[0]?.estimated_qty
          ? parseFloat(g.materials[0].estimated_qty)
          : g.estimated_qty ? parseFloat(g.estimated_qty) : null,
        unit: g.materials?.[0]?.unit || g.unit || '',
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
          { site_id: selectedSite?.id || siteId, date: planDate, notes: planNotes, items },
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
      fetchInitialData(selectedSite?.id)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save plan')
    } finally {
      setSaving(false)
    }
  }

  async function loadLaboursForAttendance() {
    try {
      const res = await api.get(`/labour?site_id=${selectedSite?.id || siteId}&is_active=true`)
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
      fetchInitialData(selectedSite?.id)
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

  function initializeCheckoutItems() {
    if (!todayPlan?.items) return
    const items = todayPlan.items.map(item => ({
      ...item,
      flat_no: item.flat_nos?.[0] || item.flat_no || '',
      done_percentage: 0,
      status: 'pending',
      materials: (item.materials || []).map(m => ({ ...m, actual_qty: '' }))
    }))
    setCheckoutItems(items)
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

      for (const item of checkoutItems) {
        await api.patch(
          `/daily-plans/items/${item.id}/checkout`,
          {
            actual_qty: item.materials?.[0] ? parseFloat(item.materials[0].actual_qty || 0) : 0,
            status: item.status === 'carry_forward'
              ? 'carry_forward'
              : item.done_percentage >= 100 ? 'done' : 'partial',
            done_percentage: item.done_percentage || 0,
            partial_flat_nos: item.done_percentage < 100 ? item.flat_nos || [] : [],
            checkout_notes: item.checkout_notes || '',
            date_worked: todayPlan.date,
            process_step_id: item.process_step_id,
            process_id: item.process_id,
            labour_ids: item.labour_ids || [],
            materials: item.materials?.map(m => ({
              material_name: m.material_name,
              quantity_used: parseFloat(m.actual_qty || 0),
              unit: m.unit
            })) || []
          },
          { headers }
        )
      }

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
      fetchInitialData(selectedSite?.id)
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

  if (view === 'site_select') {
    return (
      <div className="page-content space-y-4">
        <div className="card">
          <h1 className="text-lg font-bold text-white">Select Site</h1>
          <p className="text-sm text-gray-400 mt-1">Choose which site to plan for today</p>
        </div>
        {supervisorSites.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-gray-400 text-sm">No sites assigned to your account</p>
            <p className="text-gray-500 text-xs mt-1">Contact admin to assign sites</p>
          </div>
        ) : (
          supervisorSites.map(site => (
            <button
              key={site.id}
              onClick={() => {
                setSelectedSite(site)
                setSiteId(site.id)
                setView('list')
                fetchInitialData(site.id)
              }}
              className="w-full card flex items-center justify-between active:scale-95 transition-all border border-transparent active:border-primary-500/40"
              style={{ textAlign: 'left' }}
            >
              <div>
                <p className="text-white font-bold text-base">{site.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">Tap to open plans</p>
              </div>
              <span style={{ color: '#FF8C00', fontSize: '20px' }}>→</span>
            </button>
          ))
        )}
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-primary-400" />
                {selectedSite ? `Plans — ${selectedSite.name}` : 'Daily Plans'}
              </h1>
              <p className="text-xs text-gray-400 mt-1">Plan your site's tasks for the day</p>
            </div>
            {supervisorSites.length > 1 && (
              <button
                onClick={() => setView('site_select')}
                className="text-primary-400 text-xs border border-primary-500/30 px-2 py-1 rounded-lg active:scale-95 transition-all"
              >
                ← Change Site
              </button>
            )}
          </div>
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
                if (checkoutItems.every(i => !i.done_percentage || i.done_percentage === 0)) {
                  toast.error('Mark completion percentage for at least one task')
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
            <h1 className="text-base font-bold text-white">Plan for {selectedSite?.name || ''} — {fmtDate(planDate)}</h1>
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
        <ProcessPlanCard
          key={group.id}
          group={group}
          index={index}
          siteLabours={siteLabours}
          activeProcesses={activeProcesses}
          onUpdate={updateGroup}
          onRemove={removeGroup}
        />
      ))}

      {activeProcesses.length === 0 ? (
        <div style={{
          background: '#1a0a00', border: '1px solid #7c2d12',
          borderRadius: '10px', padding: '16px', textAlign: 'center',
          color: '#fb923c', fontSize: '14px'
        }}>
          No active processes found for this site.
          Ask admin to create and activate a Process Master first.
        </div>
      ) : (
        <button
          className="w-full py-3 rounded-xl border border-primary-500/40 text-primary-400 text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-primary-500/10"
          onClick={() => setGroups(prev => [...prev, {
            id: Date.now().toString(),
            process_id: activeProcesses[0]?.id || '',
            flat_id: '', flat_no: '', bhk_type: '',
            step_id: '', step_name: '', coat_count: 1,
            labour_ids: [], labour_names: [],
            materials: [],
            isCarryForward: false,
          }])}
        >
          <Plus size={16} />
          Add Task
        </button>
      )}

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
