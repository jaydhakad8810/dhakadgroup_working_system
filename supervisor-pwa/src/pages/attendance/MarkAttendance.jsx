import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowRightLeft,
  Camera,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
  Users,
  XCircle
} from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { EmptyState, Modal } from '../../components/ui'

// upload helper
async function uploadPhoto(file, folder = 'attendance') {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', folder)
  const { data } = await api.post('/upload/single', fd)
  return data.url
}

// StepBar
function StepBar({ step }) {
  const steps = ['Site', 'Attendance', 'Check-In', 'Task', 'Report']
  return (
    <div className="flex justify-between mb-4">
      {steps.map((label, i) => (
        <div key={i} className="text-center flex-1">
          <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold
            ${i + 1 <= step ? 'bg-primary-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
            {i + 1}
          </div>
          <p className="text-xs mt-1">{label}</p>
        </div>
      ))}
    </div>
  )
}

// PhotoCapture
function PhotoCapture({ preview, onSelect }) {
  return preview ? (
    <img src={preview} className="w-full h-40 object-cover rounded-xl" />
  ) : (
    <input type="file" onChange={e => onSelect(e.target.files[0])} />
  )
}

// MAIN
export default function MarkAttendance() {
  const [searchParams] = useSearchParams()
  const today = new Date().toISOString().split('T')[0]

  const [step, setStep] = useState(1)
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(searchParams.get('site_id') || '')
  const [date, setDate] = useState(today)

  const [labour, setLabour] = useState([])
  const [attendance, setAttendance] = useState({})

  const [checkInPreview, setCheckInPreview] = useState('')
  const [checkInUrl, setCheckInUrl] = useState('')

  const [checkoutPreview, setCheckoutPreview] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')

  const [materials, setMaterials] = useState([{ item: '', qty: '', unit: '' }])
  const [taskStatus, setTaskStatus] = useState('pending')

  const [transferModal, setTransferModal] = useState(false)
  const [transferLabour, setTransferLabour] = useState(null)

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedSite) return
    api.get(`/labour?site_id=${selectedSite}`)
      .then(r => setLabour(r.data))
      .catch(() => {})
  }, [selectedSite])

  const setStatus = (id, status) => {
    setAttendance(p => ({ ...p, [id]: status }))
  }

  const markAll = (status) => {
    const m = {}
    labour.forEach(l => m[l.id] = status)
    setAttendance(m)
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const halfCount = Object.values(attendance).filter(v => v === 'half_day').length
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length

  const handleCheckIn = async (file) => {
    const url = await uploadPhoto(file)
    setCheckInPreview(URL.createObjectURL(file))
    setCheckInUrl(url)
  }

  const handleCheckout = async (file) => {
    const url = await uploadPhoto(file)
    setCheckoutPreview(URL.createObjectURL(file))
    setCheckoutUrl(url)
  }

  const addMaterial = () => setMaterials(p => [...p, { item: '', qty: '', unit: '' }])
  const removeMaterial = (i) => setMaterials(p => p.filter((_, idx) => idx !== i))

  return (
    <div className="page-content space-y-4">
      <StepBar step={step} />

      {/* STEP 1 */}
      {step === 1 && (
        <>
          <select value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
            <option value="">Select Site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <input type="date" value={date} onChange={e => setDate(e.target.value)} />

          <button onClick={() => setStep(2)}>Continue</button>
        </>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <>
          <button onClick={() => markAll('present')}>All Present</button>

          {!labour.length ? (
            <EmptyState icon={Users} title="No labour" message="No workers" />
          ) : labour.map(l => (
            <div key={l.id}>
              <p>{l.name}</p>
              <button onClick={() => setStatus(l.id, 'present')}>P</button>
              <button onClick={() => setStatus(l.id, 'half_day')}>H</button>
              <button onClick={() => setStatus(l.id, 'absent')}>A</button>
              <button onClick={() => { setTransferLabour(l); setTransferModal(true) }}>
                <ArrowRightLeft size={14} />
              </button>
            </div>
          ))}

          <button onClick={() => setStep(3)}>Next</button>
        </>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <>
          <PhotoCapture preview={checkInPreview} onSelect={handleCheckIn} />
          <button onClick={() => setStep(4)}>Next</button>
        </>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <>
          {materials.map((m, i) => (
            <div key={i}>
              <input placeholder="Item" value={m.item} onChange={e => {
                const copy = [...materials]; copy[i].item = e.target.value; setMaterials(copy)
              }} />
              <input placeholder="Qty" value={m.qty} onChange={e => {
                const copy = [...materials]; copy[i].qty = e.target.value; setMaterials(copy)
              }} />
              <input placeholder="Unit" value={m.unit} onChange={e => {
                const copy = [...materials]; copy[i].unit = e.target.value; setMaterials(copy)
              }} />
              <button onClick={() => removeMaterial(i)}><Trash2 size={12} /></button>
            </div>
          ))}
          <button onClick={addMaterial}><Plus size={12} /></button>

          <PhotoCapture preview={checkoutPreview} onSelect={handleCheckout} />

          <button onClick={() => setStep(5)}>
            <LogOut size={16} /> Checkout
          </button>
        </>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <>
          <p>Present: {presentCount}</p>
          <p>Half: {halfCount}</p>
          <p>Absent: {absentCount}</p>

          <button onClick={() => toast.success('Report Generated')}>
            <FileText size={16} /> Generate Report
          </button>
        </>
      )}

      {/* TRANSFER MODAL */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)}>
        <div>
          <p>Transfer {transferLabour?.name}</p>
          <button onClick={() => setTransferModal(false)}>Close</button>
        </div>
      </Modal>
    </div>
  )
}