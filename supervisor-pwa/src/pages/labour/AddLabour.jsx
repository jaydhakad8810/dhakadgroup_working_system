import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Loader2, X } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

// Inline upload helper
const uploadPhoto = async (file, folder) => {
  const fd = new FormData(); fd.append('file', file); fd.append('folder', folder)
  const { data } = await api.post('/upload/single', fd)
  return data.url
}

function PhotoField({ label, value, onChange, folder, capture = 'environment' }) {
  const [uploading, setUploading] = useState(false)
  const handle = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    try { const url = await uploadPhoto(file, folder); onChange(url); toast.success('Uploaded!') }
    catch { toast.error('Upload failed') }
    setUploading(false)
  }
  return (
    <div>
      <label className="label">{label}</label>
      <label className="flex items-center gap-3 p-3 bg-surface-400 border border-white/10 rounded-xl cursor-pointer active:scale-95 transition-transform">
        {uploading ? <Loader2 size={20} className="animate-spin text-primary-500 flex-shrink-0" />
          : value
            ? <img src={value} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt={label} />
            : <Camera size={20} className="text-gray-500 flex-shrink-0" />
        }
        <div className="flex-1">
          <p className="text-sm text-white">{uploading ? 'Uploading...' : value ? 'Tap to change' : `Upload ${label}`}</p>
          <p className="text-xs text-gray-500">Camera or gallery</p>
        </div>
        {value && <a href={value} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-primary-400 text-xs">View</a>}
        {!uploading && <input type="file" accept="image/*" className="hidden" onChange={handle} capture={capture} />}
      </label>
    </div>
  )
}

export default function AddLabour() {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ labour_type: 'unskilled', daily_wage: '' })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => { api.get('/sites').then(r => setSites(r.data)).catch(() => {}) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name?.trim()) return toast.error('Name is required')
    if (!form.daily_wage) return toast.error('Daily wage is required')
    setSaving(true)
    try {
      await api.post('/labour', form)
      toast.success('Labour added!')
      navigate('/labour')
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  return (
    <div className="page-content space-y-4">
      {/* Profile Photo */}
      <div className="flex justify-center">
        <PhotoField label="Profile Photo" value={form.photo} onChange={v => f('photo', v)} folder="dgsystem/labour" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic */}
        <div><label className="label">Full Name *</label><input className="input" required value={form.name || ''} onChange={e => f('name', e.target.value)} placeholder="Ramesh Kumar" /></div>
        <div><label className="label">Nickname</label><input className="input" value={form.nickname || ''} onChange={e => f('nickname', e.target.value)} placeholder="Optional" /></div>
        <div><label className="label">Phone</label><input className="input" type="tel" value={form.phone || ''} onChange={e => f('phone', e.target.value)} placeholder="10-digit" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Daily Wage (₹) *</label><input className="input" type="number" required value={form.daily_wage} onChange={e => f('daily_wage', e.target.value)} placeholder="500" /></div>
          <div><label className="label">Type</label>
            <select className="select" value={form.labour_type} onChange={e => f('labour_type', e.target.value)}>
              <option value="unskilled">Unskilled</option><option value="skilled">Skilled</option>
            </select>
          </div>
        </div>
        <div><label className="label">Skill Type</label><input className="input" value={form.skill_type || ''} onChange={e => f('skill_type', e.target.value)} placeholder="Mason, Carpenter, Plumber..." /></div>
        <div><label className="label">Assign Site</label>
          <select className="select" value={form.assigned_site_id || ''} onChange={e => f('assigned_site_id', e.target.value)}>
            <option value="">Select Site</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address || ''} onChange={e => f('address', e.target.value)} /></div>
        <div><label className="label">Emergency Contact</label><input className="input" type="tel" value={form.emergency_contact || ''} onChange={e => f('emergency_contact', e.target.value)} /></div>

        {/* Identity */}
        <div className="p-4 bg-surface-400 rounded-2xl space-y-4">
          <p className="text-white font-semibold text-sm">Identity Documents</p>
          <div><label className="label">Aadhar Number</label><input className="input" value={form.aadhar_number || ''} onChange={e => f('aadhar_number', e.target.value)} placeholder="12-digit Aadhar" /></div>
          <PhotoField label="Aadhar Photo" value={form.aadhar_photo} onChange={v => f('aadhar_photo', v)} folder="dgsystem/labour-docs" />
          <div><label className="label">PAN Number</label><input className="input" value={form.pan_number || ''} onChange={e => f('pan_number', e.target.value)} /></div>
          <div><label className="label">Custom Document Name</label><input className="input" value={form.custom_doc_name || ''} onChange={e => f('custom_doc_name', e.target.value)} placeholder="e.g. Driving License" /></div>
          <PhotoField label="Custom Document Photo" value={form.custom_doc_photo} onChange={v => f('custom_doc_photo', v)} folder="dgsystem/labour-docs" />
        </div>

        {/* Bank */}
        <div className="p-4 bg-surface-400 rounded-2xl space-y-4">
          <p className="text-white font-semibold text-sm">Bank Details</p>
          <div><label className="label">Account Number</label><input className="input" value={form.bank_account || ''} onChange={e => f('bank_account', e.target.value)} /></div>
          <div><label className="label">IFSC Code</label><input className="input" value={form.bank_ifsc || ''} onChange={e => f('bank_ifsc', e.target.value)} /></div>
          <div><label className="label">Bank Name</label><input className="input" value={form.bank_name || ''} onChange={e => f('bank_name', e.target.value)} /></div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-4">
          {saving ? <Loader2 size={18} className="animate-spin" /> : null}
          {saving ? 'Saving...' : 'Add Labour'}
        </button>
      </form>
    </div>
  )
}
