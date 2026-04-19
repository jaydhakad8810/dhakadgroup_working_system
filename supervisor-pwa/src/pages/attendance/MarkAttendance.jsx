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

  const { update: markAttendanceDirty, clearDraft: clearAttendanceDraft } = useDraftSave('sv_attendance_draft', {})

  // ── Step
  const [step, setStep] = useState(1)

  // ── Step 1: Site & Date
  const [sites, setSites] = useState([])
  const { user } = useAuth()
  const [selectedSite, setSelectedSite] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [loadingSites, setLoadingSites] = useState(false)

  // ── Step 2: Bulk Attendance
  const [labourList, setLabourList] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loadingLabour, setLoadingLabour] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState([])

  // ── Step 3: Per-labour check-in photos (optional)
  // { [labour_id]: cloudinaryUrl }
  const [checkinPhotos, setCheckinPhotos] = useState({})
  // { [labour_id]: true } while uploading
  const [uploadingCheckin, setUploadingCheckin] = useState({})
  const [savingCheckIn, setSavingCheckIn] = useState(false)

  // ── Step 4: Task Execution
  const [taskCheckedIn, setTaskCheckedIn] = useState(false)
  const [taskDescription, setTaskDescription] = useState('')
  const [materials, setMaterials] = useState([])
  const [matName, setMatName] = useState('')
  const [matQty, setMatQty] = useState('')
  const [matUnit, setMatUnit] = useState('')
  // Per-labour checkout photos (mandatory)
  // { [labour_id]: cloudinaryUrl }
  const [checkoutPhotos, setCheckoutPhotos] = useState({})
  // { [labour_id]: true } while uploading
  const [uploadingCheckout, setUploadingCheckout] = useState({})
  // Per-labour task notes { [labour_id]: string }
  const [taskNotes, setTaskNotes] = useState({})
  const [taskStatus, setTaskStatus] = useState('completed')
  const [savingCheckOut, setSavingCheckOut] = useState(false)

  // ── Step 5: Report
  const [reportTaskStatus, setReportTaskStatus] = useState('done')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)

  // ── Live labour timers (for step 4 multiplier badge)
  const labourTimers = useLabourTimers(attendanceRecords)

  // ── Transfer Modal
  const [transferModal, setTransferModal] = useState({ open: false, labour: null })
  const [transferSite, setTransferSite] = useState('')
  const [transferring, setTransferring] = useState(false)

  // ── Groups state
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [editingGroups, setEditingGroups] = useState([])
  // ── Tasks state
  const [groupTasks, setGroupTasks] = useState({})
  const [workOrders, setWorkOrders] = useState([])
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false)
  const [carryForwardHints, setCarryForwardHints] = useState([])
  // ── Materials state
  const [groupMaterials, setGroupMaterials] = useState({})
  const [siteWorkOrderMaterials, setSiteWorkOrderMaterials] = useState([])

  // ── Resume checkout from localStorage (e.g. supervisor left after morning check-in)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('resume') === 'checkout') {
      try {
        const saved = localStorage.getItem('dg_resume_checkout')
        if (saved) {
          const parsed = JSON.parse(saved)
          const site = parsed.selectedSite || ''
          setSelectedSite(site)
          setAttendanceDate(parsed.attendanceDate || new Date().toISOString().split('T')[0])
          setAttendanceRecords(parsed.attendanceRecords || [])
          setCheckinPhotos(parsed.checkinPhotos || {})
          // Load labour list + work orders + materials for checkout
          if (site) {
            api.get('/labour?site_id=' + site + '&is_active=true').then(res => {
              const list = res.data?.data || res.data || []
              setLabourList(list)
              const att = {}
              ;(parsed.attendanceRecords || []).forEach(r => { att[r.labour_id] = r.status })
              setAttendance(att)
            }).catch(() => {})
            // Load work orders for task dropdown
            api.get('/workorders?site_id=' + site).then(res => {
              const wos = res.data?.data || res.data || []
              setWorkOrders(wos)
              const allMats = wos.flatMap(wo => wo.materials || [])
              setSiteWorkOrderMaterials(allMats)
            }).catch(() => {})
            // Restore groups, groupTasks and groupMaterials from localStorage
            try {
              const savedGroups = localStorage.getItem('dg_groups')
              if (savedGroups) setGroups(JSON.parse(savedGroups))
              const savedTasks = localStorage.getItem('dg_group_tasks')
              if (savedTasks) setGroupTasks(JSON.parse(savedTasks))
              const savedMats = localStorage.getItem('dg_group_materials')
              if (savedMats) setGroupMaterials(JSON.parse(savedMats))
            } catch {}
          }
          setMatQty('')
          setMatName('')
          setMatUnit('')
          setMaterials([])
          setStep(7)
          localStorage.removeItem('dg_resume_checkout')
        }
      } catch {}
    }
  }, [])

  // ── Load sites on mount
  useEffect(() => {
    setLoadingSites(true)
    api.get('/sites')
      .then((res) => setSites(res.data?.data || res.data || []))
      .catch(() => toast.error('Failed to load sites'))
      .finally(() => setLoadingSites(false))
  }, [])

  // ── Load labour when entering step 2
  useEffect(() => {
    if (step !== 2 || !selectedSite) return
    setLoadingLabour(true)
    api.get(`/labour?site_id=${selectedSite}&is_active=true`)
      .then((res) => {
        const list = res.data?.data || res.data || []
        setLabourList(list)
        const initial = {}
        list.forEach((l) => { initial[l._id || l.id] = 'present' })
        setAttendance(initial)
      })
      .catch(() => toast.error('Failed to load labour'))
      .finally(() => setLoadingLabour(false))
  }, [step, selectedSite])

  // ── Load groups when entering step 4
  useEffect(() => {
    if (step !== 4 || !selectedSite) return
    setLoadingGroups(true)
    api.get(`/labour-groups?site_id=${selectedSite}&date=${attendanceDate}`)
      .then(res => {
        const loaded = res.data?.data || res.data || []
        setGroups(loaded)
        const edited = loaded.map(g => ({
          ...g,
          members: (g.members || []).map(m => ({
            ...m,
            is_present: attendance[m.labour_id] !== 'absent'
          }))
        }))
        setEditingGroups(edited)
      })
      .catch(() => {})
      .finally(() => setLoadingGroups(false))
  }, [step, selectedSite, attendanceDate])

  // ── Load work orders when entering step 5
  useEffect(() => {
    if (step !== 5 || !selectedSite) return
    setLoadingWorkOrders(true)
    Promise.all([
      api.get(`/workorders?site_id=${selectedSite}`),
      api.get(`/attendance/carry-forward?site_id=${selectedSite}&date=${attendanceDate}`)
    ]).then(([woRes, cfRes]) => {
      const wos = woRes.data?.data || woRes.data || []
      setWorkOrders(wos)
      setCarryForwardHints(cfRes.data?.data || cfRes.data || [])
    }).catch(() => {}).finally(() => setLoadingWorkOrders(false))
  }, [step, selectedSite, attendanceDate])

  // ── Auto-fill task from groupTasks when entering step 7
  useEffect(() => {
    if (step !== 7) return
    // Auto-fill task description from first assigned group task
    // Read from localStorage directly in case state hasn't synced yet
    let tasks = groupTasks
    let mats = groupMaterials
    try {
      const savedTasks = localStorage.getItem('dg_group_tasks')
      if (savedTasks) tasks = JSON.parse(savedTasks)
      const savedMats = localStorage.getItem('dg_group_materials')
      if (savedMats) mats = JSON.parse(savedMats)
    } catch {}

    const firstTask = Object.values(tasks).find(t => t.step_name)
    if (firstTask && !taskDescription) setTaskDescription(firstTask.step_name)

    // Merge ALL group materials into the materials state for checkout
    const allGroupMats = Object.values(mats).flat()
    const validMats = allGroupMats.filter(m => m.name && m.name.trim() !== '')
    if (validMats.length > 0) {
      setMaterials(prev => {
        const existing = prev.map(m => m.name)
        const newMats = validMats
          .filter(m => !existing.includes(m.name))
          .map(m => {
            // Find matching site stock to get proper unit
            const siteStock = siteWorkOrderMaterials.find(s => s.product_name === m.name)
            return { name: m.name, quantity: String(m.quantity || ''), unit: siteStock?.unit || m.unit || 'KG' }
          })
        return [...prev, ...newMats]
      })
    }
  }, [step])

  // ── Load SITE STOCK (available materials at site) when entering step 6 or 7
  useEffect(() => {
    if ((step !== 6 && step !== 7) || !selectedSite) return
    api.get(`/godown/site-stock?site_id=${selectedSite}`)
      .then(res => {
        const stocks = Array.isArray(res.data) ? res.data : []
        setSiteWorkOrderMaterials(stocks)
        // Auto-populate each group with available stock items as blank entries
        if (step === 6 && stocks.length > 0) {
          setGroupMaterials(prev => {
            const updated = { ...prev }
            groups.forEach(g => {
              if (!updated[g.id] || updated[g.id].length === 0) {
                updated[g.id] = stocks.map(s => ({
                  work_order_material_id: s.id,
                  name: s.product_name,
                  quantity: '',
                  unit: s.unit || 'KG'
                }))
              }
            })
            return updated
          })
        }
      }).catch(() => {})
  }, [step, selectedSite])

  // ── Attendance counts
  const presentCount = Object.values(attendance).filter((v) => v === 'present').length
  const halfDayCount = Object.values(attendance).filter((v) => v === 'half_day').length
  const absentCount = Object.values(attendance).filter((v) => v === 'absent').length

  // ── Present / half-day labours (used in Steps 3 & 4)
  const presentLabours = labourList.filter((l) => {
    const id = l._id || l.id
    return attendance[id] === 'present' || attendance[id] === 'half_day'
  })

  // ── All checkout photos done? (gate for "Complete Day & Save")
  const allCheckoutDone =
    presentLabours.length > 0 &&
    presentLabours.every((l) => checkoutPhotos[l._id || l.id])

  // ── All check-in photos done? (gate for "Record Check-In & Continue")
  const allCheckinDone =
    presentLabours.length === 0 ||
    presentLabours.every((l) => checkinPhotos[l._id || l.id])

  // ── Toggle single labour attendance
  const toggleAttendance = (id, status) => {
    setAttendance((prev) => ({ ...prev, [id]: status }))
  }

  // ── Bulk actions
  const setAllPresent = () => {
    const all = {}
    labourList.forEach((l) => { all[l._id || l.id] = 'present' })
    setAttendance(all)
  }

  const setAllAbsent = () => {
    const all = {}
    labourList.forEach((l) => { all[l._id || l.id] = 'absent' })
    setAttendance(all)
  }

  // ── Save bulk attendance
  const saveBulkAttendance = async () => {
    if (!selectedSite) return toast.error('Please select a site first')
    setSavingAttendance(true)
    try {
      const records = labourList.map((l) => ({
        labour_id: l._id || l.id,
        status: attendance[l._id || l.id] || 'absent',
        date: attendanceDate,
        site_id: selectedSite,
      }))
      const res = await api.post('/attendance/bulk', { site_id: selectedSite, date: attendanceDate, records })
      setAttendanceRecords(res.data?.data || res.data || [])
      toast.success('Attendance saved')
      markAttendanceDirty({ inProgress: true, site: selectedSite, date: attendanceDate })
      setStep(3)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save attendance')
    } finally {
      setSavingAttendance(false)
    }
  }

  // ── Upload a photo file to Cloudinary, return URL
  const uploadPhoto = async (file) => {
    const form = new FormData()
    form.append('file', file)  // multer expects 'file' field for /upload/single
    try {
      const res = await api.post('/upload/single', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data?.url || res.data?.data?.url || ''
    } catch (err) {
      console.error('Photo upload error:', err.response?.data || err.message)
      throw err
    }
  }

  // ── Per-labour check-in photo handler
  // Immediately uploads to Cloudinary when photo is selected
  const handleCheckinPhoto = async (labourId, file) => {
    if (!file) {
      setCheckinPhotos((prev) => { const n = { ...prev }; delete n[labourId]; return n })
      return
    }
    setUploadingCheckin((prev) => ({ ...prev, [labourId]: true }))
    try {
      const url = await uploadPhoto(file)
      setCheckinPhotos((prev) => ({ ...prev, [labourId]: url }))
    } catch {
      toast.error('Failed to upload check-in photo')
    } finally {
      setUploadingCheckin((prev) => { const n = { ...prev }; delete n[labourId]; return n })
    }
  }

  // ── Per-labour checkout photo handler
  // Immediately uploads to Cloudinary when photo is selected
  const handleCheckoutPhoto = async (labourId, file) => {
    if (!file) {
      setCheckoutPhotos((prev) => { const n = { ...prev }; delete n[labourId]; return n })
      return
    }
    setUploadingCheckout((prev) => ({ ...prev, [labourId]: true }))
    try {
      const url = await uploadPhoto(file)
      setCheckoutPhotos((prev) => ({ ...prev, [labourId]: url }))
    } catch {
      toast.error('Failed to upload checkout photo')
    } finally {
      setUploadingCheckout((prev) => { const n = { ...prev }; delete n[labourId]; return n })
    }
  }

  // ── Record check-in: persist per-labour check-in photos → step 4
  const recordCheckIn = async () => {
    const missingPhotos = presentLabours.filter((l) => !checkinPhotos[l._id || l.id])
    if (missingPhotos.length > 0) {
      toast.error(`Check-in photo required for: ${missingPhotos.map((l) => l.name || l.labour_name).join(', ')}`)
      return
    }
    setSavingCheckIn(true)
    try {
      const presentRecords = attendanceRecords.filter(
        (r) => r.status === 'present' || r.status === 'half_day'
      )
      // Persist check-in photo for each present labour that has one
      await Promise.all(
        presentRecords.map((r) => {
          const photoUrl = checkinPhotos[r.labour_id]
          return api.patch(`/attendance/${r._id || r.id}/checkin`, {
            check_in_photo: photoUrl || null,
          })
        })
      )
      toast.success('Check-in recorded')
      localStorage.setItem('dg_checkin_session', JSON.stringify({
        selectedSite,
        attendanceDate,
        attendanceRecords: attendanceRecords.map(r => ({ id: r._id || r.id, labour_id: r.labour_id, status: r.status })),
        checkinPhotos,
        step: 4
      }))
      setStep(4)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record check-in')
    } finally {
      setSavingCheckIn(false)
    }
  }

  // ── Add material
  const addMaterial = () => {
    if (!matName.trim() || !matQty.trim()) {
      toast.error('Enter item name and quantity')
      return
    }
    setMaterials((prev) => [
      ...prev,
      { name: matName.trim(), quantity: matQty.trim(), unit: matUnit.trim() || 'pcs' },
    ])
    setMatName('')
    setMatQty('')
    setMatUnit('')
  }

  // ── Remove material
  const removeMaterial = (index) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Complete day & save → step 5
  const completeDay = async () => {
    if (!taskDescription.trim()) {
      toast.error('Please enter a task description')
      return
    }
    // Validate every present/half-day labour has a checkout photo
    const missing = presentLabours.filter((l) => !checkoutPhotos[l._id || l.id])
    if (missing.length > 0) {
      toast.error(
        `Checkout photo required for: ${missing.map((l) => l.name || l.labour_name).join(', ')}`
      )
      return
    }

    setSavingCheckOut(true)
    try {
      const presentRecords = attendanceRecords.filter(
        (r) => r.status === 'present' || r.status === 'half_day'
      )
      await Promise.all(
        presentRecords.map((r) =>
          api.patch(`/attendance/${r._id || r.id}/checkout`, {
            check_out_photo: checkoutPhotos[r.labour_id],
            task_note: taskNotes[r.labour_id] || taskDescription || '',
            task_description: taskDescription,
            task_status: taskStatus,
            materials,
          })
        )
      )
      toast.success('Day completed')
      setStep(8)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to complete day')
    } finally {
      setSavingCheckOut(false)
    }
  }

  // ── Generate PDF report
  const generatePdfReport = () => {
    const base = api.defaults?.baseURL || '/api'
    const token = sessionStorage.getItem('sv_token')
      || localStorage.getItem('sv_token')
      || (api.defaults.headers.common?.Authorization || '').replace('Bearer ', '')
      || ''
    const finalToken = token
    const url = `${base}/attendance/report/pdf?site_id=${selectedSite}&date=${attendanceDate}&token=${finalToken}`
    window.open(url, '_blank')
  }

  // ── Submit daily report
  const submitReport = async () => {
    setSubmittingReport(true)
    try {
      const firstCheckinPhoto = Object.values(checkinPhotos)[0] || null
      const firstCheckoutPhoto = Object.values(checkoutPhotos)[0] || null
      await api.post('/visit-reports', {
        site_id: selectedSite,
        title: `Daily Report - ${attendanceDate}`,
        report_date: attendanceDate,
        present_count: presentCount,
        half_day_count: halfDayCount,
        absent_count: absentCount,
        checkin_photo: firstCheckinPhoto,
        checkout_photo: firstCheckoutPhoto,
        materials,
        task_status: reportTaskStatus,
      })
      setReportSubmitted(true)
      clearAttendanceDraft()
      toast.success('Report submitted!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit report')
    } finally {
      setSubmittingReport(false)
    }
  }

  // ── Start new day
  const startNewDay = () => {
    localStorage.removeItem('dg_checkin_session')
    localStorage.removeItem('dg_resume_checkout')
    clearAttendanceDraft()
    setStep(1)
    setSelectedSite('')
    setAttendanceDate(new Date().toISOString().split('T')[0])
    setLabourList([])
    setAttendance({})
    setAttendanceRecords([])
    setCheckinPhotos({})
    setUploadingCheckin({})
    setCheckoutPhotos({})
    setUploadingCheckout({})
    setTaskNotes({})
    setTaskCheckedIn(false)
    setTaskDescription('')
    setMaterials([])
    setMatName('')
    setMatQty('')
    setMatUnit('')
    setTaskStatus('completed')
    setReportTaskStatus('done')
    setReportSubmitted(false)
    setGroups([])
    setEditingGroups([])
    setGroupTasks({})
    setWorkOrders([])
    setCarryForwardHints([])
    setGroupMaterials({})
    setSiteWorkOrderMaterials([])
  }

  // ── Transfer modal handlers
  const openTransfer = (labour) => {
    setTransferModal({ open: true, labour })
    setTransferSite('')
  }

  const closeTransfer = () => setTransferModal({ open: false, labour: null })

  const handleTransfer = async () => {
    if (!transferSite) { toast.error('Select destination site'); return }
    setTransferring(true)
    try {
      await api.post('/attendance/transfer', {
        labour_id: transferModal.labour?._id || transferModal.labour?.id,
        from_site: selectedSite,
        to_site: transferSite,
        date: attendanceDate,
      })
      toast.success('Labour transferred')
      closeTransfer()
      const res = await api.get(`/labour?site_id=${selectedSite}&is_active=true`)
      const list = res.data?.data || res.data || []
      setLabourList(list)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Transfer failed')
    } finally {
      setTransferring(false)
    }
  }

  const selectedSiteObj = sites.find((s) => (s._id || s.id) === selectedSite)

  return (
    <div className="min-h-screen bg-surface-500">
      <StepBar current={step} />

      {/* ── STEP 1: Select Site ── */}
      {step === 1 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-primary-400" />
              Select Site &amp; Date
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Site *</label>
                <select
                  className="select text-white"
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  disabled={loadingSites}
                >
                  <option value="">-- Select Site --</option>
                  {sites.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name || s.site_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="date"
                    className="input pl-9 text-white"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <button
            className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px]"
            onClick={() => setStep(2)}
            disabled={!selectedSite}
          >
            Continue
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── STEP 2: Bulk Attendance ── */}
      {step === 2 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setStep(1)} className="btn-ghost p-1">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users size={16} className="text-primary-400" />
                Bulk Attendance
              </h2>
              <div />
            </div>
            <p className="text-sm text-gray-400">
              {selectedSiteObj?.name || selectedSiteObj?.site_name} &middot; {attendanceDate}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="card-sm text-center">
              <p className="text-xl font-bold text-green-400">{presentCount}</p>
              <p className="text-xs text-gray-500">Present</p>
            </div>
            <div className="card-sm text-center">
              <p className="text-xl font-bold text-yellow-400">{halfDayCount}</p>
              <p className="text-xs text-gray-500">Half Day</p>
            </div>
            <div className="card-sm text-center">
              <p className="text-xl font-bold text-red-400">{absentCount}</p>
              <p className="text-xs text-gray-500">Absent</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              className="flex-1 btn-secondary text-sm min-h-[44px] text-green-400"
              onClick={setAllPresent}
            >
              All Present
            </button>
            <button
              className="flex-1 btn-secondary text-sm min-h-[44px] text-red-400"
              onClick={setAllAbsent}
            >
              All Absent
            </button>
          </div>

          {loadingLabour ? (
            <div className="text-center py-8 text-gray-500">Loading labour...</div>
          ) : labourList.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No labour found for this site</div>
          ) : (
            <div className="space-y-2">
              {labourList.map((l) => {
                const id = l._id || l.id
                const status = attendance[id] || 'absent'
                return (
                  <div key={id} className="card-sm flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {l.name || l.labour_name}
                      </p>
                      <p className="text-xs text-gray-500">{l.trade || l.role || ''}</p>
                    </div>
                    <button
                      onClick={() => openTransfer(l)}
                      className="btn-ghost p-1 text-blue-400 shrink-0"
                      title="Transfer to another site"
                    >
                      <ArrowRight size={14} />
                    </button>
                    <div className="flex gap-1 shrink-0">
                      {['present', 'half_day', 'absent'].map((s) => (
                        <button
                          key={s}
                          onClick={() => toggleAttendance(id, s)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium min-h-[44px] transition-all ${
                            status === s
                              ? s === 'present'
                                ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                                : s === 'half_day'
                                ? 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                                : 'bg-red-500/30 text-red-400 border border-red-500/50'
                              : 'bg-surface-400 text-gray-500 border border-white/5'
                          }`}
                        >
                          {s === 'present' ? 'P' : s === 'half_day' ? 'H' : 'A'}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <button
            className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px]"
            onClick={saveBulkAttendance}
            disabled={savingAttendance || labourList.length === 0}
          >
            {savingAttendance ? 'Saving...' : 'Save & Continue'}
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── STEP 3: Per-Labour Check-In Photos ── */}
      {step === 3 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(2)} className="btn-ghost p-1">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Camera size={16} className="text-primary-400" />
                Labour Check-In
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="card-sm text-center">
                <p className="text-lg font-bold text-green-400">{presentCount}</p>
                <p className="text-xs text-gray-500">Present</p>
              </div>
              <div className="card-sm text-center">
                <p className="text-lg font-bold text-yellow-400">{halfDayCount}</p>
                <p className="text-xs text-gray-500">Half Day</p>
              </div>
              <div className="card-sm text-center">
                <p className="text-lg font-bold text-red-400">{absentCount}</p>
                <p className="text-xs text-gray-500">Absent</p>
              </div>
            </div>

            <p className="text-xs text-red-400 mb-3 font-medium">
              Check-in photo is required for all present labour.
            </p>
          </div>

          {presentLabours.length === 0 ? (
            <div className="card text-center text-gray-500 text-sm py-6">
              No present or half-day labours to check in.
            </div>
          ) : (
            <div className="space-y-2">
              {presentLabours.map((l) => {
                const id = l._id || l.id
                const status = attendance[id]
                const hasPhoto = !!checkinPhotos[id]
                return (
                  <div
                    key={id}
                    className="card-sm flex items-center gap-3"
                    style={{ borderLeft: `3px solid ${hasPhoto ? '#22c55e' : '#ef4444'}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {l.name || l.labour_name}
                      </p>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full border mt-0.5 ${
                          status === 'present'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        {status === 'present' ? 'Present' : 'Half Day'}
                      </span>
                      {!hasPhoto && (
                        <p className="text-xs text-red-400 mt-0.5">Photo required</p>
                      )}
                    </div>
                    <LabourPhotoBtn
                      labourId={id}
                      photoUrl={checkinPhotos[id]}
                      uploading={uploadingCheckin[id]}
                      onCapture={handleCheckinPhoto}
                    />
                  </div>
                )
              })}
            </div>
          )}

          <button
            className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px]"
            onClick={recordCheckIn}
            disabled={savingCheckIn || !allCheckinDone}
          >
            {savingCheckIn ? 'Saving...' : 'Record Check-In & Continue'}
            <ChevronRight size={18} />
          </button>
          {!allCheckinDone && presentLabours.length > 0 && (
            <p className="text-xs text-red-400 text-center mt-1">
              Add check-in photo for all {presentLabours.length} present labour(s) to continue
            </p>
          )}
        </div>
      )}

      {/* ── STEP 4: Labour Groups ── */}
      {step === 4 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          <div className="card mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(3)} className="btn-ghost p-1"><ArrowLeft size={18} /></button>
              <h2 className="text-base font-bold text-white">Labour Groups</h2>
            </div>
          </div>
          <GroupsStep
            presentLabours={presentLabours}
            editingGroups={editingGroups}
            setEditingGroups={setEditingGroups}
            attendanceDate={attendanceDate}
            selectedSite={selectedSite}
            onNext={(savedGroups) => {
              setGroups(savedGroups)
              try { localStorage.setItem('dg_groups', JSON.stringify(savedGroups)) } catch {}
              setStep(5)
            }}
          />
        </div>
      )}

      {/* ── STEP 5: Task Assignment ── */}
      {step === 5 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          <div className="card mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(4)} className="btn-ghost p-1"><ArrowLeft size={18} /></button>
              <h2 className="text-base font-bold text-white">Assign Tasks</h2>
            </div>
          </div>
          <TaskAssignStep
            groups={groups}
            groupTasks={groupTasks}
            setGroupTasks={setGroupTasks}
            presentLabours={presentLabours}
            workOrders={workOrders}
            carryForwardHints={carryForwardHints}
            loadingWorkOrders={loadingWorkOrders}
            onNext={(individualTasks) => {
              try {
                localStorage.setItem('dg_group_tasks', JSON.stringify(groupTasks))
                localStorage.setItem('dg_groups', JSON.stringify(groups))
              } catch {}
              setStep(6)
            }}
          />
        </div>
      )}

      {/* ── STEP 6: Material Assignment ── */}
      {step === 6 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          <div className="card mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(5)} className="btn-ghost p-1"><ArrowLeft size={18} /></button>
              <h2 className="text-base font-bold text-white">Assign Materials</h2>
            </div>
          </div>
          <MaterialAssignStep
            groups={groups}
            groupMaterials={groupMaterials}
            setGroupMaterials={setGroupMaterials}
            siteWorkOrderMaterials={siteWorkOrderMaterials}
            presentLabours={presentLabours}
            onNext={() => {
              localStorage.setItem('dg_checkin_session', JSON.stringify({
                selectedSite,
                attendanceDate,
                attendanceRecords: attendanceRecords.map(r => ({ id: r._id || r.id, labour_id: r.labour_id, status: r.status })),
                checkinPhotos,
                step: 'checkin_complete'
              }))
              setStep('morning_done')
            }}
          />
        </div>
      )}

      {/* ── MORNING DONE: Check-in complete, return in evening ── */}
      {step === 'morning_done' && (
        <div className="page-content flex flex-col items-center justify-center py-12 gap-4" style={{ paddingBottom: 100 }}>
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle size={36} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white text-center">Morning Check-In Complete!</h2>
          <p className="text-gray-400 text-sm text-center px-4">
            All workers are checked in. Come back in the evening to complete checkout.
          </p>
          <div className="w-full px-4 space-y-3 mt-4">
            <button
              className="btn-primary w-full min-h-[52px] flex items-center justify-center gap-2"
              onClick={() => window.location.href = '/'}
            >
              🏠 Go to Home
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 7: Task Execution + Per-Labour Checkout Photos ── */}
      {step === 7 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(6)} className="btn-ghost p-1">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-base font-bold text-white">Task Execution</h2>
            </div>
            <div className="mb-4">
              <label className="label">Task Description *</label>
              <select
                className="select text-white mb-2"
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
              >
                <option value="">-- Select task from work order --</option>
                {workOrders.flatMap(wo => (wo.steps || []).map(s => (
                  <option key={s.id} value={s.step_name}>{wo.title} — {s.step_name}</option>
                )))}
              </select>
              <input
                className="input text-white"
                placeholder="Or type custom task description..."
                value={taskDescription}
                onChange={e => setTaskDescription(e.target.value)}
              />
            </div>
            <button
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium min-h-[44px] transition-all ${
                taskCheckedIn
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'btn-primary'
              }`}
              onClick={() => {
                setTaskCheckedIn(true)
                toast.success('Task check-in recorded')
              }}
              disabled={taskCheckedIn}
            >
              {taskCheckedIn ? (
                <>
                  <CheckCircle size={18} />
                  Task Checked In
                </>
              ) : (
                <>
                  <Clock size={18} />
                  Mark Task Check-In
                </>
              )}
            </button>
          </div>

          <div className="card">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Plus size={14} className="text-primary-400" />
              Material Usage Entry
            </h3>
            <div className="space-y-2 mb-3">
              {siteWorkOrderMaterials.length > 0 && (
                <div className="mb-3">
                  <label className="label">Quick add from Work Order</label>
                  <select
                    className="select text-white"
                    defaultValue=""
                    onChange={e => {
                      const wom = siteWorkOrderMaterials.find(m => m.id === e.target.value)
                      if (wom) {
                        setMatName(wom.product_name)
                        setMatUnit(wom.unit || 'KG')
                        setMatQty('')
                        // Scroll to quantity input to prompt supervisor
                        setTimeout(() => {
                          const qtyInput = document.querySelector('input[type="number"]')
                          if (qtyInput) qtyInput.focus()
                        }, 100)
                      }
                    }}
                  >
                    <option value="">-- Select WO material --</option>
                    {siteWorkOrderMaterials.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.product_name} ({m.unit}) — Available: {m.quantity}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Item Name</label>
                <input
                  className="input text-white"
                  placeholder="e.g. Cement"
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Quantity</label>
                  <input
                    className="input text-white"
                    type="number"
                    placeholder="0"
                    value={matQty}
                    onChange={(e) => setMatQty(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="select text-white" value={matUnit} onChange={e => setMatUnit(e.target.value)}>
                    <option value="">-- Unit --</option>
                    {['KG','LTR','Nos','Unit','bags','pcs'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <button
              className="btn-secondary w-full flex items-center justify-center gap-2 min-h-[44px]"
              onClick={addMaterial}
            >
              <Plus size={16} />
              Add Material
            </button>

            {materials.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Added Materials</p>
                {materials.map((m, i) => (
                  <div
                    key={`mat-${i}-${m.name}`}
                    className="flex items-center justify-between bg-surface-400 rounded-xl px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-white font-medium">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        {m.quantity} {m.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => removeMaterial(i)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <label className="label">Checkout Status</label>
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => setTaskStatus('completed')}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-all ${
                  taskStatus === 'completed'
                    ? 'bg-green-500 text-white'
                    : 'border border-green-500/40 text-green-400 bg-transparent'
                }`}
              >
                ✅ Mark as Completed
              </button>
              <button
                onClick={() => setTaskStatus('pending')}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold min-h-[44px] transition-all ${
                  taskStatus === 'pending'
                    ? 'bg-orange-500 text-white'
                    : 'border border-orange-500/40 text-orange-400 bg-transparent'
                }`}
              >
                🕐 Mark as Pending
              </button>
            </div>
          </div>

          {/* ── Per-Labour Checkout Photos (MANDATORY) ── */}
          <div className="card">
            <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Camera size={14} className="text-primary-400" />
              Checkout Photos
              <span className="text-xs text-red-400 font-normal">(required for all)</span>
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {Object.keys(checkoutPhotos).length}/{presentLabours.length} captured
            </p>

            {presentLabours.length === 0 ? (
              <p className="text-sm text-gray-500">No present labours.</p>
            ) : (
              <div className="space-y-3">
                {presentLabours.map((l) => {
                  const id = l._id || l.id
                  const checkinThumb = checkinPhotos[id]
                  const timer = labourTimers[id]
                  return (
                    <div key={id} className="bg-surface-400 rounded-xl px-3 py-2 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {l.name || l.labour_name}
                          </p>
                          <MultiplierBadge
                            hoursWorked={timer?.hoursWorked}
                            checkInTime={timer?.checkInTime}
                          />
                          {checkinThumb && (
                            <div className="flex items-center gap-1 mt-1">
                              <img
                                src={checkinThumb}
                                alt="check-in"
                                className="w-6 h-6 object-cover rounded"
                              />
                              <span className="text-xs text-gray-500">Check-in</span>
                            </div>
                          )}
                        </div>
                        {!checkoutPhotos[id] && (
                          <span className="text-xs text-red-400 shrink-0">Required</span>
                        )}
                        <LabourPhotoBtn
                          labourId={id}
                          photoUrl={checkoutPhotos[id]}
                          uploading={uploadingCheckout[id]}
                          onCapture={handleCheckoutPhoto}
                        />
                      </div>
                      <input
                        className="input text-white text-xs w-full"
                        placeholder="Task note for this labour (optional)"
                        value={taskNotes[id] || ''}
                        onChange={(e) =>
                          setTaskNotes((prev) => ({ ...prev, [id]: e.target.value }))
                        }
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <button
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium min-h-[44px] transition-all ${
              allCheckoutDone && !savingCheckOut
                ? 'btn-primary'
                : 'bg-surface-400 text-gray-500 cursor-not-allowed'
            }`}
            onClick={completeDay}
            disabled={savingCheckOut || !allCheckoutDone}
          >
            {savingCheckOut ? 'Saving...' : 'Complete Day & Save'}
            <CheckCircle size={18} />
          </button>
          {!allCheckoutDone && presentLabours.length > 0 && (
            <p className="text-xs text-red-400 text-center -mt-2">
              Add checkout photo for all present labours to continue
            </p>
          )}
        </div>
      )}

      {/* ── STEP 8: Task Completion ── */}
      {step === 8 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          <div className="card mb-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(7)} className="btn-ghost p-1"><ArrowLeft size={18} /></button>
              <h2 className="text-base font-bold text-white">Task Completion</h2>
            </div>
          </div>
          <TaskCompleteStep
            groups={groups}
            groupTasks={groupTasks}
            attendanceRecords={attendanceRecords}
            attendanceDate={attendanceDate}
            onNext={() => setStep(9)}
          />
        </div>
      )}

      {/* ── STEP 9: Day Completion & Report ── */}
      {step === 9 && (
        <div className="page-content" style={{ paddingBottom: 140 }}>
          {reportSubmitted ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle size={36} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Report Submitted!</h2>
              <p className="text-gray-400 text-center text-sm">
                Daily report has been submitted successfully.
              </p>
              <button
                className="btn-primary w-full flex items-center justify-center gap-2 min-h-[52px] mt-4"
                onClick={() => window.location.href = '/'}
              >
                🏠 Go to Home
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 min-h-[52px] mt-3 rounded-xl border-2 border-primary-500 text-primary-400 font-semibold text-base"
                onClick={generatePdfReport}
              >
                📄 Generate & Share Report
              </button>
              <button
                className="w-full flex items-center justify-center gap-2 min-h-[52px] mt-3 mb-8 rounded-xl bg-green-600 text-white font-semibold text-base"
                onClick={() => {
                  const siteName = selectedSiteObj?.name || selectedSiteObj?.site_name || selectedSite
                  const supervisorName = user?.name || 'Supervisor'
                  const lines = [
                    '🏗️ *Dhakad Group — Daily Report*',
                    `📅 Date: ${attendanceDate}`,
                    `🏢 Site: ${siteName}`,
                    `👷 Supervisor: ${supervisorName}`,
                    `✅ Present: ${presentCount} — ${presentLabours.map(l => l.name || l.labour_name).join(', ')}`,
                    `🌓 Half Day: ${halfDayCount}`,
                    `❌ Absent: ${absentCount}`,
                    `📋 Task Status: ${reportTaskStatus || 'Done'}`,
                  ].join('%0A')
                  window.open(`https://wa.me/?text=${lines}`, '_blank')
                }}
              >
                📤 Share on WhatsApp
              </button>
            </div>
          ) : (
            <>
              <div className="card">
                <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <FileText size={16} className="text-primary-400" />
                  Day Completion
                </h2>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="card-sm text-center">
                    <p className="text-lg font-bold text-green-400">{presentCount}</p>
                    <p className="text-xs text-gray-500">Present</p>
                  </div>
                  <div className="card-sm text-center">
                    <p className="text-lg font-bold text-yellow-400">{halfDayCount}</p>
                    <p className="text-xs text-gray-500">Half Day</p>
                  </div>
                  <div className="card-sm text-center">
                    <p className="text-lg font-bold text-red-400">{absentCount}</p>
                    <p className="text-xs text-gray-500">Absent</p>
                  </div>
                </div>

                {/* Photo summary */}
                {(Object.keys(checkinPhotos).length > 0 || Object.keys(checkoutPhotos).length > 0) && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Object.keys(checkinPhotos).length > 0 && (
                      <div>
                        <p className="label">Check-In Photos</p>
                        <div className="flex gap-1 flex-wrap">
                          {Object.values(checkinPhotos).slice(0, 4).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="check-in"
                              className="w-12 h-12 object-cover rounded-lg border border-white/10"
                            />
                          ))}
                          {Object.keys(checkinPhotos).length > 4 && (
                            <div className="w-12 h-12 rounded-lg bg-surface-400 flex items-center justify-center text-xs text-gray-400">
                              +{Object.keys(checkinPhotos).length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {Object.keys(checkoutPhotos).length > 0 && (
                      <div>
                        <p className="label">Checkout Photos</p>
                        <div className="flex gap-1 flex-wrap">
                          {Object.values(checkoutPhotos).slice(0, 4).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="checkout"
                              className="w-12 h-12 object-cover rounded-lg border border-white/10"
                            />
                          ))}
                          {Object.keys(checkoutPhotos).length > 4 && (
                            <div className="w-12 h-12 rounded-lg bg-surface-400 flex items-center justify-center text-xs text-gray-400">
                              +{Object.keys(checkoutPhotos).length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {materials.length > 0 && (
                  <div>
                    <p className="label">Materials Used</p>
                    <div className="space-y-1">
                      {materials.map((m, i) => (
                        <div
                          key={`mat-${i}-${m.name}`}
                          className="flex justify-between text-sm bg-surface-400 rounded-lg px-3 py-1.5"
                        >
                          <span className="text-white">{m.name}</span>
                          <span className="text-gray-400">
                            {m.quantity} {m.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <label className="label">Task Status</label>
                <div className="flex gap-2">
                  {['done', 'in_progress'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setReportTaskStatus(s)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-all ${
                        reportTaskStatus === s
                          ? s === 'done'
                            ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                            : 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                          : 'bg-surface-400 text-gray-500 border border-white/5'
                      }`}
                    >
                      {s === 'done' ? 'Done' : 'In Progress'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px]"
                onClick={submitReport}
                disabled={submittingReport}
              >
                {submittingReport ? 'Submitting...' : 'Submit Daily Report'}
                <FileText size={18} />
              </button>
              <button
                className="btn-secondary w-full flex items-center justify-center gap-2 min-h-[44px]"
                onClick={generatePdfReport}
                type="button"
              >
                Generate PDF Report
                <FileText size={18} />
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Labour Transfer Modal ── */}
      {transferModal.open && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={closeTransfer} />
          <div
            className="relative bg-surface-300 rounded-t-2xl w-full p-4 space-y-4"
            style={{ paddingBottom: 140 }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Transfer Labour</h3>
              <button onClick={closeTransfer} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-400">
              Transfer{' '}
              <span className="text-white font-medium">
                {transferModal.labour?.name || transferModal.labour?.labour_name}
              </span>{' '}
              to another site
            </p>
            <div>
              <label className="label">Destination Site</label>
              <select
                className="select text-white"
                value={transferSite}
                onChange={(e) => setTransferSite(e.target.value)}
              >
                <option value="">-- Select Site --</option>
                {sites
                  .filter((s) => (s._id || s.id) !== selectedSite)
                  .map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name || s.site_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 min-h-[44px]" onClick={closeTransfer}>
                Cancel
              </button>
              <button
                className="btn-primary flex-1 min-h-[44px]"
                onClick={handleTransfer}
                disabled={transferring || !transferSite}
              >
                {transferring ? 'Transferring...' : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
