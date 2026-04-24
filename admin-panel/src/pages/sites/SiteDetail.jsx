import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, MapPin, Loader2 } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, Modal, InfoRow } from '../../components/ui'
import { PhotoUpload } from '../../components/ui/PhotoUpload'
import toast from 'react-hot-toast'

const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`

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
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Financials tab state
  const [financialsLoaded, setFinancialsLoaded] = useState(false)
  const [financialsLoading, setFinancialsLoading] = useState(false)
  const [newLedgerSummary, setNewLedgerSummary] = useState(null)
  const [clientSummary, setClientSummary] = useState(null)

  const load = async () => {
    try {
      const [s, b, u] = await Promise.all([
        api.get(`/sites/${id}`),
        api.get(`/boq/summary/${id}`).catch(() => ({ data: null })),
        api.get('/users?role=supervisor')
      ])
      setSite(s.data); setForm(s.data)
      setBoqSummary(b.data); setUsers(u.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  // Fetch financials only when Financials tab is active and not yet loaded
  useEffect(() => {
    if (activeTab !== 'financials' || financialsLoaded) return
    const fetchFinancials = async () => {
      setFinancialsLoading(true)
      try {
        const [ls, cs] = await Promise.all([
          api.get(`/ledger/summary?site_id=${id}`),
          api.get(`/ledger/client/summary?site_id=${id}`),
        ])
        setNewLedgerSummary(ls.data)
        setClientSummary(cs.data)
        setFinancialsLoaded(true)
      } catch {}
      setFinancialsLoading(false)
    }
    fetchFinancials()
  }, [activeTab, id, financialsLoaded])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const oldSupervisorId = site.supervisor_id
      await api.put(`/sites/${id}`, form)
      toast.success('Site updated')
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

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
        {[['overview', 'Overview'], ['financials', 'Financials']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card space-y-0 lg:col-span-2">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Site Information</h3>
            <InfoRow label="Client" value={site.client_name} />
            <InfoRow label="Client Phone" value={site.client_phone} />
            <InfoRow label="Contract Value" value={site.contract_value ? fmt(site.contract_value) : null} valueClass="text-gold-400 font-semibold" />
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
            {boqSummary && (
              <div className="card">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>BOQ Summary</h3>
                <InfoRow label="Estimated" value={fmt(boqSummary.total?.estimated)} />
                <InfoRow label="Actual" value={fmt(boqSummary.total?.actual)} valueClass="text-gold-400" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Financials Tab ── */}
      {activeTab === 'financials' && (
        <div>
          {financialsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={36} className="animate-spin text-gold-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Section 1 — Site Cost Summary */}
              <div className="card space-y-3">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Site Cost Summary</h3>
                {newLedgerSummary ? (
                  <>
                    <InfoRow label="Labour" value={fmt(newLedgerSummary.total_labour)} valueClass="text-blue-400 font-semibold" />
                    <InfoRow label="Expenses" value={fmt(newLedgerSummary.total_expenses)} valueClass="text-orange-400 font-semibold" />
                    <InfoRow label="Materials" value={fmt(newLedgerSummary.total_materials)} valueClass="text-purple-400 font-semibold" />
                    <InfoRow label="Grand Total" value={fmt(newLedgerSummary.grand_total)} valueClass="text-gold-400 font-bold" />
                  </>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--muted)' }}>No cost data yet</p>
                )}
                <button
                  onClick={() => navigate(`/ledger?site_id=${id}`)}
                  className="btn-outline w-full mt-2 text-sm"
                >
                  View Full Ledger →
                </button>
              </div>

              {/* Section 2 — Client Summary */}
              <div className="card space-y-3">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Client Collection Summary</h3>
                {clientSummary ? (
                  <>
                    <InfoRow label="Contract Value" value={fmt(clientSummary.contract_amount)} valueClass="text-white font-semibold" />
                    <InfoRow label="Total Paid" value={fmt(clientSummary.total_paid)} valueClass="text-green-400 font-semibold" />
                    <InfoRow
                      label="Balance Due"
                      value={fmt(clientSummary.balance_due)}
                      valueClass={parseFloat(clientSummary.balance_due) > 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}
                    />
                    <div className="pt-1">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>Collection Progress</span>
                        <span className="text-gold-400 text-xs font-semibold">{clientSummary.percent_collected}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--bg2)' }}>
                        <div
                          className="h-2.5 rounded-full bg-gold-500 transition-all duration-500"
                          style={{ width: `${Math.min(Math.max(clientSummary.percent_collected, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--muted)' }}>No client payments recorded</p>
                )}
                <button
                  onClick={() => navigate(`/ledger?site_id=${id}`)}
                  className="btn-outline w-full mt-2 text-sm"
                >
                  Add Payment →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
