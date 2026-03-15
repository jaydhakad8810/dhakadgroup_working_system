import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, Modal, StatusBadge, LoadingPage, EmptyState } from '../../components/ui'
import { Users } from 'lucide-react'

export default function Labour() {
  const [labour, setLabour] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [filterActive, setFilterActive] = useState('true')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ daily_wage: '', labour_type: 'unskilled' })
  const [saving, setSaving] = useState(false)

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

  const filtered = labour.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/labour', form)
      toast.success('Labour added'); setModal(false); setForm({ daily_wage: '', labour_type: 'unskilled' }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Error') }
    setSaving(false)
  }

  const toggleActive = async (id, current) => {
    try {
      await api.patch(`/labour/${id}/toggle`)
      toast.success(current ? 'Deactivated' : 'Activated'); load()
    } catch { toast.error('Failed') }
  }

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="Labour Management" subtitle={`${labour.length} records`}
        action={<button onClick={() => setModal(true)} className="btn-gold"><Plus size={16} />Add Labour</button>}
      />
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-64" placeholder="Search labour..." value={search} onChange={e => setSearch(e.target.value)} />
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

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No labour found" message="Add your first labour record" action={<button onClick={() => setModal(true)} className="btn-gold">Add Labour</button>} />
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Daily Wage</th><th>Site</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td><div className="flex items-center gap-2">{l.photo?<img src={l.photo} className="w-8 h-8 rounded-full object-cover" />:<div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 text-xs font-bold">{l.name[0]}</div>}<span className="font-medium">{l.name}</span></div></td>
                  <td><StatusBadge status={l.labour_type} /></td>
                  <td className="text-gold-400 font-medium">₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}</td>
                  <td className="text-gray-400">{l.site?.name || '—'}</td>
                  <td className="text-gray-400">{l.phone || '—'}</td>
                  <td><span className={l.is_active ? 'badge-green' : 'badge-red'}>{l.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <Link to={`/labour/${l.id}`} className="btn-ghost px-2 py-1 text-xs"><Eye size={14} /></Link>
                      <button onClick={() => toggleActive(l.id, l.is_active)} className="btn-ghost px-2 py-1">
                        {l.is_active ? <ToggleRight size={14} className="text-green-400" /> : <ToggleLeft size={14} className="text-gray-400" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setForm({ daily_wage: '', labour_type: 'unskilled' }) }} title="Add Labour" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Full Name *</label><input className="input" required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
            <div><label className="label">Daily Wage (₹) *</label><input type="number" className="input" required value={form.daily_wage} onChange={e=>setForm({...form,daily_wage:e.target.value})} /></div>
            <div><label className="label">Labour Type</label>
              <select className="select" value={form.labour_type} onChange={e=>setForm({...form,labour_type:e.target.value})}>
                <option value="unskilled">Unskilled</option><option value="skilled">Skilled</option>
              </select>
            </div>
            <div><label className="label">Skill Type</label><input className="input" placeholder="e.g. Mason, Carpenter" value={form.skill_type||''} onChange={e=>setForm({...form,skill_type:e.target.value})} /></div>
            <div><label className="label">Assign to Site</label>
              <select className="select" value={form.assigned_site_id||''} onChange={e=>setForm({...form,assigned_site_id:e.target.value})}>
                <option value="">Select Site</option>{sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="label">Aadhar Number</label><input className="input" value={form.aadhar_number||''} onChange={e=>setForm({...form,aadhar_number:e.target.value})} /></div>
            <div><label className="label">Emergency Contact</label><input className="input" value={form.emergency_contact||''} onChange={e=>setForm({...form,emergency_contact:e.target.value})} /></div>
            <div><label className="label">Bank Account</label><input className="input" value={form.bank_account||''} onChange={e=>setForm({...form,bank_account:e.target.value})} /></div>
            <div><label className="label">Bank IFSC</label><input className="input" value={form.bank_ifsc||''} onChange={e=>setForm({...form,bank_ifsc:e.target.value})} /></div>
            <div className="col-span-2"><label className="label">Address</label><textarea className="input" rows={2} value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})} /></div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={()=>setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving?'Saving...':'Add Labour'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
