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
// ─── ExtraMaterialAdderCheckout ─────────────────────────────────────────────
function ExtraMaterialAdderCheckout({ siteId, token, onAdd }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
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

  // Check-in flow state
  const [attendStep, setAttendStep] = useState('today') // 'today' | 'mark' | 'photos'
  const [attendance, setAttendance] = useState({})
  const [checkInPhotos, setCheckInPhotos] = useState({})
  const [uploadingPhoto, setUploadingPhoto] = useState({})
  const [submittingAttendance, setSubmittingAttendance] = useState(false)
  const [laboursLoading, setLaboursLoading] = useState(false)
  const [groups, setGroups] = useState([])
  const [groupTasks, setGroupTasks] = useState({})
  const [checkoutItems, setCheckoutItems] = useState([])
  const [checkoutPhotos, setCheckoutPhotos] = useState({})
  const [uploadingCheckoutPhoto, setUploadingCheckoutPhoto] = useState({})
  const [submittingCheckout, setSubmittingCheckout] = useState(false)

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

  async function fetchSiteLabours(siteId) {
    setLaboursLoading(true)
    try {
      const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
      const res = await api.get(
        `/workorders/site-labours?site_id=${siteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const labours = res.data || []
      setSiteLabours(labours)
      const init = {}
      labours.forEach(l => { init[l.id] = 'present' })
      setAttendance(init)
    } catch { toast.error('Failed to load labourers') }
    setLaboursLoading(false)
  }

  async function uploadCheckInPhoto(labourId, file) {
    setUploadingPhoto(prev => ({ ...prev, [labourId]: true }))
    try {
      const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/upload/single', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      })
      setCheckInPhotos(prev => ({ ...prev, [labourId]: res.data.url }))
    } catch { toast.error('Photo upload failed') }
    setUploadingPhoto(prev => ({ ...prev, [labourId]: false }))
  }

  async function submitCheckIn() {
    setSubmittingAttendance(true)
    try {
      const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
      const presentLabours = siteLabours.filter(l => attendance[l.id] !== 'absent')
      const siteId = typeof selectedSite === 'object' ? selectedSite?.id : selectedSite
      await api.post('/attendance/bulk', {
        site_id: siteId,
        date: today,
        records: presentLabours.map(l => ({
          labour_id: l.id,
          status: attendance[l.id] || 'present',
          check_in_photo: checkInPhotos[l.id] || null
        }))
      }, { headers: { Authorization: `Bearer ${token}` } })
      toast.success('Attendance submitted successfully!')
      setCheckInPhotos({})
      setGroups([])
      setGroupTasks({})
      setAttendStep('today')
      loadTodayPlan(siteId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit')
    }
    setSubmittingAttendance(false)
  }

  async function submitCheckout() {
    setSubmittingCheckout(true)
    try {
      const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
      const headers = { Authorization: `Bearer ${token}` }

      for (const item of checkoutItems) {
        if (!item.id) continue
        await api.patch(`/daily-plans/items/${item.id}/checkout`, {
          done_percentage: item.done_percentage || 0,
          status: item.done_percentage >= 100 ? 'done' : item.done_percentage > 0 ? 'in_progress' : 'pending',
          actual_qty: parseFloat(item.materials?.[0]?.actual_qty_used || 0),
          materials: (item.materials || []).map(m => ({
            material_name: m.material_name,
            quantity_used: parseFloat(m.actual_qty_used || 0),
            unit: m.unit
          })),
          checkout_notes: '',
          date_worked: today,
          process_step_id: item.process_step_id,
          process_id: item.process_id,
          labour_ids: siteLabours.filter(l => attendance[l.id] !== 'absent').map(l => l.id)
        }, { headers })
      }

      toast.success('Day completed! Great work. 🎉')
      setCheckoutItems([])
      setCheckoutPhotos({})
      setAttendStep('today')
      const siteId = typeof selectedSite === 'object' ? selectedSite?.id : selectedSite
      loadTodayPlan(siteId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed')
    }
    setSubmittingCheckout(false)
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
      {tab === 'today' && attendStep === 'today' && (
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
                {todayPlan.status === 'submitted' && (
                  <button
                    onClick={() => {
                      const siteId = typeof selectedSite === 'object' ? selectedSite?.id : selectedSite
                      fetchSiteLabours(siteId)
                      setAttendStep('mark')
                    }}
                    className="w-full py-3 rounded-xl bg-primary-500 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    Mark Attendance →
                  </button>
                )}
                {todayPlan.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      const items = (todayPlan.items || []).map(item => ({
                        ...item,
                        done_percentage: 0,
                        status: 'pending',
                        materials: (item.materials || []).map(m => ({ ...m, actual_qty_used: '' }))
                      }))
                      setCheckoutItems(items)
                      setAttendStep('checkout_tasks')
                    }}
                    className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    ✓ Start Checkout
                  </button>
                )}
                {todayPlan.status === 'completed' && (
                  <div className="text-center py-3 text-green-400 font-semibold text-sm">
                    ✓ Day Completed
                  </div>
                )}
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

      {/* STEP: Mark Present/Absent */}
      {tab === 'today' && attendStep === 'mark' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button onClick={() => setAttendStep('today')}
              style={{ background: 'none', border: 'none', color: '#FF8C00', cursor: 'pointer', fontSize: '24px' }}>
              ←
            </button>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>Mark Attendance</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Step 1 of 2 — Mark present/absent</div>
            </div>
          </div>

          <button
            onClick={() => {
              const all = {}
              siteLabours.forEach(l => { all[l.id] = 'present' })
              setAttendance(all)
            }}
            style={{ width: '100%', background: '#14532d', border: 'none', borderRadius: '10px', padding: '12px', color: '#22c55e', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', marginBottom: '12px' }}>
            ✓ All Present
          </button>

          {laboursLoading ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Loading labourers...</div>
          ) : siteLabours.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontSize: '14px' }}>No labourers found for this site</div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              {siteLabours.map(labour => (
                <div key={labour.id} style={{ background: '#111', borderRadius: '12px', padding: '14px', marginBottom: '10px', border: '1px solid #222' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {labour.photo ? (
                        <img src={labour.photo} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontWeight: 'bold' }}>
                          {labour.name?.[0] || '?'}
                        </div>
                      )}
                      <span style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{labour.name}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['present', 'half_day', 'absent'].map(status => (
                      <button key={status}
                        onClick={() => setAttendance(prev => ({ ...prev, [labour.id]: status }))}
                        style={{
                          flex: 1, padding: '8px 4px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none',
                          background: attendance[labour.id] === status ? (status === 'present' ? '#14532d' : status === 'half_day' ? '#78350f' : '#7f1d1d') : '#1e1e1e',
                          color: attendance[labour.id] === status ? (status === 'present' ? '#22c55e' : status === 'half_day' ? '#fbbf24' : '#f87171') : '#555'
                        }}>
                        {status === 'present' ? 'Present' : status === 'half_day' ? 'Half Day' : 'Absent'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', padding: '12px', background: '#1a1a1a', borderRadius: '10px' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '20px' }}>{siteLabours.filter(l => attendance[l.id] === 'present').length}</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Present</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '20px' }}>{siteLabours.filter(l => attendance[l.id] === 'half_day').length}</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Half Day</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: '20px' }}>{siteLabours.filter(l => attendance[l.id] === 'absent').length}</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Absent</div>
            </div>
          </div>

          <button
            onClick={() => setAttendStep('groups')}
            disabled={siteLabours.filter(l => attendance[l.id] !== 'absent').length === 0}
            style={{ width: '100%', background: '#FF8C00', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', opacity: siteLabours.filter(l => attendance[l.id] !== 'absent').length === 0 ? 0.5 : 1 }}>
            Next → Create Groups
          </button>
        </div>
      )}

      {/* STEP: Create Groups */}
      {tab === 'today' && attendStep === 'groups' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button onClick={() => setAttendStep('mark')}
              style={{ background: 'none', border: 'none', color: '#FF8C00', cursor: 'pointer', fontSize: '24px' }}>
              ←
            </button>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>Create Labour Groups</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Step 2 of 3 — Group your team & assign tasks</div>
            </div>
          </div>

          <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px', marginBottom: '16px', border: '1px solid #222' }}>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>PRESENT TODAY</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {siteLabours.filter(l => attendance[l.id] !== 'absent').map(l => (
                <span key={l.id} style={{ background: '#14532d', color: '#22c55e', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{l.name}</span>
              ))}
            </div>
          </div>

          {groups.map((group, gIdx) => (
            <div key={group.id} style={{ background: '#111', borderRadius: '12px', border: '1px solid #222', marginBottom: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', background: '#1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <input
                  value={group.name}
                  onChange={e => {
                    const updated = [...groups]
                    updated[gIdx].name = e.target.value
                    setGroups(updated)
                  }}
                  placeholder="Group name (e.g. Group A)"
                  style={{ background: 'none', border: 'none', color: '#FF8C00', fontWeight: 'bold', fontSize: '15px', flex: 1, outline: 'none' }}
                />
                <button onClick={() => setGroups(groups.filter((_, i) => i !== gIdx))}
                  style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>
                  ×
                </button>
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>ASSIGN LABOURERS</div>
                  <div style={{ border: '1px solid #222', borderRadius: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                    {siteLabours.filter(l => attendance[l.id] !== 'absent').map(l => {
                      const selected = (group.members || []).some(m => m.labour_id === l.id)
                      return (
                        <div key={l.id}
                          onClick={() => {
                            const updated = [...groups]
                            const members = updated[gIdx].members || []
                            if (selected) {
                              updated[gIdx].members = members.filter(m => m.labour_id !== l.id)
                            } else {
                              updated[gIdx].members = [...members, { labour_id: l.id, name: l.name }]
                            }
                            setGroups(updated)
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1e1e1e', background: selected ? '#1a1200' : 'transparent' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: selected ? '#FF8C00' : 'none', border: selected ? '2px solid #FF8C00' : '2px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {selected && <span style={{ color: '#000', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
                          </div>
                          <span style={{ color: selected ? '#fff' : '#aaa', fontSize: '13px' }}>{l.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>ASSIGN TASKS (from today's plan)</div>
                  {(todayPlan?.items || []).length === 0 ? (
                    <div style={{ color: '#555', fontSize: '12px', fontStyle: 'italic' }}>No tasks in today's plan</div>
                  ) : (
                    <div style={{ border: '1px solid #222', borderRadius: '8px' }}>
                      {(todayPlan?.items || []).map(item => {
                        const assigned = (groupTasks[group.id] || []).includes(item.id)
                        return (
                          <div key={item.id}
                            onClick={() => {
                              const current = groupTasks[group.id] || []
                              setGroupTasks(prev => ({
                                ...prev,
                                [group.id]: assigned ? current.filter(id => id !== item.id) : [...current, item.id]
                              }))
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #1e1e1e', background: assigned ? '#0a1a0a' : 'transparent' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: assigned ? '#22c55e' : 'none', border: assigned ? '2px solid #22c55e' : '2px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {assigned && <span style={{ color: '#000', fontSize: '11px', fontWeight: 'bold' }}>✓</span>}
                            </div>
                            <div>
                              <div style={{ color: assigned ? '#22c55e' : '#ccc', fontSize: '13px' }}>{item.step_name || item.group_name}</div>
                              <div style={{ color: '#666', fontSize: '11px' }}>{(item.flat_nos || []).join(', ')}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => setGroups(prev => [...prev, { id: 'g_' + Date.now(), name: `Group ${prev.length + 1}`, members: [], isNew: true }])}
            style={{ width: '100%', background: 'none', border: '1px dashed #444', borderRadius: '10px', padding: '12px', color: '#888', fontSize: '14px', cursor: 'pointer', marginBottom: '16px' }}>
            + Add Group
          </button>

          <button
            onClick={() => setAttendStep('photos')}
            style={{ width: '100%', background: '#FF8C00', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
            Next → Check-in Photos
          </button>
        </div>
      )}

      {/* STEP: Check-in Photos */}
      {tab === 'today' && attendStep === 'photos' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button onClick={() => setAttendStep('groups')}
              style={{ background: 'none', border: 'none', color: '#FF8C00', cursor: 'pointer', fontSize: '24px' }}>
              ←
            </button>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>Check-in Photos</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Step 3 of 3 — Take photos for present labourers</div>
            </div>
          </div>

          {(() => {
            const present = siteLabours.filter(l => attendance[l.id] !== 'absent')
            const taken = present.filter(l => checkInPhotos[l.id]).length
            return (
              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#888', fontSize: '13px' }}>Photos taken</span>
                  <span style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '13px' }}>{taken} / {present.length}</span>
                </div>
                <div style={{ background: '#333', borderRadius: '4px', height: '6px' }}>
                  <div style={{ background: '#FF8C00', borderRadius: '4px', height: '6px', width: present.length > 0 ? `${(taken / present.length) * 100}%` : '0%', transition: 'width 0.3s' }} />
                </div>
              </div>
            )
          })()}

          {siteLabours.filter(l => attendance[l.id] !== 'absent').map(labour => (
            <div key={labour.id} style={{ background: '#111', borderRadius: '12px', padding: '14px', marginBottom: '10px', border: checkInPhotos[labour.id] ? '1px solid #22c55e' : '1px solid #7f1d1d' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {labour.photo ? (
                    <img src={labour.photo} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontWeight: 'bold', fontSize: '16px' }}>
                      {labour.name?.[0]}
                    </div>
                  )}
                  <div>
                    <div style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>{labour.name}</div>
                    <div style={{ color: '#888', fontSize: '12px' }}>{attendance[labour.id] === 'half_day' ? 'Half Day' : 'Present'}</div>
                  </div>
                </div>
                {checkInPhotos[labour.id] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={checkInPhotos[labour.id]} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} />
                    <span style={{ color: '#22c55e', fontSize: '20px' }}>✓</span>
                  </div>
                ) : uploadingPhoto[labour.id] ? (
                  <span style={{ color: '#FF8C00', fontSize: '13px' }}>Uploading...</span>
                ) : (
                  <label style={{ background: '#FF8C00', border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#000', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>
                    📷 Photo
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                      onChange={e => { const file = e.target.files?.[0]; if (file) uploadCheckInPhoto(labour.id, file) }} />
                  </label>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={submitCheckIn}
            disabled={submittingAttendance || siteLabours.filter(l => attendance[l.id] !== 'absent').some(l => !checkInPhotos[l.id])}
            style={{ width: '100%', background: '#22c55e', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '8px', opacity: (submittingAttendance || siteLabours.filter(l => attendance[l.id] !== 'absent').some(l => !checkInPhotos[l.id])) ? 0.5 : 1 }}>
            {submittingAttendance ? 'Submitting...' : '✓ Submit Attendance'}
          </button>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginTop: '8px' }}>All present labourers must have a photo</p>
        </div>
      )}

      {/* CHECKOUT STEP 1: Task Completion */}
      {tab === 'today' && attendStep === 'checkout_tasks' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button onClick={() => setAttendStep('today')}
              style={{ background: 'none', border: 'none', color: '#FF8C00', cursor: 'pointer', fontSize: '24px' }}>
              ←
            </button>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>Task Completion</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Checkout Step 1 of 3</div>
            </div>
          </div>

          {checkoutItems.map((item, idx) => {
            const PCTS = [10, 30, 50, 70, 90, 100]
            return (
              <div key={item.id} style={{ background: '#111', borderRadius: '12px', border: '1px solid #222', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', background: '#1a1a1a', borderBottom: '1px solid #222' }}>
                  <div style={{ color: '#FF8C00', fontWeight: 'bold', fontSize: '14px' }}>{item.flat_nos?.[0] || item.flat_no || 'Task'}</div>
                  <div style={{ color: '#ccc', fontSize: '13px', marginTop: '2px' }}>{item.step_name || item.group_name}</div>
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>COMPLETION</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '6px' }}>
                    {PCTS.map(pct => (
                      <button key={pct}
                        onClick={() => {
                          const updated = [...checkoutItems]
                          updated[idx].done_percentage = pct
                          updated[idx].status = pct === 100 ? 'done' : 'in_progress'
                          setCheckoutItems(updated)
                        }}
                        style={{
                          padding: '8px 4px', borderRadius: '8px',
                          border: item.done_percentage === pct ? '2px solid #FF8C00' : '1px solid #333',
                          background: item.done_percentage === pct ? (pct === 100 ? '#14532d' : '#1a1200') : '#1a1a1a',
                          color: item.done_percentage === pct ? (pct === 100 ? '#22c55e' : '#FF8C00') : '#666',
                          fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                        }}>
                        {pct === 100 ? 'Done ✓' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => setAttendStep('checkout_materials')}
            disabled={checkoutItems.every(i => !i.done_percentage)}
            style={{ width: '100%', background: '#FF8C00', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', opacity: checkoutItems.every(i => !i.done_percentage) ? 0.5 : 1 }}>
            Next → Materials Used
          </button>
        </div>
      )}

      {/* CHECKOUT STEP 2: Materials Used */}
      {tab === 'today' && attendStep === 'checkout_materials' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button onClick={() => setAttendStep('checkout_tasks')}
              style={{ background: 'none', border: 'none', color: '#FF8C00', cursor: 'pointer', fontSize: '24px' }}>
              ←
            </button>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>Materials Used</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Checkout Step 2 of 3</div>
            </div>
          </div>

          {checkoutItems.map((item, idx) => (
            <div key={item.id} style={{ background: '#111', borderRadius: '12px', border: '1px solid #222', marginBottom: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#1a1a1a', borderBottom: '1px solid #222' }}>
                <div style={{ color: '#FF8C00', fontSize: '13px', fontWeight: 'bold' }}>{item.flat_nos?.[0] || item.flat_no} — {item.step_name}</div>
                <div style={{ color: item.done_percentage >= 100 ? '#22c55e' : '#f97316', fontSize: '12px' }}>
                  {item.done_percentage >= 100 ? 'Done ✓' : `${item.done_percentage}% complete`}
                </div>
              </div>
              <div style={{ padding: '12px' }}>
                {(item.materials || []).length === 0 ? (
                  <div style={{ color: '#555', fontSize: '12px', fontStyle: 'italic' }}>No materials for this task</div>
                ) : (
                  (item.materials || []).map((mat, mIdx) => (
                    <div key={mIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ flex: 2, color: '#ccc', fontSize: '13px' }}>{mat.material_name}</span>
                      <input type="number"
                        placeholder="Used qty"
                        value={mat.actual_qty_used || ''}
                        onChange={e => {
                          const updated = [...checkoutItems]
                          updated[idx].materials[mIdx].actual_qty_used = e.target.value
                          setCheckoutItems(updated)
                        }}
                        style={{ width: '70px', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      />
                      <span style={{ color: '#888', fontSize: '12px', minWidth: '30px' }}>{mat.unit}</span>
                    </div>
                  ))
                )}
                <ExtraMaterialAdderCheckout
                  siteId={typeof selectedSite === 'object' ? selectedSite?.id : selectedSite}
                  token={sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')}
                  onAdd={mat => {
                    const updated = [...checkoutItems]
                    updated[idx].materials = [
                      ...(updated[idx].materials || []),
                      { material_name: mat.full_name, unit: mat.unit, actual_qty_used: '', is_extra: true }
                    ]
                    setCheckoutItems(updated)
                  }}
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => setAttendStep('checkout_photos')}
            style={{ width: '100%', background: '#FF8C00', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
            Next → Checkout Photos
          </button>
        </div>
      )}

      {/* CHECKOUT STEP 3: Checkout Photos */}
      {tab === 'today' && attendStep === 'checkout_photos' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button onClick={() => setAttendStep('checkout_materials')}
              style={{ background: 'none', border: 'none', color: '#FF8C00', cursor: 'pointer', fontSize: '24px' }}>
              ←
            </button>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>Checkout Photos</div>
              <div style={{ color: '#888', fontSize: '12px' }}>Checkout Step 3 of 3 — Optional</div>
            </div>
          </div>

          {siteLabours.filter(l => attendance[l.id] !== 'absent').map(labour => (
            <div key={labour.id} style={{ background: '#111', borderRadius: '12px', padding: '14px', marginBottom: '10px', border: checkoutPhotos[labour.id] ? '1px solid #22c55e' : '1px solid #222' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontWeight: 'bold' }}>
                    {labour.name?.[0]}
                  </div>
                  <span style={{ color: '#fff', fontSize: '14px' }}>{labour.name}</span>
                </div>
                {checkoutPhotos[labour.id] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={checkoutPhotos[labour.id]} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                    <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
                  </div>
                ) : uploadingCheckoutPhoto[labour.id] ? (
                  <span style={{ color: '#FF8C00', fontSize: '13px' }}>Uploading...</span>
                ) : (
                  <label style={{ background: '#333', border: 'none', borderRadius: '8px', padding: '8px 12px', color: '#ccc', fontSize: '13px', cursor: 'pointer' }}>
                    📷 Photo
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploadingCheckoutPhoto(prev => ({ ...prev, [labour.id]: true }))
                        try {
                          const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
                          const fd = new FormData()
                          fd.append('file', file)
                          const res = await api.post('/upload/single', fd, {
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                          })
                          setCheckoutPhotos(prev => ({ ...prev, [labour.id]: res.data.url }))
                        } catch {
                          toast.error('Upload failed')
                        }
                        setUploadingCheckoutPhoto(prev => ({ ...prev, [labour.id]: false }))
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}

          <p style={{ textAlign: 'center', color: '#666', fontSize: '12px', marginBottom: '12px' }}>Photos are optional</p>

          <button
            onClick={submitCheckout}
            disabled={submittingCheckout}
            style={{ width: '100%', background: '#22c55e', border: 'none', borderRadius: '12px', padding: '16px', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', opacity: submittingCheckout ? 0.7 : 1 }}>
            {submittingCheckout ? 'Completing...' : '✓ Complete Day'}
          </button>
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
