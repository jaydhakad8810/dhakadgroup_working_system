import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Trash2, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, Modal, StatusBadge, LoadingPage, EmptyState, ConfirmDialog } from '../../components/ui'
import { PhotoUpload } from '../../components/ui/PhotoUpload'
import { Building2 } from 'lucide-react'

export default function Sites() {
  const [sites, setSites] = useState([])
  const [orgs, setOrgs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ status: 'active', gps_radius_meters: 100, contract_type: 'material_labour' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    try {
      const [s, o, u] = await Promise.all([api.get('/sites'), api.get('/organisations'), api.get('/users?role=supervisor')])
      setSites(s.data); setOrgs(o.data); setUsers(u.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const captureGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS not supported')
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        f('latitude', pos.coords.latitude.toFixed(7))
        f('longitude', pos.coords.longitude.toFixed(7))
        toast.success(`GPS captured: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
        setGpsLoading(false)
      },
      () => { toast.error('Could not get location'); setGpsLoading(false) },
      { enableHighAccuracy: true }
    )
  }

  const filtered = sites.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) &&
    (!filterStatus || s.status === filterStatus)
  )

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/sites', form)
      toast.success('Site created'); setModal(false); setForm({ status: 'active', gps_radius_meters: 100, contract_type: 'material_labour' }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/sites/${id}`); toast.success('Deleted'); setDeleting(null); load() }
    catch { toast.error('Delete failed') }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Sites" subtitle={`${sites.length} total sites`}
        action={<button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />New Site</button>}
      />
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-64" placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option><option value="completed">Completed</option>
          <option value="on_hold">On Hold</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0
        ? <EmptyState icon={Building2} title="No sites found" message="Create your first site" action={<button onClick={() => setModal(true)} className="btn-gold">New Site</button>} />
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(site => (
              <div key={site.id} className="card hover:border-gold-500/40 transition-colors cursor-pointer p-0 overflow-hidden">
                {site.raw_photo && <img src={site.raw_photo} className="w-full h-36 object-cover" alt={site.name} />}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" style={{ color: 'var(--text)' }}>{site.name}</h3>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>{site.organisation?.name || '—'}</p>
                    </div>
                    <StatusBadge status={site.status} />
                  </div>
                  <div className="space-y-1 text-sm mb-3" style={{ color: 'var(--muted)' }}>
                    {site.client_name && <p>👤 {site.client_name}</p>}
                    {site.city && <p className="flex items-center gap-1"><MapPin size={12} />{site.city}, {site.state}</p>}
                    {site.supervisor && <p>👷 {site.supervisor.name}</p>}
                    {site.contract_type && <p>📄 {site.contract_type.replace(/_/g, ' + ')}</p>}
                    {site.latitude && <p className="text-xs text-green-400">📍 GPS: {parseFloat(site.latitude).toFixed(4)}, {parseFloat(site.longitude).toFixed(4)} ({site.gps_radius_meters}m)</p>}
                    {site.latitude && site.longitude && (
                      <a href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                         target="_blank" rel="noreferrer"
                         className="text-blue-400 text-xs flex items-center gap-1 hover:underline"
                         onClick={e => e.stopPropagation()}>
                        📍 Open in Maps
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/sites/${site.id}`} className="btn-outline flex-1 justify-center text-sm py-1.5"><Eye size={14} />View</Link>
                    <button onClick={() => setDeleting(site.id)} className="btn-ghost text-red-400 px-2"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <Modal open={modal} onClose={() => { setModal(false); setForm({ status: 'active', gps_radius_meters: 100, contract_type: 'material_labour' }) }} title="New Site" size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Raw Site Photo */}
          <div>
            <label className="label">Site Photo (Raw / Before Construction)</label>
            <PhotoUpload value={form.raw_photo} onChange={v => f('raw_photo', v)} folder="dgsystem/sites" label="Site Photo" className="justify-start" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Site Name *</label><input className="input" required value={form.name || ''} onChange={e => f('name', e.target.value)} /></div>
            <div><label className="label">Organisation</label>
              <select className="select" value={form.organisation_id || ''} onChange={e => f('organisation_id', e.target.value)}>
                <option value="">Select</option>{orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div><label className="label">Supervisor</label>
              <select className="select" value={form.supervisor_id || ''} onChange={e => f('supervisor_id', e.target.value)}>
                <option value="">Select</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employee_id})</option>)}
              </select>
            </div>
            <div><label className="label">Contract Type</label>
              <select className="select" value={form.contract_type} onChange={e => f('contract_type', e.target.value)}>
                <option value="material_labour">Material Rate + Labour Rate</option>
                <option value="labour_only">Only Labour Rate</option>
                <option value="material_only">Only Material Rate</option>
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="select" value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="active">Active</option><option value="on_hold">On Hold</option>
                <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div><label className="label">Client Name</label><input className="input" value={form.client_name || ''} onChange={e => f('client_name', e.target.value)} /></div>
            <div><label className="label">Client Phone</label><input className="input" value={form.client_phone || ''} onChange={e => f('client_phone', e.target.value)} /></div>
            <div><label className="label">Contract Value (₹)</label><input type="number" className="input" value={form.contract_value || ''} onChange={e => f('contract_value', e.target.value)} /></div>
            <div><label className="label">Start Date</label><input type="date" className="input" value={form.start_date || ''} onChange={e => f('start_date', e.target.value)} /></div>
            <div><label className="label">Expected End Date</label><input type="date" className="input" value={form.expected_end_date || ''} onChange={e => f('expected_end_date', e.target.value)} /></div>
            <div><label className="label">City</label><input className="input" value={form.city || ''} onChange={e => f('city', e.target.value)} /></div>
            <div><label className="label">State</label><input className="input" value={form.state || ''} onChange={e => f('state', e.target.value)} /></div>
          </div>

          {/* GPS Section */}
          <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>📍 GPS Location (for attendance radius)</p>
              <button type="button" onClick={captureGPS} disabled={gpsLoading}
                className="btn-outline text-xs py-1.5 px-3">{gpsLoading ? 'Getting...' : 'Capture GPS'}</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Latitude</label><input className="input" value={form.latitude || ''} onChange={e => f('latitude', e.target.value)} placeholder="Auto-filled" /></div>
              <div><label className="label">Longitude</label><input className="input" value={form.longitude || ''} onChange={e => f('longitude', e.target.value)} placeholder="Auto-filled" /></div>
              <div><label className="label">Radius (meters)</label><input type="number" className="input" value={form.gps_radius_meters} onChange={e => f('gps_radius_meters', e.target.value)} /></div>
            </div>
            {form.latitude && <p className="text-green-400 text-xs mt-2">✓ GPS set — attendance will be restricted to {form.gps_radius_meters}m radius</p>}
          </div>

          <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address || ''} onChange={e => f('address', e.target.value)} /></div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => f('notes', e.target.value)} /></div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Create Site'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} title="Delete Site" message="This will delete the site and all its data." />
    </div>
  )
}
