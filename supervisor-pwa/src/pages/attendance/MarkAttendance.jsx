import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Upload, Check, X, ChevronRight, Users, MapPin,
  Calendar, Plus, Trash2, CheckCircle, Clock,
  ArrowRight, ArrowLeft, RefreshCw, FileText
} from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

// ─── StepBar ────────────────────────────────────────────────────────────────
function StepBar({ current }) {
  const steps = [
    { n: 1, label: 'Site' },
    { n: 2, label: 'Attendance' },
    { n: 3, label: 'Check-In' },
    { n: 4, label: 'Tasks' },
    { n: 5, label: 'Report' },
  ]
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-surface-300 border-b border-white/10">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
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

// ─── MarkAttendance ──────────────────────────────────────────────────────────
export default function MarkAttendance() {
  const navigate = useNavigate()

  // ── Step
  const [step, setStep] = useState(1)

  // ── Step 1: Site & Date
  const [sites, setSites] = useState([])
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
  const [materials, setMaterials] = useState([])
  const [matName, setMatName] = useState('')
  const [matQty, setMatQty] = useState('')
  const [matUnit, setMatUnit] = useState('')
  // Per-labour checkout photos (mandatory)
  // { [labour_id]: cloudinaryUrl }
  const [checkoutPhotos, setCheckoutPhotos] = useState({})
  // { [labour_id]: true } while uploading
  const [uploadingCheckout, setUploadingCheckout] = useState({})
  const [taskStatus, setTaskStatus] = useState('completed')
  const [savingCheckOut, setSavingCheckOut] = useState(false)

  // ── Step 5: Report
  const [reportTaskStatus, setReportTaskStatus] = useState('done')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)

  // ── Transfer Modal
  const [transferModal, setTransferModal] = useState({ open: false, labour: null })
  const [transferSite, setTransferSite] = useState('')
  const [transferring, setTransferring] = useState(false)

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
    form.append('image', file)
    const res = await api.post('/upload/single', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data?.url || res.data?.data?.url || ''
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
            task_status: taskStatus,
            materials,
          })
        )
      )
      toast.success('Day completed')
      setStep(5)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to complete day')
    } finally {
      setSavingCheckOut(false)
    }
  }

  // ── Submit daily report
  const submitReport = async () => {
    setSubmittingReport(true)
    try {
      const firstCheckinPhoto = Object.values(checkinPhotos)[0] || null
      const firstCheckoutPhoto = Object.values(checkoutPhotos)[0] || null
      await api.post('/visit-reports', {
        site_id: selectedSite,
        date: attendanceDate,
        present_count: presentCount,
        half_day_count: halfDayCount,
        absent_count: absentCount,
        checkin_photo: firstCheckinPhoto,
        checkout_photo: firstCheckoutPhoto,
        materials,
        task_status: reportTaskStatus,
      })
      setReportSubmitted(true)
      toast.success('Report submitted!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit report')
    } finally {
      setSubmittingReport(false)
    }
  }

  // ── Start new day
  const startNewDay = () => {
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
    setTaskCheckedIn(false)
    setMaterials([])
    setMatName('')
    setMatQty('')
    setMatUnit('')
    setTaskStatus('completed')
    setReportTaskStatus('done')
    setReportSubmitted(false)
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
        <div className="page-content" style={{ paddingBottom: 80 }}>
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
        <div className="page-content" style={{ paddingBottom: 80 }}>
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
        <div className="page-content" style={{ paddingBottom: 80 }}>
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

            <p className="text-xs text-gray-500 mb-3">
              Check-in photo is optional per labour. Tap camera or upload to add.
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
                return (
                  <div key={id} className="card-sm flex items-center gap-3">
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
            disabled={savingCheckIn}
          >
            {savingCheckIn ? 'Saving...' : 'Record Check-In & Continue'}
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ── STEP 4: Task Execution + Per-Labour Checkout Photos ── */}
      {step === 4 && (
        <div className="page-content" style={{ paddingBottom: 80 }}>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setStep(3)} className="btn-ghost p-1">
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-base font-bold text-white">Task Execution</h2>
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
                  <input
                    className="input text-white"
                    placeholder="bags / pcs / kg"
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                  />
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
                    key={i}
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
            <label className="label">Task Status</label>
            <div className="flex gap-2">
              {['completed', 'pending'].map((s) => (
                <button
                  key={s}
                  onClick={() => setTaskStatus(s)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium min-h-[44px] transition-all ${
                    taskStatus === s
                      ? s === 'completed'
                        ? 'bg-green-500/30 text-green-400 border border-green-500/50'
                        : 'bg-yellow-500/30 text-yellow-400 border border-yellow-500/50'
                      : 'bg-surface-400 text-gray-500 border border-white/5'
                  }`}
                >
                  {s === 'completed' ? 'Completed' : 'Pending'}
                </button>
              ))}
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
              <div className="space-y-2">
                {presentLabours.map((l) => {
                  const id = l._id || l.id
                  const checkinThumb = checkinPhotos[id]
                  return (
                    <div key={id} className="flex items-center gap-3 bg-surface-400 rounded-xl px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {l.name || l.labour_name}
                        </p>
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

      {/* ── STEP 5: Day Completion & Report ── */}
      {step === 5 && (
        <div className="page-content" style={{ paddingBottom: 80 }}>
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
                className="btn-primary w-full flex items-center justify-center gap-2 min-h-[44px] mt-4"
                onClick={startNewDay}
              >
                <RefreshCw size={18} />
                Start New Day
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
                          key={i}
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
                {submittingReport ? 'Submitting...' : 'Generate & Submit Daily Report'}
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
            style={{ paddingBottom: 80 }}
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
