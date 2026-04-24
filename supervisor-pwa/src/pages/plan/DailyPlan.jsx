import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, X, AlertCircle, Loader2, ClipboardList } from 'lucide-react'
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
function PlanCard({ plan, onContinue }) {
  const canContinue = plan.status === 'draft' || plan.status === 'submitted'
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-medium text-sm">{fmtDate(plan.date)}</span>
            <StatusBadge status={plan.status} />
          </div>
          <p className="text-xs text-gray-500">{plan.item_count || 0} tasks</p>
        </div>
        {canContinue && (
          <button
            onClick={() => onContinue(plan)}
            className="bg-primary-500/20 text-primary-400 border border-primary-500/30 text-xs px-3 py-1.5 rounded-lg font-medium ml-2 active:scale-95 transition-all"
          >
            Continue
          </button>
        )}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-500" />
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

        <button
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-all active:scale-95 ${
            canContinueToday || !todayPlan
              ? 'bg-primary-500 text-white'
              : 'bg-surface-400 text-gray-400 border border-white/10'
          }`}
          onClick={() => {
            if (todayBlocked) {
              toast('Attendance already submitted for today')
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
