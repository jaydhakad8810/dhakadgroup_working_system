import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Upload, Check, X, ChevronRight, Users, MapPin,
  Calendar, Plus, Trash2, CheckCircle, Clock,
  ArrowRight, ArrowLeft, RefreshCw, FileText,
  Layers, Package, Tag, Copy, AlertCircle, ClipboardCheck
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import useDraftSave from '../../hooks/useDraftSave'

// ─── StepBar ────────────────────────────────────────────────────────────────
function StepBar({ current }) {
  const steps = [
    { n: 1, label: 'Site' },
    { n: 2, label: 'Attend' },
    { n: 3, label: 'Check-In' },
    { n: 4, label: 'Groups' },
    { n: 5, label: 'Tasks' },
    { n: 6, label: 'Material' },
    { n: 7, label: 'Checkout' },
    { n: 8, label: 'Complete' },
    { n: 9, label: 'Report' },
  ]
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface-300 border-b border-white/10">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                current === s.n
                  ? 'bg-primary-500 text-white'
                  : current > s.n
                  ? 'bg-green-500 text-white'
                  : 'bg-surface-400 text-gray-500'
              }`}
            >
              {current > s.n ? <Check size={14} /> : s.n}
            </div>
            <span className={`text-[10px] mt-1 ${current >= s.n ? 'text-primary-400' : 'text-gray-600'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-1 mt-[-12px] ${current > s.n ? 'bg-green-500' : 'bg-surface-400'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── LabourPhotoBtn ──────────────────────────────────────────────────────────
// Compact per-labour photo capture button used in Steps 3 & 4
function LabourPhotoBtn({ labourId, photoUrl, uploading, onCapture }) {
  const cameraRef = useRef(null)
  const fileRef = useRef(null)

  if (uploading) {
    return (
      <span className="text-xs text-gray-400 px-2">Uploading…</span>
    )
  }

  if (photoUrl) {
    return (
      <div className="flex items-center gap-1.5">
        <img src={photoUrl} alt="captured" className="w-10 h-10 object-cover rounded-lg border border-white/10" />
        <button
          type="button"
          onClick={() => onCapture(labourId, null)}
          className="text-red-400 hover:text-red-300 p-1"
        >
          <X size={12} />
        </button>
        <CheckCircle size={16} className="text-green-400 shrink-0" />
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="p-2 rounded-lg bg-surface-400 hover:bg-surface-300 text-gray-400 hover:text-primary-400 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
        title="Camera"
      >
        <Camera size={16} />
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="p-2 rounded-lg bg-surface-400 hover:bg-surface-300 text-gray-400 hover:text-primary-400 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
        title="Upload"
      >
        <Upload size={16} />
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files[0] && onCapture(labourId, e.target.files[0])}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files[0] && onCapture(labourId, e.target.files[0])}
      />
    </div>
  )
}

// ─── useLabourTimer ──────────────────────────────────────────────────────────
// Returns { hoursWorked, label } for a given check_in_time, updating each minute
function useLabourTimers(attendanceRecords) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  // Build a map: labour_id → { checkInTime, hoursWorked }
  const map = {}
  attendanceRecords.forEach((r) => {
    if (r.status === 'present' || r.status === 'half_day') {
      const checkIn = r.check_in_time || r.createdAt
      if (checkIn) {
        const hw = (now - new Date(checkIn).getTime()) / (1000 * 60 * 60)
        map[r.labour_id] = { checkInTime: checkIn, hoursWorked: hw }
      }
    }
  })
  return map
}

// ─── MultiplierBadge ─────────────────────────────────────────────────────────
function MultiplierBadge({ hoursWorked, checkInTime }) {
  if (hoursWorked == null || !checkInTime) return null
  const totalMins = Math.round(hoursWorked * 60)
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  const checkInStr = new Date(checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  let multiplier, badgeClass, label
  if (hoursWorked >= 14) {
    multiplier = '2×'; label = '2× day'; badgeClass = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
  } else if (hoursWorked >= 10) {
    multiplier = '1.5×'; label = '1.5× day'; badgeClass = 'bg-orange-500/20 text-orange-300 border-orange-500/40'
  } else {
    multiplier = '1×'; label = '1× day'; badgeClass = 'bg-green-500/20 text-green-300 border-green-500/40'
  }
  return (
    <div className="flex flex-col gap-0.5 mt-1">
      <span className="text-xs text-gray-500">Check-in: {checkInStr}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={10} className="text-gray-500" />
          Working: {hrs}h {mins}m
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${badgeClass}`}>{label}</span>
      </div>
    </div>
  )
}

// ─── GroupsStep ──────────────────────────────────────────────────────────────
function GroupsStep({ presentLabours, editingGroups, setEditingGroups, attendanceDate, selectedSite, onNext }) {
  const [newGroupName, setNewGroupName] = useState('')
  const [saving, setSaving] = useState(false)

  const addGroup = () => {
    if (!newGroupName.trim()) return
    const tempGroup = {
      id: 'temp_' + Date.now(),
      name: newGroupName.trim(),
      colour: ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'][editingGroups.length % 5],
      members: [],
      isNew: true,
    }
    setEditingGroups(prev => [...prev, tempGroup])
    setNewGroupName('')
  }

  const toggleMemberInGroup = (groupId, labour) => {
    setEditingGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const exists = g.members.find(m => m.labour_id === (labour._id || labour.id))
      if (exists) {
        return { ...g, members: g.members.filter(m => m.labour_id !== (labour._id || labour.id)) }
      }
      return { ...g, members: [...g.members, { labour_id: labour._id || labour.id, labour, is_present: true, date: attendanceDate }] }
    }))
  }

  const removeGroup = (groupId) => {
    setEditingGroups(prev => prev.filter(g => g.id !== groupId))
  }

  const saveGroups = async () => {
    setSaving(true)
    try {
      const saved = []
      for (const g of editingGroups) {
        let groupId = g.id
        if (g.isNew || String(g.id).startsWith('temp_')) {
          const res = await api.post('/labour-groups', { site_id: selectedSite, name: g.name, colour: g.colour })
          groupId = res.data?.id || res.data?.data?.id
        }
        await api.post(`/labour-groups/${groupId}/members`, {
          members: g.members.map(m => ({
            labour_id: m.labour_id,
            date: attendanceDate,
            is_present: m.is_present !== false,
          })),
        })
        saved.push({ ...g, id: groupId })
      }
      toast.success('Groups saved')
      onNext(saved)
    } catch {
      toast.error('Failed to save groups')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Layers size={16} className="text-primary-400" />
          Labour Groups
        </h2>
        <p className="text-xs text-gray-400 mb-3">Create groups and assign labour. One worker can be in multiple groups.</p>
        <div className="flex gap-2">
          <input
            className="input text-white flex-1"
            placeholder="Group name (e.g. Group A - Internal)"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
          />
          <button className="btn-primary px-3 min-h-[44px]" onClick={addGroup}>
            <Plus size={16} />
          </button>
        </div>
      </div>

      {editingGroups.length === 0 && (
        <div className="card text-center text-gray-500 text-sm py-4">
          No groups yet. Add a group above or continue without groups.
        </div>
      )}

      {editingGroups.map((group) => (
        <div key={group.id} className="card" style={{ borderLeft: `3px solid ${group.colour || '#F97316'}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-sm">{group.name}</span>
            <button onClick={() => removeGroup(group.id)} className="text-red-400 p-1">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">Tap to add/remove labour from this group:</p>
          <div className="flex flex-wrap gap-2">
            {presentLabours.map(l => {
              const lid = l._id || l.id
              const inGroup = group.members.find(m => m.labour_id === lid)
              return (
                <button
                  key={lid}
                  onClick={() => toggleMemberInGroup(group.id, l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all min-h-[36px] ${
                    inGroup ? 'text-white border-2' : 'bg-surface-400 text-gray-400 border border-white/10'
                  }`}
                  style={inGroup ? { borderColor: group.colour, background: group.colour + '33' } : {}}
                >
                  {l.name || l.labour_name}
                </button>
              )
            })}
          </div>
          {group.members.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">{group.members.length} member(s) assigned</p>
          )}
        </div>
      ))}

      <button
        className="btn-primary w-full min-h-[44px] flex items-center justify-center gap-2"
        onClick={saveGroups}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Groups & Continue'}
        <ChevronRight size={18} />
      </button>
      <button className="btn-secondary w-full min-h-[44px]" onClick={() => onNext(editingGroups)}>
        Skip Groups
      </button>
    </div>
  )
}

// ─── TaskAssignStep ───────────────────────────────────────────────────────────
function TaskAssignStep({ groups, groupTasks, setGroupTasks, presentLabours, workOrders, carryForwardHints, loadingWorkOrders, onNext }) {
  const [individualTasks, setIndividualTasks] = useState({})
  const ungroupedLabour = presentLabours.filter(l => {
    const lid = l._id || l.id
    return !groups.some(g => g.members?.some(m => m.labour_id === lid))
  })

  const setGroupTask = (groupId, field, value) => {
    setGroupTasks(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || {}), [field]: value } }))
  }

  // Get already assigned step_ids from other groups to prevent overlap
  const assignedStepIds = new Set(
    Object.entries(groupTasks)
      .filter(([gId]) => gId !== 'undefined')
      .map(([, t]) => t.step_id)
      .filter(Boolean)
  )

  const allSteps = workOrders.flatMap(wo =>
    (wo.steps || [])
      .filter(s => s.status !== 'completed') // hide completed steps
      .map(s => ({ ...s, work_order_id: wo.id, work_order_title: wo.title }))
  )

  const getFlatsForWO = (woId, stepId) => {
    const wo = workOrders.find(w => w.id === woId)
    const flats = wo?.flats || []
    if (!stepId) return flats
    // Hide flats where this specific step is already done
    return flats.filter(f => {
      const progress = f.step_progress || {}
      return progress[stepId] !== 'done'
    })
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <ClipboardCheck size={16} className="text-primary-400" />
          Assign Tasks
        </h2>
        {carryForwardHints.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-2 mb-3">
            <p className="text-xs text-orange-400 font-medium flex items-center gap-1">
              <AlertCircle size={12} /> Yesterday's pending tasks:
            </p>
            {carryForwardHints.map((h, i) => (
              <p key={i} className="text-xs text-gray-400 ml-4">• {h.task_note || h.step_name}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400">Assign work order tasks to each group for today.</p>
      </div>

      {loadingWorkOrders && (
        <div className="card text-center text-gray-500 text-sm py-4">Loading work orders...</div>
      )}

      {workOrders.length === 0 && !loadingWorkOrders && (
        <div className="card text-center text-gray-500 text-sm py-4">
          No work orders found. You can skip task assignment.
        </div>
      )}

      {groups.map(group => (
        <div key={group.id} className="card" style={{ borderLeft: `3px solid ${group.colour || '#F97316'}` }}>
          <p className="text-sm font-semibold text-white mb-2">{group.name}</p>
          <p className="text-xs text-gray-500 mb-2">{group.members?.length || 0} member(s)</p>

          <label className="label">Work Order Step</label>
          <select
            className="select text-white mb-2"
            value={groupTasks[group.id]?.step_id || ''}
            onChange={e => {
              const s = allSteps.find(st => st.id === e.target.value)
              setGroupTask(group.id, 'step_id', e.target.value)
              setGroupTask(group.id, 'work_order_id', s?.work_order_id || '')
              setGroupTask(group.id, 'step_name', s?.step_name || '')
            }}
          >
            <option value="">-- Select Task --</option>
            {allSteps.map(s => (
              <option key={s.id} value={s.id}>[{s.work_order_title}] {s.step_name}</option>
            ))}
          </select>

          {groupTasks[group.id]?.work_order_id && (
            <>
              <label className="label">Flats being worked today (select multiple)</label>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {getFlatsForWO(groupTasks[group.id].work_order_id, groupTasks[group.id].step_id).map(flat => {
                  const selected = (groupTasks[group.id]?.flat_nos || []).includes(flat.flat_no)
                  return (
                    <button
                      key={flat.id}
                      onClick={() => {
                        const current = groupTasks[group.id]?.flat_nos || []
                        const updated = selected
                          ? current.filter(f => f !== flat.flat_no)
                          : [...current, flat.flat_no]
                        setGroupTask(group.id, 'flat_nos', updated)
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium min-h-[32px] transition-all ${
                        selected
                          ? 'bg-primary-500/30 text-primary-400 border border-primary-500/50'
                          : 'bg-surface-400 text-gray-500 border border-white/5'
                      }`}
                    >
                      {flat.flat_no}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      ))}

      {ungroupedLabour.length > 0 && (
        <div className="card">
          <p className="text-sm font-semibold text-white mb-2">Individual Labour (not in any group)</p>
          {ungroupedLabour.map(l => {
            const lid = l._id || l.id
            return (
              <div key={lid} className="mb-3">
                <p className="text-xs text-gray-400 mb-1">{l.name || l.labour_name}</p>
                <select
                  className="select text-white"
                  value={individualTasks[lid]?.step_id || ''}
                  onChange={e => {
                    const s = allSteps.find(st => st.id === e.target.value)
                    setIndividualTasks(prev => ({ ...prev, [lid]: { step_id: e.target.value, step_name: s?.step_name || '' } }))
                  }}
                >
                  <option value="">-- Select Task --</option>
                  {allSteps.map(s => (
                    <option key={s.id} value={s.id}>[{s.work_order_title}] {s.step_name}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}

      <button
        className="btn-primary w-full min-h-[44px] flex items-center justify-center gap-2"
        onClick={() => onNext(individualTasks)}
      >
        Save Tasks & Continue
        <ChevronRight size={18} />
      </button>
      <button className="btn-secondary w-full min-h-[44px]" onClick={() => onNext({})}>
        Skip Task Assignment
      </button>
    </div>
  )
}

// ─── MaterialAssignStep ───────────────────────────────────────────────────────
function MaterialAssignStep({ groups, groupMaterials, setGroupMaterials, siteWorkOrderMaterials, presentLabours, onNext }) {
  const ungroupedLabour = presentLabours.filter(l => {
    const lid = l._id || l.id
    return !groups.some(g => g.members?.some(m => m.labour_id === lid))
  })

  const addMaterialToGroup = (groupId) => {
    setGroupMaterials(prev => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), { work_order_material_id: '', name: '', quantity: '', unit: 'KG' }],
    }))
  }

  const updateGroupMaterial = (groupId, index, field, value) => {
    setGroupMaterials(prev => {
      const updated = [...(prev[groupId] || [])]
      updated[index] = { ...updated[index], [field]: value }
      if (field === 'work_order_material_id' && value) {
        const wom = siteWorkOrderMaterials.find(m => m.id === value)
        if (wom) { updated[index].name = wom.product_name; updated[index].unit = wom.unit }
      }
      return { ...prev, [groupId]: updated }
    })
  }

  const removeMaterialFromGroup = (groupId, index) => {
    setGroupMaterials(prev => ({
      ...prev,
      [groupId]: (prev[groupId] || []).filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Package size={16} className="text-primary-400" />
          Assign Materials
        </h2>
        <p className="text-xs text-gray-400">Assign materials to each group for today's work.</p>
      </div>

      {groups.map(group => (
        <div key={group.id} className="card" style={{ borderLeft: `3px solid ${group.colour || '#F97316'}` }}>
          <p className="text-sm font-semibold text-white mb-2">{group.name}</p>

          {(groupMaterials[group.id] || []).map((mat, idx) => (
            <div key={idx} className="bg-surface-400 rounded-xl p-2 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Material {idx + 1}</p>
                <button onClick={() => removeMaterialFromGroup(group.id, idx)} className="text-red-400 p-1">
                  <X size={12} />
                </button>
              </div>

              {siteWorkOrderMaterials.length > 0 && (
                <>
                  <label className="label">From Work Order (optional)</label>
                  <select
                    className="select text-white"
                    value={mat.work_order_material_id || ''}
                    onChange={e => updateGroupMaterial(group.id, idx, 'work_order_material_id', e.target.value)}
                  >
                    <option value="">-- Select WO Material --</option>
                    {siteWorkOrderMaterials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.product_name} ({m.unit}) — Remaining: {(m.total_quantity - m.used_quantity).toFixed(1)}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <label className="label">Material Name</label>
              <input
                className="input text-white"
                placeholder="e.g. AP Sparc Primer"
                value={mat.name}
                onChange={e => updateGroupMaterial(group.id, idx, 'name', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Quantity</label>
                  <input
                    className="input text-white"
                    type="number"
                    placeholder="0"
                    value={mat.quantity}
                    onChange={e => updateGroupMaterial(group.id, idx, 'quantity', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select
                    className="select text-white"
                    value={mat.unit}
                    onChange={e => updateGroupMaterial(group.id, idx, 'unit', e.target.value)}
                  >
                    {['LTR', 'KG', 'Nos', 'Unit'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            className="btn-secondary w-full text-sm min-h-[40px] flex items-center justify-center gap-1"
            onClick={() => addMaterialToGroup(group.id)}
          >
            <Plus size={14} /> Add Material to {group.name}
          </button>
        </div>
      ))}

      {ungroupedLabour.length > 0 && (
        <div className="card">
          <p className="text-sm text-gray-400">Ungrouped labour will use materials from general attendance entry.</p>
        </div>
      )}

      <button
        className="btn-primary w-full min-h-[44px] flex items-center justify-center gap-2"
        onClick={() => onNext()}
      >
        Save Materials & Continue
        <ChevronRight size={18} />
      </button>
      <button className="btn-secondary w-full min-h-[44px]" onClick={() => onNext()}>
        Skip Material Assignment
      </button>
    </div>
  )
}

// ─── TaskCompleteStep ─────────────────────────────────────────────────────────
function TaskCompleteStep({ groups, groupTasks, attendanceRecords, attendanceDate, onNext }) {
  const [completions, setCompletions] = useState({})
  const [saving, setSaving] = useState(false)

  const setCompletion = (groupId, field, value) => {
    setCompletions(prev => ({ ...prev, [groupId]: { ...(prev[groupId] || {}), [field]: value } }))
  }

  const saveCompletions = async () => {
    setSaving(true)
    try {
      for (const group of groups) {
        const task = groupTasks[group.id]
        const comp = completions[group.id]
        if (!task?.step_id) continue
        const memberIds = (group.members || []).map(m => m.labour_id)
        const groupRecords = attendanceRecords.filter(r => memberIds.includes(r.labour_id))
        for (const record of groupRecords) {
          await api.patch(`/attendance/${record._id || record.id}/task-complete`, {
            task_completed: comp?.completed === true,
            flat_nos: task.flat_nos || [],
            carry_forward: comp?.completed === false,
            work_order_step_id: task.step_id,
          })
        }
      }
      toast.success('Task completion saved')
      onNext()
    } catch {
      toast.error('Failed to save task completion')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="card">
        <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <CheckCircle size={16} className="text-primary-400" />
          Task Completion
        </h2>
        <p className="text-xs text-gray-400">Mark which tasks were completed today. Incomplete tasks carry forward to tomorrow.</p>
      </div>

      {groups.filter(g => groupTasks[g.id]?.step_id).map(group => {
        const task = groupTasks[group.id]
        const comp = completions[group.id] || {}
        return (
          <div key={group.id} className="card" style={{ borderLeft: `3px solid ${group.colour || '#F97316'}` }}>
            <p className="text-sm font-semibold text-white mb-1">{group.name}</p>
            <p className="text-xs text-gray-400 mb-1">Task: {task.step_name}</p>
            {task.flat_nos?.length > 0 && (
              <p className="text-xs text-gray-500 mb-3">Flats: {task.flat_nos.join(', ')}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setCompletion(group.id, 'completed', true)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-all ${
                  comp.completed === true ? 'bg-green-500 text-white' : 'border border-green-500/40 text-green-400'
                }`}
              >
                ✅ Completed
              </button>
              <button
                onClick={() => setCompletion(group.id, 'completed', false)}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-all ${
                  comp.completed === false ? 'bg-orange-500 text-white' : 'border border-orange-500/40 text-orange-400'
                }`}
              >
                🕐 Carry Forward
              </button>
            </div>
          </div>
        )
      })}

      {groups.filter(g => groupTasks[g.id]?.step_id).length === 0 && (
        <div className="card text-center text-gray-500 text-sm py-4">
          No tasks were assigned. Continue to report.
        </div>
      )}

      <button
        className="btn-primary w-full min-h-[44px] flex items-center justify-center gap-2"
        onClick={saveCompletions}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save & Continue'}
        <ChevronRight size={18} />
      </button>
    </div>
  )
}



// ─── MarkAttendance ──────────────────────────────────────────────────────────
export default function MarkAttendance() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const today = new Date().toISOString().split('T')[0]

  const [tab, setTab] = useState('today')
  const [planContext, setPlanContext] = useState(null)

  useEffect(() => {
    const ctx = sessionStorage.getItem('daily_plan_context')
    if (ctx) {
      try { setPlanContext(JSON.parse(ctx)) } catch {}
    }
  }, [])

  // Site management
  const [supervisorSites, setSupervisorSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(null)

  // Today tab
  const [todayPlan, setTodayPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(true)

  // History tab
  const [attHistory, setAttHistory] = useState([])
  const [attLoading, setAttLoading] = useState(false)
  const [attLoaded, setAttLoaded] = useState(false)
  const [expandedRecord, setExpandedRecord] = useState(null)
  const [siteLabours, setSiteLabours] = useState([])
  const [attFilter, setAttFilter] = useState({
    from_date: (() => { const d = new Date(); d.setDate(d.getDate() - 60); return d.toISOString().split('T')[0] })(),
    to_date: new Date().toISOString().split('T')[0],
    labour_id: '',
  })

  useEffect(() => {
    api.get('/auth/me').then(res => {
      const sites = res.data?.sites || []
      setSupervisorSites(sites)
      if (sites.length >= 1) {
        const s = sites[0]
        setSelectedSite(s)
        loadTodayPlan(s.id)
        loadSiteLabours(s.id)
      } else {
        setPlanLoading(false)
      }
    }).catch(() => setPlanLoading(false))
  }, [])

  async function loadTodayPlan(sid) {
    setPlanLoading(true)
    try {
      const res = await api.get(`/daily-plans?site_id=${sid}&date=${today}`)
      setTodayPlan(res.data?.exists ? res.data.plan : null)
    } catch {}
    setPlanLoading(false)
  }

  async function loadSiteLabours(sid) {
    try {
      const res = await api.get(`/workorders/site-labours?site_id=${sid}`)
      setSiteLabours(res.data || [])
    } catch {}
  }

  async function fetchHistory(filter, sid) {
    const siteId = sid || selectedSite?.id
    if (!siteId) return
    setAttLoading(true)
    try {
      const params = new URLSearchParams({
        site_id: siteId,
        from_date: filter.from_date,
        to_date: filter.to_date,
      })
      if (filter.labour_id) params.append('labour_id', filter.labour_id)
      const res = await api.get(`/attendance?${params}`)
      setAttHistory(res.data || [])
      setAttLoaded(true)
    } catch {}
    setAttLoading(false)
  }

  function onTabChange(t) {
    setTab(t)
    if (t === 'history' && !attLoaded && selectedSite) {
      fetchHistory(attFilter, selectedSite.id)
    }
  }

  function applyFilter() {
    fetchHistory(attFilter)
  }

  function onSiteChange(site) {
    setSelectedSite(site)
    loadTodayPlan(site.id)
    loadSiteLabours(site.id)
    setAttLoaded(false)
    setAttHistory([])
    if (tab === 'history') fetchHistory(attFilter, site.id)
  }

  const planItems = todayPlan?.items || []
  const doneCount = planItems.filter(i => i.status === 'done').length
  const pendingCount = planItems.filter(i => i.status === 'pending' || !i.status).length

  return (
    <div className="page-container space-y-4">
      {/* Site selector for multi-site supervisors */}
      {supervisorSites.length > 1 && (
        <div className="card">
          <label className="label">Site</label>
          <select
            className="select text-white"
            value={selectedSite?.id || ''}
            onChange={e => {
              const s = supervisorSites.find(x => x.id === e.target.value)
              if (s) onSiteChange(s)
            }}
          >
            {supervisorSites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-surface-300 rounded-xl p-1">
        <button
          onClick={() => onTabChange('today')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'today' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}
        >
          Today
        </button>
        <button
          onClick={() => onTabChange('history')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'history' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}
        >
          History
        </button>
      </div>

      {/* TODAY TAB */}
      {tab === 'today' && (
        <div className="space-y-4">
          {/* Plan context banner — shown when navigated from Reports → Plan */}
          {planContext && planContext.date === today && (
            <div style={{ background: '#1a1200', border: '1px solid #FF8C00', borderRadius: '12px', padding: '14px' }}>
              <div style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '14px', marginBottom: '10px' }}>
                📋 Today's Task Plan — {planContext.site_name}
              </div>
              {planContext.tasks.map((task, i) => (
                <div key={i} style={{ background: '#111', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: '500' }}>
                    Flat {task.flat_no} ({task.bhk_type}) — {task.step_name}
                  </div>
                  {task.materials.length > 0 && (
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                      Materials: {task.materials.map(m => `${m.material_name} (${m.actual_qty || m.qty_per_flat} ${m.unit})`).join(', ')}
                    </div>
                  )}
                  {task.labour_ids.length > 0 && (
                    <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>
                      {task.labour_ids.length} labour(s) assigned
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => { sessionStorage.removeItem('daily_plan_context'); setPlanContext(null) }}
                style={{ background: 'none', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', marginTop: '4px' }}>
                Clear plan context
              </button>
            </div>
          )}

          {planLoading ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Loading today's plan...</p>
            </div>
          ) : todayPlan ? (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white font-semibold">Today's Plan</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${todayPlan.status === 'submitted' ? 'bg-blue-500/20 text-blue-400' : todayPlan.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {todayPlan.status}
                  </span>
                </div>
                {selectedSite && <p className="text-xs text-primary-400/70 mb-3">{selectedSite.name}</p>}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-surface-300 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-white">{planItems.length}</p>
                    <p className="text-xs text-gray-500">Total Tasks</p>
                  </div>
                  <div className="bg-surface-300 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-green-400">{doneCount}</p>
                    <p className="text-xs text-gray-500">Done</p>
                  </div>
                  <div className="bg-surface-300 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-yellow-400">{pendingCount}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/plan')}
                  className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  Continue Plan
                  <ArrowRight size={16} />
                </button>
              </div>
              {planItems.length > 0 && (
                <div className="card">
                  <p className="text-gray-400 text-xs mb-3 uppercase tracking-wide">Task Summary</p>
                  <div className="space-y-2">
                    {planItems.slice(0, 6).map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{item.step_name || item.group_name || 'Task'}</p>
                          {item.flat_nos?.length > 0 && (
                            <p className="text-gray-500 text-xs">{item.flat_nos.slice(0,3).join(', ')}{item.flat_nos.length > 3 ? ` +${item.flat_nos.length-3} more` : ''}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${item.status === 'done' ? 'bg-green-500/20 text-green-400' : item.status === 'carry_forward' ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {item.status || 'pending'}
                        </span>
                      </div>
                    ))}
                    {planItems.length > 6 && (
                      <p className="text-gray-500 text-xs text-center pt-1">+{planItems.length - 6} more tasks</p>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-8 space-y-4">
              <ClipboardCheck size={40} className="text-gray-600 mx-auto" />
              <div>
                <p className="text-white font-semibold mb-1">No plan for today</p>
                <p className="text-gray-500 text-sm">Create a daily plan first to manage attendance</p>
              </div>
              <button
                onClick={() => navigate('/plan')}
                className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                Create Today's Plan
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Filter</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="label">From</label>
                <input type="date" className="input" value={attFilter.from_date}
                  onChange={e => setAttFilter(f => ({ ...f, from_date: e.target.value }))} />
              </div>
              <div className="flex-1">
                <label className="label">To</label>
                <input type="date" className="input" value={attFilter.to_date}
                  onChange={e => setAttFilter(f => ({ ...f, to_date: e.target.value }))} />
              </div>
            </div>
            {siteLabours.length > 0 && (
              <div>
                <label className="label">Labour</label>
                <select className="select text-white" value={attFilter.labour_id}
                  onChange={e => setAttFilter(f => ({ ...f, labour_id: e.target.value }))}>
                  <option value="">All Labourers</option>
                  {siteLabours.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={applyFilter}
              className="w-full py-2.5 rounded-xl bg-primary-500/20 text-primary-400 text-sm font-medium border border-primary-500/30 active:scale-95 transition-all"
            >
              Apply Filter
            </button>
          </div>

          {attLoading ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Loading history...</p>
            </div>
          ) : !attLoaded ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">Apply filter to load records</p>
            </div>
          ) : attHistory.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 text-sm">No attendance records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attHistory.map(record => {
                const records = record.records || []
                const filtered = attFilter.labour_id
                  ? records.filter(r => String(r.labour_id) === String(attFilter.labour_id))
                  : records
                const isExpanded = expandedRecord === record.id
                const presentCount = filtered.filter(r => r.status === 'present').length
                const halfCount = filtered.filter(r => r.status === 'half_day').length
                const absentCount = filtered.filter(r => r.status === 'absent').length
                const planItems = record.plan_items || []
                return (
                  <div key={record.id} className="card cursor-pointer"
                    onClick={() => setExpandedRecord(isExpanded ? null : record.id)}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-semibold text-sm">{record.date}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{filtered.length} workers</span>
                        <ChevronRight size={14} className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      {presentCount > 0 && <span className="text-xs text-green-400">{presentCount} Present</span>}
                      {halfCount > 0 && <span className="text-xs text-yellow-400">{halfCount} Half</span>}
                      {absentCount > 0 && <span className="text-xs text-red-400">{absentCount} Absent</span>}
                    </div>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                        {filtered.map(r => (
                          <div key={r.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {r.photo
                                  ? <img src={r.photo} className="w-8 h-8 rounded-full object-cover" alt="" />
                                  : <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold">
                                      {(r.labour_name || r.name || '?')[0]}
                                    </div>
                                }
                                <p className="text-gray-300 text-sm font-medium">{r.labour_name || r.name || '—'}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'present' ? 'bg-green-500/20 text-green-400' : r.status === 'half_day' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                {r.status}
                              </span>
                            </div>
                            {(r.checkin_photo || r.checkout_photo) && (
                              <div className="flex gap-2 ml-10">
                                {r.checkin_photo && (
                                  <a href={r.checkin_photo} target="_blank" rel="noreferrer">
                                    <img src={r.checkin_photo} className="w-10 h-10 rounded-lg object-cover border border-green-500/30" alt="check-in" />
                                  </a>
                                )}
                                {r.checkout_photo && (
                                  <a href={r.checkout_photo} target="_blank" rel="noreferrer">
                                    <img src={r.checkout_photo} className="w-10 h-10 rounded-lg object-cover border border-blue-500/30" alt="check-out" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {planItems.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/5">
                            <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">Tasks</p>
                            {planItems.map(item => (
                              <div key={item.id} className="flex items-center justify-between py-1.5">
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-300 text-xs truncate">{item.step_name || item.group_name}</p>
                                  {item.flat_nos?.length > 0 && (
                                    <p className="text-gray-600 text-xs">{item.flat_nos.slice(0,4).join(', ')}</p>
                                  )}
                                  {item.material_name && (
                                    <p className="text-gray-600 text-xs">{item.material_name} {item.actual_qty ? `— ${item.actual_qty} ${item.unit}` : ''}</p>
                                  )}
                                </div>
                                <span className={`text-xs ml-2 shrink-0 ${item.status === 'done' ? 'text-green-400' : item.status === 'carry_forward' ? 'text-orange-400' : 'text-gray-500'}`}>
                                  {item.status === 'done' ? '✓' : item.status === 'carry_forward' ? '→' : '○'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
