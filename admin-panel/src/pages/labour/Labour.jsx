import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, ToggleLeft, ToggleRight, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, Modal, StatusBadge, LoadingPage, EmptyState, ConfirmDialog } from '../../components/ui'
import { PhotoUpload, DocUpload } from '../../components/ui/PhotoUpload'

const EMPTY_FORM = {
  labour_type: 'unskilled', daily_wage: '',
  photo: '', aadhar_number: '', aadhar_photo: '',
  pan_number: '', custom_doc_name: '', custom_doc_photo: '',
  bank_account: '', bank_ifsc: '', bank_name: '', bank_passbook_photo: '',
}

export default function Labour() {
  const [labour, setLabour]       = useState([])
  const [sites, setSites]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterActive, setFilterActive] = useState('true')
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [saving, setSaving]       = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    try {
      const [l, s] = await Promise.all([
        api.get(`/labour?is_active=${filterActive}${filterSite ? '&site_id=' + filterSite : ''}`),
        api.get('/sites')
      ])
      setLabour(l.data); setSites(s.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }
  useEffect(() => { load() }, [filterSite, filterActive])

  const filtered = labour.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.aadhar_number || '').includes(search) ||
    (l.phone || '').includes(search)
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.aadhar_number) return toast.error('Aadhar number is mandatory')
    setSaving(true)
    try {
      await api.post('/labour', form)
      toast.success('Labour added')
      setModal(false); setForm({ ...EMPTY_FORM }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    setSaving(false)
  }

  const toggleActive = async (id, current) => {
    try { await api.patch(`/labour/${id}/toggle`); toast.success(current ? 'Deactivated' : 'Activated'); load() }
    catch { toast.error('Failed') }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Labour Management" subtitle={`${labour.length} records`}
        action={<button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />Add Labour</button>}
      />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-64" placeholder="Name, phone, aadhar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-48" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select w-36" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="">All</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0
        ? <EmptyState icon={Users} title="No labour found" message="Add your first labour record"
            action={<button onClick={() => setModal(true)} className="btn-gold">Add Labour</button>} />
        : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Daily Wage</th><th>Aadhar</th><th>Site</th><th>Phone</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {l.photo
                          ? <img src={l.photo} className="w-9 h-9 rounded-full object-cover border" style={{ borderColor: 'var(--border)' }} alt={l.name} />
                          : <div className="w-9 h-9 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 text-xs font-bold">{l.name[0]}</div>
                        }
                        <span className="font-medium">{l.name}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={l.labour_type} /></td>
                    <td className="text-gold-400 font-medium">₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--muted)' }} className="font-mono text-sm">{l.aadhar_number || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{l.site?.name || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{l.phone || '—'}</td>
                    <td><span className={l.is_active ? 'badge-green' : 'badge-red'}>{l.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="flex gap-1">
                        <Link to={`/labour/${l.id}`} className="btn-ghost px-2 py-1 text-xs"><Eye size={14} /></Link>
                        <button onClick={() => toggleActive(l.id, l.is_active)} className="btn-ghost px-2 py-1">
                          {l.is_active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Add Labour Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setForm({ ...EMPTY_FORM }) }} title="Add Labour" size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Profile Photo */}
          <div className="flex justify-center">
            <div className="text-center">
              <PhotoUpload value={form.photo} onChange={v => f('photo', v)} folder="dgsystem/labour" label="Photo" />
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Profile photo</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Full Name *</label><input className="input" required value={form.name || ''} onChange={e => f('name', e.target.value)} placeholder="Ramesh Kumar" /></div>
            <div><label className="label">Nickname</label><input className="input" value={form.nickname || ''} onChange={e => f('nickname', e.target.value)} placeholder="Optional" /></div>
            <div><label className="label">Phone</label><input className="input" type="tel" value={form.phone || ''} onChange={e => f('phone', e.target.value)} /></div>
            <div><label className="label">Daily Wage (₹) *</label><input type="number" className="input" required value={form.daily_wage} onChange={e => f('daily_wage', e.target.value)} placeholder="500" /></div>
            <div>
              <label className="label">Labour Type</label>
              <select className="select" value={form.labour_type} onChange={e => f('labour_type', e.target.value)}>
                <option value="unskilled">Unskilled</option>
                <option value="skilled">Skilled</option>
              </select>
            </div>
            <div><label className="label">Skill Type (if skilled)</label><input className="input" value={form.skill_type || ''} onChange={e => f('skill_type', e.target.value)} placeholder="Mason, Carpenter, Plumber..." /></div>
            <div>
              <label className="label">Assign to Site</label>
              <select className="select" value={form.assigned_site_id || ''} onChange={e => f('assigned_site_id', e.target.value)}>
                <option value="">Select Site (optional)</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="label">Emergency Contact</label><input className="input" type="tel" value={form.emergency_contact || ''} onChange={e => f('emergency_contact', e.target.value)} /></div>
            <div className="col-span-2"><label className="label">Address</label><textarea className="input" rows={2} value={form.address || ''} onChange={e => f('address', e.target.value)} /></div>
          </div>

          {/* Identity Documents */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <p className="font-medium mb-3" style={{ color: 'var(--text)' }}>Identity Documents</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Aadhar Number <span className="text-red-400">*</span></label>
                <input className="input" required value={form.aadhar_number} onChange={e => f('aadhar_number', e.target.value)} placeholder="12-digit Aadhar number" maxLength={12} />
              </div>
              <div>
                <label className="label">Aadhar Photo <span className="text-red-400">*</span></label>
                <DocUpload value={form.aadhar_photo} onChange={v => f('aadhar_photo', v)} folder="dgsystem/labour-docs" label="Upload Aadhar photo" />
              </div>
              <div>
                <label className="label">PAN Number (optional)</label>
                <input className="input" value={form.pan_number || ''} onChange={e => f('pan_number', e.target.value)} placeholder="ABCDE1234F" />
              </div>
              <div>
                <label className="label">Custom Document Name (optional)</label>
                <input className="input" value={form.custom_doc_name || ''} onChange={e => f('custom_doc_name', e.target.value)} placeholder="e.g. Driving License, Voter ID" />
              </div>
              {form.custom_doc_name && (
                <div>
                  <label className="label">Custom Document Photo</label>
                  <DocUpload value={form.custom_doc_photo} onChange={v => f('custom_doc_photo', v)} folder="dgsystem/labour-docs" label="Upload document" />
                </div>
              )}
            </div>
          </div>

          {/* Bank Details */}
          <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <p className="font-medium mb-3" style={{ color: 'var(--text)' }}>Bank Details (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Account Number</label><input className="input" value={form.bank_account} onChange={e => f('bank_account', e.target.value)} /></div>
              <div><label className="label">IFSC Code</label><input className="input" value={form.bank_ifsc} onChange={e => f('bank_ifsc', e.target.value)} /></div>
              <div className="col-span-2"><label className="label">Bank Name</label><input className="input" value={form.bank_name} onChange={e => f('bank_name', e.target.value)} /></div>
              <div className="col-span-2">
                <label className="label">Bank Passbook Photo</label>
                <DocUpload value={form.bank_passbook_photo} onChange={v => f('bank_passbook_photo', v)} folder="dgsystem/labour-docs" label="Upload passbook photo" />
                {form.bank_passbook_photo && (
                  <a href={form.bank_passbook_photo} target="_blank" rel="noreferrer" className="text-blue-400 text-xs mt-1 inline-block hover:underline">View Passbook</a>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => { setModal(false); setForm({ ...EMPTY_FORM }) }} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Add Labour'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
