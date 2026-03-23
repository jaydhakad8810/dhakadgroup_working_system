import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle, XCircle, Clock, Save, Loader2, ArrowRightLeft,
  Camera, Upload, Plus, Trash2, ClipboardCheck, Package, FileText
} from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, Modal } from '../../components/ui'
import { Users } from 'lucide-react'

// ─── inline photo upload ────────────────────────────────────────────────────
function PhotoCapture({ value, onChange, label }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()
  const camRef  = useRef()

  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', 'dgsystem/attendance')
      const r = await api.post('/upload/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onChange(r.data.url)
      toast.success('Photo uploaded')
    } catch { toast.error('Upload failed') }
    setUploading(false)
  }

  return (
    <div>
      <input ref={camRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value ? (
        <div className="relative">
          <img src={value} className="w-full h-40 object-cover rounded-2xl" alt="Captured" />
          <button type="button" onClick={() => camRef.current?.click()}
            className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">Retake</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => camRef.current?.click()} disabled={uploading}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed border-gray-600 text-gray-400 active:scale-95 transition-transform">
            {uploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
            <span className="text-xs">{uploading ? 'Uploading...' : label || 'Take Photo'}</span>
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed border-gray-600 text-gray-400 active:scale-95 transition-transform">
            <Upload size={24} />
            <span className="text-xs">Upload</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── step indicator ─────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Site', 'Attendance', 'Check-In', 'Task', 'Report']
  return (
    <div className="flex items-center justify-between mb-4">
      {steps.map((label, i) => {
        const n = i + 1
        const active  = n === step
        const done    = n < step
        return (
          <div key={label} className="flex flex-col items-center flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${done ? 'bg-green-500 text-white' : active ? 'bg-primary-500 text-white' : 'bg-surface-300 text-gray-500'}`}>
              {done ? '✓' : n}
            </div>
            <span className={`text-xs leading-none text-center ${active ? 'text-primary-400' : done ? 'text-green-400' : 'text-gray-600'}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────
export default function MarkAttendance() {
  const [searchParams] = useSearchParams()

  // ── global state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(1)
  const [sites, setSites] = useState([])
  const [filterSite, setFilterSite] = useState(searchParams.get('site_id') || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSite, setSelectedSite] = useState(null)

  // step 2
  const [labour, setLabour] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attendanceIds, setAttendanceIds] = useState({}) // labour_id → att record id

  // step 3
  const [checkInPhoto, setCheckInPhoto] = useState('')
  const [checkInSaving, setCheckInSaving] = useState(false)

  // step 4
  const [taskCheckedIn, setTaskCheckedIn] = useState(false)
  const [materials, setMaterials] = useState([])
  const [matForm, setMatForm] = useState({ item_name: '', quantity: '', unit: '' })
  const [checkOutPhoto, setCheckOutPhoto] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)

  // step 5
  const [taskDone, setTaskDone] = useState(false)
  const [reportSaving, setReportSaving] = useState(false)
  const [reportDone, setReportDone] = useState(false)

  // transfer modal
  const [transferModal, setTransferModal] = useState(false)
  const [transferLabour, setTransferLabour] = useState(null)
  const [transferForm, setTransferForm] = useState({ to_site_id: '', reason: '', duration_days: 1 })
  const [transferring, setTransferring] = useState(false)

  // ── load sites ─────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  // ── load labour when site + date selected ──────────────────────────────────
  useEffect(() => {
    if (!filterSite || step > 2) return
    setLoading(true)
    Promise.all([
      api.get(`/labour?site_id=${filterSite}&is_active=true`),
      api.get(`/attendance?site_id=${filterSite}&date=${date}`)
    ]).then(([l, a]) => {
      setLabour(l.data)
      const statusMap = {}; const idMap = {}
      a.data.forEach(r => { statusMap[r.labour_id] = r.status; idMap[r.labour_id] = r.id })
      setAttendance(statusMap)
      setAttendanceIds(idMap)
    }).catch(() => {}).finally(() => setLoading(false))
    // update selectedSite object
    const site = sites.find(s => s.id === filterSite)
    if (site) setSelectedSite(site)
  }, [filterSite, date, step])

  // ── helpers ────────────────────────────────────────────────────────────────
  const setStatus = (id, status) => setAttendance(p => ({ ...p, [id]: p[id] === status ? undefined : status }))
  const markAll = (status) => { const m = {}; labour.forEach(l => { m[l.id] = status }); setAttendance(m) }
  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const halfCount    = Object.values(attendance).filter(v => v === 'half_day').length
  const absentCount  = Object.values(attendance).filter(v => v === 'absent').length
  const otherSites   = sites.filter(s => s.id !== filterSite)

  // ── STEP 2: save attendance ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!filterSite) return toast.error('Select a site first')
    const records = labour.map(l => ({ labour_id: l.id, status: attendance[l.id] || 'absent', day_multiplier: attendance[l.id] === 'half_day' ? 0.5 : 1 }))
    setSaving(true)
    try {
      const res = await api.post('/attendance/bulk', { site_id: filterSite, date, records })
      // capture attendance IDs for checkout later
      const idMap = {}
      res.data.forEach(r => { if (r.labour_id) idMap[r.labour_id] = r.id })
      setAttendanceIds(p => ({ ...p, ...idMap }))
      toast.success(`Attendance saved for ${records.length} workers!`)
      setStep(3)
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  // ── STEP 3: save check-in photo ────────────────────────────────────────────
  const handleCheckIn = async () => {
    if (!checkInPhoto) return toast.error('Capture check-in photo first')
    setCheckInSaving(true)
    try {
      const records = labour
        .filter(l => attendance[l.id] === 'present' || attendance[l.id] === 'half_day')
        .map(l => ({ labour_id: l.id, status: attendance[l.id], day_multiplier: attendance[l.id] === 'half_day' ? 0.5 : 1, check_in_photo: checkInPhoto }))
      if (records.length > 0) {
        await api.post('/attendance/bulk', { site_id: filterSite, date, records })
      }
      toast.success('Check-in recorded!')
      setStep(4)
    } catch { toast.error('Failed to save check-in') }
    setCheckInSaving(false)
  }

  // ── STEP 4: material utils ─────────────────────────────────────────────────
  const addMaterial = () => {
    if (!matForm.item_name || !matForm.quantity) return toast.error('Enter item name and quantity')
    setMaterials(p => [...p, { ...matForm }])
    setMatForm({ item_name: '', quantity: '', unit: '' })
  }

  const removeMaterial = (i) => setMaterials(p => p.filter((_, idx) => idx !== i))

  // ── STEP 4: check-out ──────────────────────────────────────────────────────
  const handleCheckOut = async () => {
    const hasMaterials = materials.length > 0
    if (hasMaterials && !checkOutPhoto) return toast.error('Checkout photo required when materials are used')
    setCheckingOut(true)
    try {
      const presentIds = labour.filter(l => attendance[l.id] === 'present' || attendance[l.id] === 'half_day').map(l => attendanceIds[l.id]).filter(Boolean)
      for (const attId of presentIds) {
        await api.patch(`/attendance/${attId}/checkout`, { check_out_photo: checkOutPhoto || null })
      }
      toast.success('Labour checked out!')
      setStep(5)
    } catch { toast.error('Checkout failed') }
    setCheckingOut(false)
  }

  // ── STEP 5: generate daily report ─────────────────────────────────────────
  const handleGenerateReport = async () => {
    setReportSaving(true)
    try {
      const site = sites.find(s => s.id === filterSite)
      const attSummary = `Attendance — Present: ${presentCount}, Half-day: ${halfCount}, Absent: ${absentCount}.`
      const matSummary = materials.length > 0
        ? ` Materials used: ${materials.map(m => `${m.quantity} ${m.unit} of ${m.item_name}`).join('; ')}.`
        : ''

      const photos = [checkInPhoto, checkOutPhoto].filter(Boolean)

      // save material usage as daily expenses
      for (const m of materials) {
        await api.post('/expenses', {
          site_id: filterSite,
          expense_date: date,
          category_name: m.item_name,
          amount: 0,
          payment_mode: 'material',
          description: `${m.quantity} ${m.unit}`,
        })
      }

      await api.post('/visit-reports', {
        site_id: filterSite,
        title: `Daily Report — ${site?.name || 'Site'} — ${date}`,
        report_date: date,
        description: attSummary + matSummary,
        labour_count: presentCount + halfCount,
        photos,
        status: taskDone ? 'closed' : 'in_progress',
      })

      toast.success('Daily report submitted! Admin notified.')
      setReportDone(true)
    } catch { toast.error('Failed to generate report') }
    setReportSaving(false)
  }

  // ── transfer ───────────────────────────────────────────────────────────────
  const openTransfer = (l) => { setTransferLabour(l); setTransferForm({ to_site_id: '', reason: '', duration_days: 1 }); setTransferModal(true) }
  const handleTransfer = async () => {
    if (!transferForm.to_site_id) return toast.error('Select destination site')
    setTransferring(true)
    try {
      await api.post('/attendance/transfer', { labour_id: transferLabour.id, from_site_id: filterSite, to_site_id: transferForm.to_site_id, reason: transferForm.reason, duration_days: transferForm.duration_days, transfer_date: date })
      toast.success(`${transferLabour.name} transferred!`)
      setTransferModal(false)
      const l = await api.get(`/labour?site_id=${filterSite}&is_active=true`)
      setLabour(l.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Transfer failed') }
    setTransferring(false)
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-content space-y-4">
      <StepBar step={step} />

      {/* ── STEP 1: Site Selection ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl">
            <p className="text-primary-400 font-semibold">Step 1 — Select Site</p>
            <p className="text-gray-400 text-xs mt-0.5">Choose the site to mark attendance for today</p>
          </div>
          <select className="select" value={filterSite} onChange={e => { setFilterSite(e.target.value); const s = sites.find(x => x.id === e.target.value); setSelectedSite(s || null) }}>
            <option value="">Select Site *</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          {filterSite && (
            <button onClick={() => setStep(2)} className="btn-primary w-full py-4">
              <ClipboardCheck size={18} /> Mark Attendance
            </button>
          )}
        </div>
      )}

      {/* ── STEP 2: Bulk Attendance ────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl">
            <p className="text-primary-400 font-semibold">Step 2 — Mark Attendance</p>
            <p className="text-gray-400 text-xs mt-0.5">{selectedSite?.name} · {date}</p>
          </div>

          {labour.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center"><p className="text-green-400 font-bold text-xl">{presentCount}</p><p className="text-gray-400 text-xs">Present</p></div>
                <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-center"><p className="text-primary-400 font-bold text-xl">{halfCount}</p><p className="text-gray-400 text-xs">Half Day</p></div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center"><p className="text-red-400 font-bold text-xl">{absentCount}</p><p className="text-gray-400 text-xs">Absent</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => markAll('present')} className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 font-medium text-sm active:scale-95 transition-transform">All Present</button>
                <button onClick={() => markAll('absent')} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium text-sm active:scale-95 transition-transform">All Absent</button>
              </div>
            </>
          )}

          {loading ? <LoadingPage />
            : !labour.length ? <EmptyState icon={Users} title="No labour" message="No active labour on this site" />
            : (
              <div className="space-y-2">
                {labour.map(l => {
                  const status = attendance[l.id]
                  return (
                    <div key={l.id} className="card-sm">
                      <div className="flex items-center gap-3">
                        {l.photo
                          ? <img src={l.photo} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                          : <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-lg flex-shrink-0">{l.name[0]}</div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{l.name}</p>
                          <p className="text-gray-500 text-xs">₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}/day</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setStatus(l.id, 'present')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'present' ? 'bg-green-500 text-white' : 'bg-surface-200 text-gray-500'}`}><CheckCircle size={16} /></button>
                          <button onClick={() => setStatus(l.id, 'half_day')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'half_day' ? 'bg-primary-500 text-white' : 'bg-surface-200 text-gray-500'}`}><Clock size={16} /></button>
                          <button onClick={() => setStatus(l.id, 'absent')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-surface-200 text-gray-500'}`}><XCircle size={16} /></button>
                          <button onClick={() => openTransfer(l)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-200 text-gray-500 hover:text-orange-400 transition-all active:scale-95"><ArrowRightLeft size={14} /></button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }

          {labour.length > 0 && (
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-4 sticky bottom-24 shadow-xl shadow-primary-500/20">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving...' : `Save & Continue (${presentCount + halfCount} present)`}
            </button>
          )}
        </div>
      )}

      {/* ── STEP 3: Check-In Photo ─────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
            <p className="text-green-400 font-semibold">Step 3 — Labour Check-In</p>
            <p className="text-gray-400 text-xs mt-0.5">Take a site photo to confirm check-in</p>
          </div>

          <div className="card space-y-0">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-400">Present:</span><span className="text-green-400 font-bold">{presentCount}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-400">Half-day:</span><span className="text-primary-400 font-bold">{halfCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Absent:</span><span className="text-red-400 font-bold">{absentCount}</span>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-2">📸 Site Check-In Photo <span className="text-red-400 text-sm">*Required</span></p>
            <PhotoCapture value={checkInPhoto} onChange={setCheckInPhoto} label="Capture site photo" />
          </div>

          <button onClick={handleCheckIn} disabled={checkInSaving || !checkInPhoto} className="btn-primary w-full py-4">
            {checkInSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {checkInSaving ? 'Recording...' : 'Record Check-In & Continue'}
          </button>
        </div>
      )}

      {/* ── STEP 4: Task Execution ─────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
            <p className="text-orange-400 font-semibold">Step 4 — Task Execution</p>
            <p className="text-gray-400 text-xs mt-0.5">Mark task check-in, add material usage, then check out</p>
          </div>

          {/* Task Check-In */}
          {!taskCheckedIn ? (
            <button onClick={() => { setTaskCheckedIn(true); toast.success('Task check-in recorded!') }}
              className="w-full py-4 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
              <ClipboardCheck size={20} /> Mark Task Check-In (Start Work)
            </button>
          ) : (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
              <CheckCircle size={18} className="text-green-400" />
              <p className="text-green-400 text-sm font-semibold">Task Check-In Recorded — {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}

          {/* Material Usage */}
          {taskCheckedIn && (
            <div className="card space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Package size={16} className="text-orange-400" />
                <p className="text-white font-semibold text-sm">Material Usage <span className="text-gray-500 font-normal">(optional)</span></p>
              </div>

              <div className="space-y-2">
                <input className="input text-sm" placeholder="Item name (e.g. Cement)" value={matForm.item_name} onChange={e => setMatForm(p => ({ ...p, item_name: e.target.value }))} />
                <div className="flex gap-2">
                  <input type="number" className="input text-sm flex-1" placeholder="Quantity" value={matForm.quantity} onChange={e => setMatForm(p => ({ ...p, quantity: e.target.value }))} />
                  <input className="input text-sm w-24" placeholder="Unit" value={matForm.unit} onChange={e => setMatForm(p => ({ ...p, unit: e.target.value }))} />
                </div>
                <button onClick={addMaterial} className="w-full py-2 rounded-xl bg-orange-500/20 text-orange-400 font-medium text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                  <Plus size={14} /> Add Material
                </button>
              </div>

              {materials.length > 0 && (
                <div className="space-y-1.5">
                  {materials.map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-surface-400 rounded-xl">
                      <div>
                        <p className="text-white text-sm font-medium">{m.item_name}</p>
                        <p className="text-gray-500 text-xs">{m.quantity} {m.unit}</p>
                      </div>
                      <button onClick={() => removeMaterial(i)} className="text-red-400 p-1"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Check-Out */}
          {taskCheckedIn && (
            <div className="card space-y-3">
              <p className="text-white font-semibold text-sm">Labour Check-Out</p>
              {materials.length > 0 && (
                <>
                  <p className="text-gray-400 text-xs">Checkout photo required (materials were used)</p>
                  <PhotoCapture value={checkOutPhoto} onChange={setCheckOutPhoto} label="Checkout site photo" />
                </>
              )}
              <button onClick={handleCheckOut} disabled={checkingOut}
                className="w-full py-4 rounded-2xl bg-green-500/20 border border-green-500/30 text-green-400 font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                {checkingOut ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                {checkingOut ? 'Processing...' : 'Record Labour Check-Out'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 5: Day Completion & Report ───────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <p className="text-purple-400 font-semibold">Step 5 — Day Completion</p>
            <p className="text-gray-400 text-xs mt-0.5">Review summary and generate daily report</p>
          </div>

          {reportDone ? (
            <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-center space-y-3">
              <CheckCircle size={48} className="text-green-400 mx-auto" />
              <p className="text-green-400 font-bold text-lg">Report Submitted!</p>
              <p className="text-gray-400 text-sm">Daily report saved and admin notified.</p>
              <button onClick={() => { setStep(1); setFilterSite(''); setLabour([]); setAttendance({}); setCheckInPhoto(''); setCheckOutPhoto(''); setMaterials([]); setTaskCheckedIn(false); setTaskDone(false); setReportDone(false) }}
                className="btn-primary mx-auto">Start New Day</button>
            </div>
          ) : (
            <>
              {/* Attendance Summary */}
              <div className="card">
                <p className="text-white font-semibold mb-3">Attendance Summary</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-green-500/10 rounded-xl text-center"><p className="text-green-400 font-bold text-xl">{presentCount}</p><p className="text-gray-400 text-xs">Present</p></div>
                  <div className="p-3 bg-primary-500/10 rounded-xl text-center"><p className="text-primary-400 font-bold text-xl">{halfCount}</p><p className="text-gray-400 text-xs">Half Day</p></div>
                  <div className="p-3 bg-red-500/10 rounded-xl text-center"><p className="text-red-400 font-bold text-xl">{absentCount}</p><p className="text-gray-400 text-xs">Absent</p></div>
                </div>
              </div>

              {/* Photos Preview */}
              {(checkInPhoto || checkOutPhoto) && (
                <div className="card">
                  <p className="text-white font-semibold mb-3">Site Photos</p>
                  <div className="grid grid-cols-2 gap-2">
                    {checkInPhoto && <div><p className="text-gray-500 text-xs mb-1">Check-In</p><img src={checkInPhoto} className="w-full h-24 object-cover rounded-xl" /></div>}
                    {checkOutPhoto && <div><p className="text-gray-500 text-xs mb-1">Check-Out</p><img src={checkOutPhoto} className="w-full h-24 object-cover rounded-xl" /></div>}
                  </div>
                </div>
              )}

              {/* Material Summary */}
              {materials.length > 0 && (
                <div className="card">
                  <p className="text-white font-semibold mb-3">Material Usage</p>
                  <div className="space-y-2">
                    {materials.map((m, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-surface-400 rounded-xl">
                        <p className="text-white text-sm">{m.item_name}</p>
                        <p className="text-orange-400 text-sm font-medium">{m.quantity} {m.unit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Status */}
              <div className="card">
                <p className="text-white font-semibold mb-3">Task Status</p>
                <div className="flex gap-3">
                  <button onClick={() => setTaskDone(true)}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${taskDone ? 'bg-green-500 text-white' : 'bg-surface-300 text-gray-400'}`}>
                    <CheckCircle size={16} className="inline mr-1" /> Done
                  </button>
                  <button onClick={() => setTaskDone(false)}
                    className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${!taskDone ? 'bg-orange-500/30 text-orange-400' : 'bg-surface-300 text-gray-400'}`}>
                    <Clock size={16} className="inline mr-1" /> In Progress
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button onClick={handleGenerateReport} disabled={reportSaving}
                className="btn-primary w-full py-4 sticky bottom-24 shadow-xl shadow-primary-500/20">
                {reportSaving ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                {reportSaving ? 'Generating Report...' : 'Generate & Submit Daily Report'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Transfer Modal ─────────────────────────────────────────────────── */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)} title={`Transfer ${transferLabour?.name}`}>
        <div className="space-y-4">
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-300">
            <p>Transferring <strong>{transferLabour?.name}</strong> to another site.</p>
          </div>
          <div>
            <label className="label">Transfer To Site *</label>
            <select className="select" value={transferForm.to_site_id} onChange={e => setTransferForm(p => ({ ...p, to_site_id: e.target.value }))}>
              <option value="">Select destination site</option>
              {otherSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (days)</label>
            <input type="number" className="input" min={1} value={transferForm.duration_days} onChange={e => setTransferForm(p => ({ ...p, duration_days: e.target.value }))} />
          </div>
          <div>
            <label className="label">Reason / Note</label>
            <textarea className="input" rows={3} placeholder="Reason for transfer..." value={transferForm.reason} onChange={e => setTransferForm(p => ({ ...p, reason: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setTransferModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleTransfer} disabled={transferring} className="btn-primary flex-1">
              {transferring ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
              {transferring ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
