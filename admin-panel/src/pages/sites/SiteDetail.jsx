import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, MapPin } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, Modal, InfoRow } from '../../components/ui'
import { PhotoUpload } from '../../components/ui/PhotoUpload'
import toast from 'react-hot-toast'

export default function SiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [boqSummary, setBoqSummary] = useState(null)
  const [ledgerSummary, setLedgerSummary] = useState(null)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    try {
      const [s, b, l, u] = await Promise.all([
        api.get(`/sites/${id}`),
        api.get(`/boq/summary/${id}`).catch(() => ({ data: null })),
        api.get(`/ledger/summary/${id}`).catch(() => ({ data: null })),
        api.get('/users?role=supervisor')
      ])
      setSite(s.data); setForm(s.data)
      setBoqSummary(b.data); setLedgerSummary(l.data); setUsers(u.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const oldSupervisorId = site.supervisor_id
      const updated = await api.put(`/sites/${id}`, form)
      toast.success('Site updated')
      // If supervisor changed, show notification
      if (form.supervisor_id && form.supervisor_id !== oldSupervisorId) {
        toast.success('Supervisor reassigned. All labour transferred to new supervisor.')
      }
      setEditModal(false); load()
    } catch { toast.error('Save failed') }
    setSaving(false)
  }

  if (loading) return <LoadingPage />
  if (!site) return <div className="text-gray-400">Site not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/sites" className="btn-ghost"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{site.name}</h1>
            <StatusBadge status={site.status} />
            {site.contract_type && <span className="badge-blue capitalize">{site.contract_type.replace(/_/g, ' + ')}</span>}
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{site.organisation?.name}</p>
        </div>
        <button onClick={() => setEditModal(true)} className="btn-outline"><Edit size={16} />Edit</button>
      </div>

      {/* Site photo */}
      {site.raw_photo && <img src={site.raw_photo} className="w-full max-h-64 object-cover rounded-xl" alt="Site" />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card space-y-0 lg:col-span-2">
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Site Information</h3>
          <InfoRow label="Client" value={site.client_name} />
          <InfoRow label="Client Phone" value={site.client_phone} />
          <InfoRow label="Contract Value" value={site.contract_value ? `₹${parseFloat(site.contract_value).toLocaleString('en-IN')}` : null} valueClass="text-gold-400 font-semibold" />
          <InfoRow label="Supervisor" value={site.supervisor ? `${site.supervisor.name} (${site.supervisor.employee_id || ''})` : null} />
          <InfoRow label="Start Date" value={site.start_date} />
          <InfoRow label="Expected End" value={site.expected_end_date} />
          <InfoRow label="City" value={`${site.city || ''} ${site.state || ''}`.trim()} />
          {site.latitude && <InfoRow label="GPS" value={`${parseFloat(site.latitude).toFixed(4)}, ${parseFloat(site.longitude).toFixed(4)} (${site.gps_radius_meters}m radius)`} valueClass="text-green-400" />}
          {site.latitude && site.longitude && (
            <div className="py-2">
              <a href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                 target="_blank" rel="noreferrer"
                 className="btn-outline text-sm inline-flex items-center gap-1">
                🗺️ Open in Google Maps →
              </a>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {ledgerSummary && (
            <div className="card">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Financial Summary</h3>
              <InfoRow label="Credits" value={`₹${parseFloat(ledgerSummary.credits || 0).toLocaleString('en-IN')}`} valueClass="text-green-400" />
              <InfoRow label="Debits" value={`₹${parseFloat(ledgerSummary.debits || 0).toLocaleString('en-IN')}`} valueClass="text-red-400" />
              <InfoRow label="Expenses" value={`₹${parseFloat(ledgerSummary.total_expenses || 0).toLocaleString('en-IN')}`} valueClass="text-orange-400" />
              <InfoRow label="Balance" value={`₹${parseFloat(ledgerSummary.balance || 0).toLocaleString('en-IN')}`} valueClass="text-gold-400 font-bold" />
              <InfoRow label="Received" value={`₹${parseFloat(ledgerSummary.total_received || 0).toLocaleString('en-IN')}`} valueClass="text-blue-400" />
            </div>
          )}
          {boqSummary && (
            <div className="card">
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>BOQ Summary</h3>
              <InfoRow label="Estimated" value={`₹${parseFloat(boqSummary.total?.estimated || 0).toLocaleString('en-IN')}`} />
              <InfoRow label="Actual" value={`₹${parseFloat(boqSummary.total?.actual || 0).toLocaleString('en-IN')}`} valueClass="text-gold-400" />
            </div>
          )}
        </div>
      </div>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Site" size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Site Photo</label>
            <PhotoUpload value={form.raw_photo} onChange={v => f('raw_photo', v)} folder="dgsystem/sites" label="Site Photo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Site Name</label><input className="input" value={form.name || ''} onChange={e => f('name', e.target.value)} /></div>
            <div><label className="label">Supervisor</label>
              <select className="select" value={form.supervisor_id || ''} onChange={e => f('supervisor_id', e.target.value)}>
                <option value="">Select</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employee_id || ''})</option>)}
              </select>
              {form.supervisor_id !== site.supervisor_id && <p className="text-orange-400 text-xs mt-1">⚠️ Changing supervisor will reassign all labour on this site</p>}
            </div>
            <div><label className="label">Contract Type</label>
              <select className="select" value={form.contract_type || 'material_labour'} onChange={e => f('contract_type', e.target.value)}>
                <option value="material_labour">Material + Labour</option>
                <option value="labour_only">Labour Only</option>
                <option value="material_only">Material Only</option>
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="select" value={form.status || ''} onChange={e => f('status', e.target.value)}>
                <option value="active">Active</option><option value="on_hold">On Hold</option>
                <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div><label className="label">Client Name</label><input className="input" value={form.client_name || ''} onChange={e => f('client_name', e.target.value)} /></div>
            <div><label className="label">Contract Value (₹)</label><input type="number" className="input" value={form.contract_value || ''} onChange={e => f('contract_value', e.target.value)} /></div>
            <div><label className="label">Start Date</label><input type="date" className="input" value={form.start_date || ''} onChange={e => f('start_date', e.target.value)} /></div>
            <div><label className="label">Expected End</label><input type="date" className="input" value={form.expected_end_date || ''} onChange={e => f('expected_end_date', e.target.value)} /></div>
            <div><label className="label">City</label><input className="input" value={form.city || ''} onChange={e => f('city', e.target.value)} /></div>
            <div><label className="label">State</label><input className="input" value={form.state || ''} onChange={e => f('state', e.target.value)} /></div>
            <div><label className="label">GPS Radius (m)</label><input type="number" className="input" value={form.gps_radius_meters || 100} onChange={e => f('gps_radius_meters', e.target.value)} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => f('notes', e.target.value)} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setEditModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
