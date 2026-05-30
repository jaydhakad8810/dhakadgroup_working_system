import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, StatusBadge, InfoRow, Modal } from '../../components/ui'
import { PhotoUpload, DocUpload } from '../../components/ui/PhotoUpload'

const INDIA_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar',
  'Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra',
  'Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi',
  'Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
]
const SKILL_TYPES = ['Painter','Helper','Full Skill','Gypsum','Semi Polish','Texture','Other']
const UPI_APPS = ['Google Pay','PhonePe','Paytm','Other']
const RELIGION_OPTIONS = ['Hindu','Muslim','Christian','Other']
const FIXED_SKILLS = SKILL_TYPES.filter(x => x !== 'Other')
const FIXED_UPIS = UPI_APPS.filter(x => x !== 'Other')
const FIXED_RELIGIONS = RELIGION_OPTIONS.filter(x => x !== 'Other')

export default function LabourDetail() {
  const { id } = useParams()
  const [labour, setLabour] = useState(null)
  const [advances, setAdvances] = useState([])
  const [loading, setLoading] = useState(true)
  const [advModal, setAdvModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [advForm, setAdvForm] = useState({ amount: '', payment_mode: 'cash' })
  const [form, setForm] = useState({})
  const [sites, setSites] = useState([])
  const [saving, setSaving] = useState(false)
  const [wageHistory, setWageHistory] = useState([])
  const [wageHistoryModal, setWageHistoryModal] = useState(false)
  const [updateWageModal, setUpdateWageModal] = useState(false)
  const [wageForm, setWageForm] = useState({ new_wage: '', effective_date: new Date().toISOString().split('T')[0], reason: '' })
  const [siteHistory, setSiteHistory] = useState([])
  const [activeTab, setActiveTab] = useState('info')
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    try {
      const [l, adv, s, wh, sh] = await Promise.all([
        api.get(`/labour/${id}`),
        api.get(`/labour/${id}/advances`),
        api.get('/sites'),
        api.get(`/labour/wage-history/${id}`).catch(() => ({ data: [] })),
        api.get(`/labour/site-history/${id}`).catch(() => ({ data: [] }))
      ])
      setLabour(l.data); setAdvances(adv.data); setForm(l.data); setSites(s.data); setWageHistory(wh.data || []); setSiteHistory(sh.data || [])
    } catch { toast.error('Failed') }
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const handleAdvance = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.post(`/labour/${id}/advances`, advForm); toast.success('Advance added'); setAdvModal(false); setAdvForm({ amount: '', payment_mode: 'cash' }); load() }
    catch { toast.error('Failed') }
    setSaving(false)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try { await api.put(`/labour/${id}`, form); toast.success('Updated'); setEditModal(false); load() }
    catch { toast.error('Failed') }
    setSaving(false)
  }

  if (loading) return <LoadingPage />
  if (!labour) return <div className="text-gray-400 p-6">Not found</div>

  const pendingAdvance = advances.filter(a => !a.deducted).reduce((s, a) => s + parseFloat(a.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/labour" className="btn-ghost"><ArrowLeft size={18} /></Link>
        <div className="flex items-center gap-3 flex-1">
          {labour.photo ? <img src={labour.photo} className="w-14 h-14 rounded-xl object-cover border border-dark-600" />
            : <div className="w-14 h-14 rounded-xl bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-2xl">{labour.name[0]}</div>}
          <div>
            <h1 className="text-2xl font-bold text-white">{labour.name}</h1>
            <div className="flex gap-2 mt-1"><StatusBadge status={labour.labour_type} /><span className={labour.is_active ? 'badge-green' : 'badge-red'}>{labour.is_active ? 'Active' : 'Inactive'}</span></div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setEditModal(true)} className="btn-outline">Edit</button>
          <button onClick={() => { setWageForm({ new_wage: '', effective_date: new Date().toISOString().split('T')[0], reason: '' }); setUpdateWageModal(true) }} className="btn-gold py-1.5 text-sm">Update Wage</button>
          <button onClick={() => setWageHistoryModal(true)} className="btn-ghost py-1.5 text-sm">Wage History ({wageHistory.length})</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-dark-700 pb-0">
        {[['info','Info'],['site-history','Site History']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? 'border-gold-500 text-gold-400' : 'border-transparent text-gray-400 hover:text-white'}`}>{label}</button>
        ))}
      </div>

      {activeTab === 'site-history' && (
        <div className="card">
          <h3 className="text-white font-semibold mb-4">Site History</h3>
          {siteHistory.length === 0
            ? <p className="text-gray-400 text-sm text-center py-8">No site history recorded</p>
            : (
              <div className="relative pl-7">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5" style={{background:'var(--border)'}} />
                {siteHistory.map((item, i) => (
                  <div key={i} className="relative mb-4">
                    <div className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2 ${item.type === 'transfer' ? 'bg-orange-500 border-orange-500' : 'bg-green-500 border-green-500'}`} />
                    <div className="p-3 rounded-xl border" style={{background:'var(--bg3)',borderColor:'var(--border)'}}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white font-medium text-sm">{item.site_name || 'Unknown Site'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${item.type === 'transfer' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                          {item.type === 'transfer' ? 'Transfer' : 'Assignment'}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{color:'var(--muted)'}}>
                        {item.date}{item.end_date ? ` → ${item.end_date}` : ' → Present'}
                        {item.duration_days ? ` · ${item.duration_days} day${item.duration_days !== 1 ? 's' : ''}` : ''}
                      </p>
                      {item.reason && <p className="text-xs mt-0.5 truncate" style={{color:'var(--muted)'}}>"{item.reason}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {activeTab === 'info' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card space-y-0">
            <h3 className="text-white font-semibold mb-3">Labour Info</h3>
            <InfoRow label="Daily Wage" value={`₹${parseFloat(labour.daily_wage).toLocaleString('en-IN')}/day`} valueClass="text-gold-400 font-bold" />
            <InfoRow label="Phone" value={labour.phone} />
            <InfoRow label="Site" value={labour.site?.name} />
            <InfoRow label="Skill" value={labour.skill_type} />
            <InfoRow label="Aadhar" value={labour.aadhar_number} />
            <InfoRow label="PAN" value={labour.pan_number} />
            <InfoRow label="Emergency" value={labour.emergency_contact} />
            <InfoRow label="Bank" value={labour.bank_name} />
            <InfoRow label="Account" value={labour.bank_account} />
            <InfoRow label="IFSC" value={labour.bank_ifsc} />
            {labour.address && <div className="py-2"><p className="text-gray-400 text-sm">Address</p><p className="text-white text-sm mt-0.5">{labour.address}</p></div>}
          </div>

          {/* Documents */}
          {(labour.aadhar_photo || labour.pan_photo || labour.bank_passbook_photo || labour.custom_doc_photo) && (
            <div className="card">
              <h3 className="text-white font-semibold mb-3">Documents</h3>
              <div className="grid grid-cols-2 gap-4">
                {labour.aadhar_photo && <div><p className="text-gray-400 text-xs mb-1">Aadhar Photo</p><img src={labour.aadhar_photo} className="w-full h-28 object-cover rounded-xl" /></div>}
                {labour.pan_photo && <div><p className="text-gray-400 text-xs mb-1">PAN Card Photo</p><img src={labour.pan_photo} className="w-full h-28 object-cover rounded-xl" /></div>}
                {labour.bank_passbook_photo && <div><p className="text-gray-400 text-xs mb-1">Bank Passbook</p><img src={labour.bank_passbook_photo} className="w-full h-28 object-cover rounded-xl" /></div>}
                {labour.custom_doc_photo && <div><p className="text-gray-400 text-xs mb-1">{labour.custom_doc_name || 'Document'}</p><img src={labour.custom_doc_photo} className="w-full h-28 object-cover rounded-xl" /></div>}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Advances</h3>
            <button onClick={() => setAdvModal(true)} className="btn-gold py-1.5 text-xs"><Plus size={14} />Add</button>
          </div>
          {pendingAdvance > 0 && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-gray-400 text-xs">Pending</p>
              <p className="text-red-400 font-bold text-xl">₹{pendingAdvance.toLocaleString('en-IN')}</p>
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {advances.map(a => (
              <div key={a.id} className="flex justify-between items-center p-2.5 bg-dark-800 rounded-xl text-sm">
                <div><p className="text-white font-medium">₹{parseFloat(a.amount).toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">{a.payment_mode}</p></div>
                <span className={a.deducted ? 'badge-green' : 'badge-red'}>{a.deducted ? 'Deducted' : 'Pending'}</span>
              </div>
            ))}
            {!advances.length && <p className="text-gray-500 text-sm text-center py-4">No advances</p>}
          </div>
        </div>
      </div>}

      {/* Advance Modal */}
      <Modal open={advModal} onClose={() => setAdvModal(false)} title="Give Advance" size="sm">
        <form onSubmit={handleAdvance} className="space-y-4">
          <div><label className="label">Amount (₹) *</label><input type="number" className="input" required value={advForm.amount} onChange={e => setAdvForm({ ...advForm, amount: e.target.value })} /></div>
          <div><label className="label">Payment Mode</label>
            <select className="select" value={advForm.payment_mode} onChange={e => setAdvForm({ ...advForm, payment_mode: e.target.value })}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={advForm.notes || ''} onChange={e => setAdvForm({ ...advForm, notes: e.target.value })} /></div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setAdvModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">Give Advance</button></div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Labour" size="xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex justify-center">
            <div className="text-center">
              <PhotoUpload value={form.photo} onChange={v => f('photo', v)} folder="dgsystem/labour" label="Photo" />
              <p className="text-gray-500 text-xs mt-1">Profile photo</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Name</label><input className="input" value={form.name || ''} onChange={e => f('name', e.target.value)} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone || ''} onChange={e => f('phone', e.target.value)} /></div>
            <div><label className="label">Date of Joining</label><input type="date" className="input" value={form.date_of_joining||''} onChange={e=>f('date_of_joining',e.target.value)}/></div>
            <div><label className="label">Daily Wage (₹)</label><input type="number" className="input" value={form.daily_wage || ''} onChange={e => f('daily_wage', e.target.value)} /></div>
            <div><label className="label">Type</label>
              <select className="select" value={form.labour_type || 'unskilled'} onChange={e => f('labour_type', e.target.value)}>
                <option value="unskilled">Unskilled</option><option value="skilled">Skilled</option>
              </select>
            </div>
            <div>
              <label className="label">Skill Type</label>
              <select className="select" value={FIXED_SKILLS.includes(form.skill_type||'') ? form.skill_type : (form.skill_type ? 'Other' : '')} onChange={e => { if(e.target.value==='Other') f('skill_type',''); else f('skill_type',e.target.value) }}>
                <option value="">Select…</option>
                {SKILL_TYPES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              {form.skill_type!==''&&!FIXED_SKILLS.includes(form.skill_type||'') && <input className="input mt-2" placeholder="Specify skill type…" value={form.skill_type||''} onChange={e=>f('skill_type',e.target.value)}/>}
            </div>
            <div><label className="label">Assign Site</label>
              <select className="select" value={form.assigned_site_id || ''} onChange={e => f('assigned_site_id', e.target.value)}>
                <option value="">None</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="label">Aadhar Number</label><input className="input" value={form.aadhar_number || ''} onChange={e => f('aadhar_number', e.target.value)} /></div>
            <div><label className="label">PAN Number</label><input className="input" value={form.pan_number || ''} onChange={e => f('pan_number', e.target.value)} /></div>
            <div><label className="label">Emergency Contact</label><input className="input" value={form.emergency_contact || ''} onChange={e => f('emergency_contact', e.target.value)} /></div>
            <div><label className="label">Bank Account</label><input className="input" value={form.bank_account || ''} onChange={e => f('bank_account', e.target.value)} /></div>
            <div><label className="label">Bank IFSC</label><input className="input" value={form.bank_ifsc || ''} onChange={e => f('bank_ifsc', e.target.value)} /></div>
            <div><label className="label">Bank Name</label><input className="input" value={form.bank_name || ''} onChange={e => f('bank_name', e.target.value)} /></div>
            <div><label className="label">Branch Name</label><input className="input" value={form.bank_branch||''} onChange={e=>f('bank_branch',e.target.value)}/></div>
            <div>
              <label className="label">UPI App</label>
              <select className="select" value={FIXED_UPIS.includes(form.upi_app||'') ? form.upi_app : (form.upi_app ? 'Other' : '')} onChange={e => { if(e.target.value==='Other') f('upi_app',''); else f('upi_app',e.target.value) }}>
                <option value="">Select…</option>
                {UPI_APPS.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
              {form.upi_app!==''&&!FIXED_UPIS.includes(form.upi_app||'') && <input className="input mt-2" placeholder="Specify UPI app…" value={form.upi_app||''} onChange={e=>f('upi_app',e.target.value)}/>}
            </div>
            <div className="col-span-2">
              <label className="label">Bank Passbook Photo</label>
              <DocUpload value={form.bank_passbook_photo} onChange={v => f('bank_passbook_photo', v)} folder="dgsystem/labour-docs" label="Upload passbook photo" />
              {form.bank_passbook_photo && (
                <a href={form.bank_passbook_photo} target="_blank" rel="noreferrer" className="text-blue-400 text-xs mt-1 inline-block hover:underline">View Passbook</a>
              )}
            </div>
            <div className="col-span-2"><label className="label">Address</label><textarea className="input" rows={2} value={form.address || ''} onChange={e => f('address', e.target.value)} /></div>
            <div>
              <label className="label">State</label>
              <select className="select" value={form.state||''} onChange={e=>f('state',e.target.value)}>
                <option value="">Select state…</option>
                {INDIA_STATES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Religion</label>
              <select className="select" value={FIXED_RELIGIONS.includes(form.religion||'') ? form.religion : (form.religion ? 'Other' : '')} onChange={e => { if(e.target.value==='Other') f('religion',''); else f('religion',e.target.value) }}>
                <option value="">Select…</option>
                {RELIGION_OPTIONS.map(r=><option key={r} value={r}>{r}</option>)}
              </select>
              {form.religion!==''&&!FIXED_RELIGIONS.includes(form.religion||'') && <input className="input mt-2" placeholder="Specify religion…" value={form.religion||''} onChange={e=>f('religion',e.target.value)}/>}
            </div>
          </div>

          {/* Doc uploads */}
          <div className="border-t border-dark-700 pt-4">
            <p className="text-white font-medium mb-3">Document Photos</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Aadhar Photo</label><DocUpload value={form.aadhar_photo} onChange={v => f('aadhar_photo', v)} folder="dgsystem/labour-docs" label="Upload Aadhar" /></div>
              <div><label className="label">PAN Card Photo</label><DocUpload value={form.pan_photo} onChange={v => f('pan_photo', v)} folder="dgsystem/labour-docs" label="Upload PAN card" /></div>
              <div>
                <label className="label">Custom Doc Name</label>
                <input className="input mb-2" value={form.custom_doc_name || ''} onChange={e => f('custom_doc_name', e.target.value)} placeholder="e.g. Driving License" />
                <DocUpload value={form.custom_doc_photo} onChange={v => f('custom_doc_photo', v)} folder="dgsystem/labour-docs" label="Upload Document" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end"><button type="button" onClick={() => setEditModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Save'}</button></div>
        </form>
      </Modal>

      <Modal open={wageHistoryModal} onClose={() => setWageHistoryModal(false)} title="Wage History" size="md">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {wageHistory.length === 0
            ? <p className="text-gray-400 text-center py-6">No wage changes recorded</p>
            : wageHistory.map((wh, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border" style={{background:'var(--bg3)',borderColor:'var(--border)'}}>
                <div>
                  <p className="text-white text-sm font-medium">{wh.effective_date}</p>
                  <p className="text-xs mt-0.5" style={{color:'var(--muted)'}}>{wh.changedBy?.name || 'Admin'} · <span className={wh.change_type==='approved_request'?'text-blue-400':'text-gold-400'}>{wh.change_type==='approved_request'?'Approved Request':'Direct'}</span></p>
                  {wh.reason && <p className="text-xs mt-0.5" style={{color:'var(--muted)'}}>"{wh.reason}"</p>}
                </div>
                <div className="text-right">
                  {wh.old_wage && <p className="text-red-400 text-xs line-through">₹{parseFloat(wh.old_wage).toLocaleString('en-IN')}/day</p>}
                  <p className="text-green-400 font-bold">₹{parseFloat(wh.new_wage).toLocaleString('en-IN')}/day</p>
                </div>
              </div>
            ))
          }
        </div>
      </Modal>

      <Modal open={updateWageModal} onClose={() => setUpdateWageModal(false)} title="Update Wage" size="sm">
        <form onSubmit={async e => {
          e.preventDefault(); setSaving(true)
          try {
            await api.patch(`/labour/update-wage/${id}`, wageForm)
            toast.success('Wage updated'); setUpdateWageModal(false); load()
          } catch { toast.error('Failed') }
          setSaving(false)
        }} className="space-y-4">
          <div><label className="label">New Daily Wage (₹) *</label><input type="number" className="input" required value={wageForm.new_wage} onChange={e=>setWageForm(p=>({...p,new_wage:e.target.value}))}/></div>
          <div><label className="label">Effective Date</label><input type="date" className="input" value={wageForm.effective_date} onChange={e=>setWageForm(p=>({...p,effective_date:e.target.value}))}/></div>
          <div><label className="label">Reason *</label><input className="input" required value={wageForm.reason} onChange={e=>setWageForm(p=>({...p,reason:e.target.value}))}/></div>
          <div className="flex gap-3 justify-end"><button type="button" onClick={()=>setUpdateWageModal(false)} className="btn-ghost">Cancel</button><button type="submit" disabled={saving} className="btn-gold">{saving?'Saving...':'Update Wage'}</button></div>
        </form>
      </Modal>
    </div>
  )
}
