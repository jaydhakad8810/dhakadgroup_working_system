import { Fragment, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowRightLeft, Camera, CheckCircle, ChevronRight,
  Clock, Download, FileText, Loader2, LogOut,
  Play, Plus, Save, Trash2, Users, X, XCircle
} from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { EmptyState, Modal } from '../../components/ui'

// ─── upload helper ─────────────────────────────────────────────────────────
async function uploadPhoto(file, folder = 'attendance') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', folder)
  const { data } = await api.post('/upload/single', fd)
  return data.url
}

// ─── StepBar ───────────────────────────────────────────────────────────────
function StepBar({ current }) {
  const steps = ['Site', 'Attendance', 'Check-In', 'Task', 'Report']
  return (
    <div className="flex items-center px-1 mb-5">
      {steps.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <Fragment key={n}>
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${done ? 'bg-green-500 text-white' : active ? 'bg-primary-500 text-white ring-2 ring-primary-500/30' : 'bg-surface-300 text-gray-500'}`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-[10px] mt-0.5 whitespace-nowrap
                ${active ? 'text-primary-400 font-medium' : done ? 'text-green-400' : 'text-gray-600'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-4 ${done ? 'bg-green-500/40' : 'bg-white/10'}`} />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

// ─── PhotoCapture ──────────────────────────────────────────────────────────
function PhotoCapture({ label, preview, onSelect, uploading, onClear }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      {preview ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={preview} alt="" className="w-full h-44 object-cover" />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-primary-500" />
            </div>
          )}
          {!uploading && (
            <button type="button" onClick={onClear}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center">
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-white/20 rounded-xl cursor-pointer active:border-primary-500/60 transition-colors bg-surface-400">
          <Camera size={28} className="text-gray-500 mb-2" />
          <span className="text-gray-500 text-sm">Tap to capture or upload</span>
          <input type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files[0]) onSelect(e.target.files[0]) }} />
        </label>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function MarkAttendance() {
  const [searchParams] = useSearchParams()
  const today = new Date().toISOString().split('T')[0]

  const [step, setStep] = useState(1)

  // Step 1
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(searchParams.get('site_id') || '')
  const [selectedDate, setSelectedDate] = useState(today)
  const [labourLoading, setLabourLoading] = useState(false)

  // Step 2
  const [labourList, setLabourList] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [bulkRecords, setBulkRecords] = useState([])

  // Step 3
  const [checkInPreview, setCheckInPreview] = useState('')
  const [checkInPhotoUrl, setCheckInPhotoUrl] = useState('')
  const [uploadingCheckIn, setUploadingCheckIn] = useState(false)
  const [taskNotes, setTaskNotes] = useState({})
  const [recordingCheckIn, setRecordingCheckIn] = useState(false)

  // Step 4
  const [taskStartTime, setTaskStartTime] = useState('')
  const [materials, setMaterials] = useState([{ item: '', qty: '', unit: 'nos' }])
  const [checkoutPreview, setCheckoutPreview] = useState('')
  const [checkoutPhotoUrl, setCheckoutPhotoUrl] = useState('')
  const [uploadingCheckout, setUploadingCheckout] = useState(false)
  const [taskStatus, setTaskStatus] = useState('pending')
  const [recordingCheckout, setRecordingCheckout] = useState(false)

  // Step 5
  const [generatedReport, setGeneratedReport] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(false)

  // Transfer modal
  const [transferModal, setTransferModal] = useState(false)
  const [transferLabour, setTransferLabour] = useState(null)
  const [transferForm, setTransferForm] = useState({ to_site_id: '', reason: '', duration_days: 1 })
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  // Derived
  const presentCount = Object.values(attendanceMap).filter(v => v === 'present').length
  const halfCount = Object.values(attendanceMap).filter(v => v === 'half_day').length
  const absentCount = Object.values(attendanceMap).filter(v => v === 'absent').length
  const otherSites = sites.filter(s => s.id !== selectedSite)
  const activeLabour = labourList.filter(l => ['present', 'half_day'].includes(attendanceMap[l.id]))

  // ── Step 1 → 2
  const handleStep1Continue = async () => {
    if (!selectedSite) return toast.error('Select a site first')
    setLabourLoading(true)
    try {
      const [lRes, aRes] = await Promise.all([
        api.get(`/labour?site_id=${selectedSite}&is_active=true`),
        api.get(`/attendance?site_id=${selectedSite}&date=${selectedDate}`)
      ])
      setLabourList(lRes.data)
      const map = {}
      aRes.data.forEach(r => { map[r.labour_id] = r.status })
      setAttendanceMap(map)
      setStep(2)
    } catch {
      toast.error('Failed to load labour')
    }
    setLabourLoading(false)
  }

  const setStatus = (id, status) =>
    setAttendanceMap(p => ({ ...p, [id]: p[id] === status ? undefined : status }))

  const markAll = (status) => {
    const m = {}
    labourList.forEach(l => { m[l.id] = status })
    setAttendanceMap(m)
  }

  // ── Step 2 → 3
  const handleSaveAttendance = async () => {
    const records = labourList.map(l => ({
      labour_id: l.id,
      status: attendanceMap[l.id] || 'absent',
      day_multiplier: attendanceMap[l.id] === 'half_day' ? 0.5 : 1
    }))
    setSavingAttendance(true)
    try {
      const res = await api.post('/attendance/bulk', { site_id: selectedSite, date: selectedDate, records })
      setBulkRecords(res.data)
      toast.success(`Attendance saved for ${records.length} workers!`)
      setStep(3)
    } catch {
      toast.error('Failed to save attendance')
    }
    setSavingAttendance(false)
  }

  // Check-in photo upload on select
  const handleCheckInPhotoSelect = async (file) => {
    setCheckInPreview(URL.createObjectURL(file))
    setUploadingCheckIn(true)
    try {
      const url = await uploadPhoto(file, 'attendance/checkin')
      setCheckInPhotoUrl(url)
    } catch {
      toast.error('Photo upload failed')
      setCheckInPreview('')
    }
    setUploadingCheckIn(false)
  }

  // ── Step 3 → 4
  const handleRecordCheckIn = async () => {
    if (uploadingCheckIn) return toast.error('Photo still uploading, please wait')
    setRecordingCheckIn(true)
    try {
      const now = new Date().toISOString()
      await Promise.all(activeLabour.map(l =>
        api.post('/attendance', {
          labour_id: l.id,
          site_id: selectedSite,
          date: selectedDate,
          check_in_time: now,
          ...(checkInPhotoUrl ? { check_in_photo: checkInPhotoUrl } : {})
        })
      ))
      toast.success('Check-in recorded!')
      setStep(4)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed')
    }
    setRecordingCheckIn(false)
  }

  // Material row helpers
  const addMaterial = () => setMaterials(p => [...p, { item: '', qty: '', unit: 'nos' }])
  const removeMaterial = (i) => setMaterials(p => p.filter((_, idx) => idx !== i))
  const updateMaterial = (i, field, val) =>
    setMaterials(p => p.map((m, idx) => idx === i ? { ...m, [field]: val } : m))

  // Checkout photo upload on select
  const handleCheckoutPhotoSelect = async (file) => {
    setCheckoutPreview(URL.createObjectURL(file))
    setUploadingCheckout(true)
    try {
      const url = await uploadPhoto(file, 'attendance/checkout')
      setCheckoutPhotoUrl(url)
    } catch {
      toast.error('Checkout photo upload failed')
      setCheckoutPreview('')
    }
    setUploadingCheckout(false)
  }

  // ── Step 4 → 5
  const handleCheckout = async () => {
    if (uploadingCheckout) return toast.error('Photo still uploading, please wait')
    setRecordingCheckout(true)
    try {
      const activeRecords = bulkRecords.filter(r => ['present', 'half_day'].includes(r.status))
      if (activeRecords.length > 0) {
        await Promise.all(activeRecords.map(r =>
          api.patch(`/attendance/${r.id}/checkout`, {
            ...(checkoutPhotoUrl ? { check_out_photo: checkoutPhotoUrl } : {})
          })
        ))
      }
      toast.success('Checkout recorded!')
      setStep(5)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed')
    }
    setRecordingCheckout(false)
  }

  // ── Generate Report
  const handleGenerateReport = async () => {
    setGeneratingReport(true)
    try {
      const siteName = sites.find(s => s.id === selectedSite)?.name || ''
      const activeMaterials = materials.filter(m => m.item)
      const materialsText = activeMaterials.map(m => `${m.item}: ${m.qty} ${m.unit}`).join(', ')
      const tasks = []
      labourList.forEach(l => {
        if (taskNotes[l.id]) {
          tasks.push({ task: `${l.name}: ${taskNotes[l.id]}`, status: taskStatus === 'completed' ? 'done' : 'in_progress' })
        }
      })
      if (activeMaterials.length > 0) {
        tasks.push({ task: `Materials Used: ${materialsText}`, status: 'done' })
      }
      const descParts = [
        `Attendance: ${presentCount} present, ${halfCount} half-day, ${absentCount} absent`,
        taskStartTime ? `Task started at: ${taskStartTime}` : null,
        materialsText ? `Materials: ${materialsText}` : null
      ].filter(Boolean)
      const photos = [checkInPhotoUrl, checkoutPhotoUrl].filter(Boolean)
      const res = await api.post('/visit-reports', {
        site_id: selectedSite,
        title: `Daily Report - ${siteName} - ${selectedDate}`,
        report_date: selectedDate,
        labour_count: activeLabour.length,
        description: descParts.join('\n'),
        status: taskStatus === 'completed' ? 'closed' : 'in_progress',
        photos,
        tasks
      })
      setGeneratedReport(res.data)
      try {
        await api.post('/notifications', {
          title: 'Daily Report Submitted',
          message: `${siteName} report for ${selectedDate} submitted`,
          type: 'info',
          target_role: 'admin'
        })
      } catch {}
      toast.success('Report generated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report')
    }
    setGeneratingReport(false)
  }

  // ── Export CSV
  const exportCSV = () => {
    const siteName = sites.find(s => s.id === selectedSite)?.name || ''
    const activeMaterials = materials.filter(m => m.item)
    const rows = [
      [`DGSystem Daily Report - ${siteName} - ${selectedDate}`],
      [],
      ['Name', 'Status', 'Daily Wage', 'Task Note'],
      ...labourList.map(l => [
        l.name,
        attendanceMap[l.id] || 'absent',
        l.daily_wage,
        (taskNotes[l.id] || '').replace(/,/g, ';')
      ])
    ]
    if (activeMaterials.length > 0) {
      rows.push([], ['Material', 'Quantity', 'Unit'])
      activeMaterials.forEach(m => rows.push([m.item, m.qty, m.unit]))
    }
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Export PDF (print window)
  const exportPDF = () => {
    const siteName = sites.find(s => s.id === selectedSite)?.name || ''
    const activeMaterials = materials.filter(m => m.item)
    const statusColor = taskStatus === 'completed' ? '#16a34a' : '#f97316'
    const statusBg = taskStatus === 'completed' ? '#dcfce7' : '#fff7ed'
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Daily Report - ${siteName}</title>
<style>
body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#333}
h1{color:#f97316;border-bottom:2px solid #f97316;padding-bottom:10px}
h2{color:#555;margin-top:24px}
table{width:100%;border-collapse:collapse;margin:10px 0}
th{background:#f97316;color:white;padding:8px 12px;text-align:left}
td{border:1px solid #ddd;padding:8px 12px}
tr:nth-child(even){background:#f9f9f9}
.meta{display:flex;gap:40px;margin:20px 0;flex-wrap:wrap}
.meta div{flex:1;min-width:140px}
.meta strong{display:block;color:#555;margin-bottom:4px}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-weight:bold;background:${statusBg};color:${statusColor}}
img{max-width:100%;border-radius:8px;margin:10px 0}
.photos{display:flex;gap:20px;flex-wrap:wrap}
.photos>div{flex:1;min-width:200px}
</style></head><body>
<h1>Daily Site Report</h1>
<div class="meta">
  <div><strong>Site</strong>${siteName}</div>
  <div><strong>Date</strong>${selectedDate}</div>
  <div><strong>Task Status</strong><span class="badge">${taskStatus === 'completed' ? 'Completed' : 'In Progress'}</span></div>
</div>
${taskStartTime ? `<p><strong>Task Started:</strong> ${taskStartTime}</p>` : ''}
<h2>Attendance Summary</h2>
<p>Present: <strong>${presentCount}</strong> &nbsp;|&nbsp; Half Day: <strong>${halfCount}</strong> &nbsp;|&nbsp; Absent: <strong>${absentCount}</strong></p>
<table>
<tr><th>Name</th><th>Status</th><th>Daily Wage</th><th>Task Note</th></tr>
${labourList.map(l => `<tr><td>${l.name}</td><td>${attendanceMap[l.id] || 'absent'}</td><td>&#8377;${l.daily_wage}</td><td>${taskNotes[l.id] || '&#8212;'}</td></tr>`).join('')}
</table>
${activeMaterials.length > 0 ? `<h2>Materials Used</h2><table>
<tr><th>Item</th><th>Quantity</th><th>Unit</th></tr>
${activeMaterials.map(m => `<tr><td>${m.item}</td><td>${m.qty}</td><td>${m.unit}</td></tr>`).join('')}
</table>` : ''}
${checkInPhotoUrl || checkoutPhotoUrl ? `<h2>Photos</h2><div class="photos">
${checkInPhotoUrl ? `<div><strong>Check-In</strong><br/><img src="${checkInPhotoUrl}"/></div>` : ''}
${checkoutPhotoUrl ? `<div><strong>Check-Out</strong><br/><img src="${checkoutPhotoUrl}"/></div>` : ''}
</div>` : ''}
<p style="color:#999;font-size:12px;margin-top:40px">Generated by DGSystem &middot; ${new Date().toLocaleString()}</p>
<script>window.onload=function(){window.print()}<\/script>
</body></html>`
    const w = window.open('', '_blank', 'width=900,height=700')
    if (w) { w.document.write(html); w.document.close() }
  }

  // Transfer handlers
  const openTransfer = (l) => {
    setTransferLabour(l)
    setTransferForm({ to_site_id: '', reason: '', duration_days: 1 })
    setTransferModal(true)
  }

  const handleTransfer = async () => {
    if (!transferForm.to_site_id) return toast.error('Select destination site')
    setTransferring(true)
    try {
      await api.post('/attendance/transfer', {
        labour_id: transferLabour.id,
        from_site_id: selectedSite,
        to_site_id: transferForm.to_site_id,
        reason: transferForm.reason,
        duration_days: transferForm.duration_days,
        transfer_date: selectedDate
      })
      toast.success(`${transferLabour.name} transferred successfully!`)
      setTransferModal(false)
      const res = await api.get(`/labour?site_id=${selectedSite}&is_active=true`)
      setLabourList(res.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed')
    }
    setTransferring(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="page-content space-y-4">
      <StepBar current={step} />

      {/* ── STEP 1: Select Site ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="label">Select Site *</label>
            <select className="select" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
              <option value="">Choose a site...</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)} max={today} />
          </div>
          <button onClick={handleStep1Continue} disabled={!selectedSite || labourLoading}
            className="btn-primary w-full py-4">
            {labourLoading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
            {labourLoading ? 'Loading...' : 'Continue'}
          </button>
        </div>
      )}

      {/* ── STEP 2: Mark Attendance ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
              <p className="text-green-400 font-bold text-xl">{presentCount}</p>
              <p className="text-gray-400 text-xs">Present</p>
            </div>
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-center">
              <p className="text-primary-400 font-bold text-xl">{halfCount}</p>
              <p className="text-gray-400 text-xs">Half Day</p>
            </div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <p className="text-red-400 font-bold text-xl">{absentCount}</p>
              <p className="text-gray-400 text-xs">Absent</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => markAll('present')}
              className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 font-medium text-sm active:scale-95 transition-transform">
              All Present
            </button>
            <button onClick={() => markAll('absent')}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium text-sm active:scale-95 transition-transform">
              All Absent
            </button>
          </div>
          {!labourList.length
            ? <EmptyState icon={Users} title="No labour" message="No active labour on this site" />
            : (
              <div className="space-y-2">
                {labourList.map(l => {
                  const status = attendanceMap[l.id]
                  return (
                    <div key={l.id} className="card-sm">
                      <div className="flex items-center gap-3">
                        {l.photo
                          ? <img src={l.photo} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" />
                          : <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-lg flex-shrink-0">{l.name[0]}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{l.name}</p>
                          <p className="text-gray-500 text-xs">₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}/day</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setStatus(l.id, 'present')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'present' ? 'bg-green-500 text-white' : 'bg-surface-200 text-gray-500'}`}>
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => setStatus(l.id, 'half_day')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'half_day' ? 'bg-primary-500 text-white' : 'bg-surface-200 text-gray-500'}`}>
                            <Clock size={16} />
                          </button>
                          <button onClick={() => setStatus(l.id, 'absent')}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-surface-200 text-gray-500'}`}>
                            <XCircle size={16} />
                          </button>
                          <button onClick={() => openTransfer(l)}
                            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-200 text-gray-500 hover:text-primary-400 transition-all active:scale-95"
                            title="Transfer labour">
                            <ArrowRightLeft size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          }
          <button onClick={handleSaveAttendance} disabled={savingAttendance}
            className="btn-primary w-full py-4 sticky bottom-24 shadow-xl shadow-primary-500/20">
            {savingAttendance ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {savingAttendance ? 'Saving...' : `Save & Continue (${presentCount + halfCount} present)`}
          </button>
        </div>
      )}

      {/* ── STEP 3: Check-In Photo + Task Notes ─────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <PhotoCapture
            label="Site Check-In Photo"
            preview={checkInPreview}
            onSelect={handleCheckInPhotoSelect}
            uploading={uploadingCheckIn}
            onClear={() => { setCheckInPreview(''); setCheckInPhotoUrl('') }}
          />
          {activeLabour.length > 0 && (
            <div>
              <p className="label mb-3">Task Notes (optional per worker)</p>
              <div className="space-y-3">
                {activeLabour.map(l => (
                  <div key={l.id} className="card-sm">
                    <p className="text-white text-sm font-medium mb-2">{l.name}</p>
                    <textarea
                      className="input text-sm"
                      rows={2}
                      placeholder="Task assigned to this worker..."
                      value={taskNotes[l.id] || ''}
                      onChange={e => setTaskNotes(p => ({ ...p, [l.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleRecordCheckIn} disabled={recordingCheckIn || uploadingCheckIn}
            className="btn-primary w-full py-4 sticky bottom-24">
            {recordingCheckIn ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            {recordingCheckIn ? 'Recording...' : 'Record Check-In'}
          </button>
        </div>
      )}

      {/* ── STEP 4: Task + Materials + Checkout ─────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {/* PATH A */}
            <div className="card space-y-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Path A</p>
              <p className="text-white font-semibold text-sm">Task Check-In</p>
              {taskStartTime ? (
                <div className="text-center py-2">
                  <p className="text-green-400 text-xs mb-1">Task Started</p>
                  <p className="text-white font-bold text-sm">{taskStartTime}</p>
                </div>
              ) : (
                <button onClick={() => setTaskStartTime(new Date().toLocaleTimeString())}
                  className="btn-primary w-full py-3 text-sm">
                  <Play size={14} /> Start Task
                </button>
              )}
            </div>
            {/* PATH B */}
            <div className="card space-y-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Path B</p>
              <p className="text-white font-semibold text-sm">Materials</p>
              {materials.map((m, i) => (
                <div key={i} className="space-y-1">
                  <input className="input text-xs py-2" placeholder="Item name"
                    value={m.item} onChange={e => updateMaterial(i, 'item', e.target.value)} />
                  <div className="flex gap-1">
                    <input className="input text-xs py-2 w-14" placeholder="Qty" type="number" min="0"
                      value={m.qty} onChange={e => updateMaterial(i, 'qty', e.target.value)} />
                    <input className="input text-xs py-2 flex-1" placeholder="Unit"
                      value={m.unit} onChange={e => updateMaterial(i, 'unit', e.target.value)} />
                    {materials.length > 1 && (
                      <button onClick={() => removeMaterial(i)}
                        className="w-8 h-8 mt-0.5 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={addMaterial} className="btn-secondary w-full py-2 text-xs">
                <Plus size={12} /> Add Row
              </button>
            </div>
          </div>

          <PhotoCapture
            label="Checkout Photo"
            preview={checkoutPreview}
            onSelect={handleCheckoutPhotoSelect}
            uploading={uploadingCheckout}
            onClear={() => { setCheckoutPreview(''); setCheckoutPhotoUrl('') }}
          />

          <div>
            <label className="label">Task Status</label>
            <div className="flex gap-3">
              <button onClick={() => setTaskStatus('completed')}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                  ${taskStatus === 'completed' ? 'bg-green-500 text-white' : 'bg-surface-300 text-gray-400'}`}>
                <CheckCircle size={16} /> Completed
              </button>
              <button onClick={() => setTaskStatus('pending')}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2
                  ${taskStatus === 'pending' ? 'bg-primary-500 text-white' : 'bg-surface-300 text-gray-400'}`}>
                <Clock size={16} /> Pending
              </button>
            </div>
          </div>

          <button onClick={handleCheckout} disabled={recordingCheckout || uploadingCheckout}
            className="btn-primary w-full py-4 sticky bottom-24">
            {recordingCheckout ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
            {recordingCheckout ? 'Recording...' : 'Labour Check-Out'}
          </button>
        </div>
      )}

      {/* ── STEP 5: Day Completion ───────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="card text-center py-5">
            <p className="text-gray-400 text-sm mb-3">Task Status</p>
            <span className={`text-base font-bold px-5 py-1.5 rounded-full
              ${taskStatus === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-primary-500/20 text-primary-400'}`}>
              {taskStatus === 'completed' ? 'Done' : 'In Progress'}
            </span>
          </div>

          <div className="card space-y-3">
            <p className="text-white font-semibold">Attendance Summary</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                <p className="text-green-400 font-bold text-xl">{presentCount}</p>
                <p className="text-gray-400 text-xs">Present</p>
              </div>
              <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-center">
                <p className="text-primary-400 font-bold text-xl">{halfCount}</p>
                <p className="text-gray-400 text-xs">Half Day</p>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <p className="text-red-400 font-bold text-xl">{absentCount}</p>
                <p className="text-gray-400 text-xs">Absent</p>
              </div>
            </div>
          </div>

          {materials.filter(m => m.item).length > 0 && (
            <div className="card space-y-2">
              <p className="text-white font-semibold">Materials Used</p>
              {materials.filter(m => m.item).map((m, i) => (
                <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 last:border-0 py-1.5">
                  <span className="text-gray-300">{m.item}</span>
                  <span className="text-white font-medium">{m.qty} {m.unit}</span>
                </div>
              ))}
            </div>
          )}

          {!generatedReport ? (
            <button onClick={handleGenerateReport} disabled={generatingReport}
              className="btn-primary w-full py-4">
              {generatingReport ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
              {generatingReport ? 'Generating...' : 'Generate Report'}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="card bg-green-500/10 border-green-500/20 text-center py-5">
                <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-semibold">Report Generated!</p>
                <p className="text-gray-500 text-xs mt-1">Submitted successfully</p>
              </div>
              <div className="flex gap-3">
                <button onClick={exportPDF} className="btn-secondary flex-1">
                  <Download size={16} /> Export PDF
                </button>
                <button onClick={exportCSV} className="btn-secondary flex-1">
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Transfer Modal ───────────────────────────────────────────────── */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)}
        title={`Transfer ${transferLabour?.name}`}>
        <div className="space-y-4">
          <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-sm text-primary-300">
            Transferring <strong>{transferLabour?.name}</strong> from current site to another.
          </div>
          <div>
            <label className="label">Transfer To Site *</label>
            <select className="select" value={transferForm.to_site_id}
              onChange={e => setTransferForm(p => ({ ...p, to_site_id: e.target.value }))}>
              <option value="">Select destination site</option>
              {otherSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (days)</label>
            <input type="number" className="input" min={1} value={transferForm.duration_days}
              onChange={e => setTransferForm(p => ({ ...p, duration_days: e.target.value }))} />
          </div>
          <div>
            <label className="label">Reason / Note</label>
            <textarea className="input" rows={3} placeholder="Reason for transfer..."
              value={transferForm.reason}
              onChange={e => setTransferForm(p => ({ ...p, reason: e.target.value }))} />
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
