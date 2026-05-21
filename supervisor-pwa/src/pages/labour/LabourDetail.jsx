import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, ArrowRightLeft } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, StatusBadge, InfoRow, Modal } from '../../components/ui'

export default function LabourDetail() {
  const { id } = useParams()
  const [labour, setLabour] = useState(null)
  const [advances, setAdvances] = useState([])
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [advModal, setAdvModal] = useState(false)
  const [advForm, setAdvForm] = useState({ amount: '', payment_mode: 'cash' })
  const [saving, setSaving] = useState(false)
  const [wageHistory, setWageHistory] = useState([])

  const load = async () => {
    try {
      const [l, a, t, wh] = await Promise.all([
        api.get(`/labour/${id}`),
        api.get(`/labour/${id}/advances`),
        api.get(`/attendance/transfers/${id}`).catch(() => ({ data: [] })),
        api.get(`/labour/wage-history/${id}`).catch(() => ({ data: [] }))
      ])
      setLabour(l.data); setAdvances(a.data); setTransfers(t.data || []); setWageHistory(wh.data || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [id])

  const handleAdvance = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post(`/labour/${id}/advances`, advForm)
      toast.success('Advance recorded'); setAdvModal(false); setAdvForm({ amount: '', payment_mode: 'cash' }); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  if (loading) return <LoadingPage />
  if (!labour) return <div className="page-content text-gray-400">Not found</div>

  const pendingAdvance = advances.filter(a => !a.deducted).reduce((s, a) => s + parseFloat(a.amount), 0)

  return (
    <div className="page-content space-y-4">
      {/* Header */}
      <div className="card flex items-center gap-4">
        {labour.photo
          ? <img src={labour.photo} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" alt={labour.name} />
          : <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-2xl flex-shrink-0">{labour.name[0]}</div>
        }
        <div>
          <h2 className="text-white font-bold text-lg">{labour.name}</h2>
          <div className="flex gap-2 mt-1">
            <StatusBadge status={labour.labour_type} />
            <span className={labour.is_active ? 'badge-green' : 'badge-red'}>{labour.is_active ? 'Active' : 'Inactive'}</span>
          </div>
          <p className="text-primary-400 font-semibold mt-1">₹{parseFloat(labour.daily_wage).toLocaleString('en-IN')}/day</p>
        </div>
      </div>

      {/* Pending Advance Alert */}
      {pendingAdvance > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-gray-400 text-xs">Pending Advance</p>
          <p className="text-red-400 font-bold text-xl">₹{pendingAdvance.toLocaleString('en-IN')}</p>
        </div>
      )}

      {/* Info */}
      <div className="card space-y-0">
        <h3 className="text-white font-semibold mb-3">Details</h3>
        <InfoRow label="Phone" value={labour.phone} />
        <InfoRow label="Skill" value={labour.skill_type} />
        <InfoRow label="Site" value={labour.site?.name} />
        <InfoRow label="Aadhar" value={labour.aadhar_number} />
        <InfoRow label="Emergency" value={labour.emergency_contact} />
        <InfoRow label="Bank" value={labour.bank_name} />
        <InfoRow label="Account" value={labour.bank_account} />
        <InfoRow label="IFSC" value={labour.bank_ifsc} />
      </div>

      {/* Advances */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Advances</h3>
          <button onClick={() => setAdvModal(true)} className="btn-primary py-1.5 px-3 text-sm"><Plus size={14} />Give</button>
        </div>
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {advances.map(a => (
            <div key={a.id} className="flex justify-between items-center p-2.5 bg-surface-400 rounded-xl">
              <div>
                <p className="text-white font-medium">₹{parseFloat(a.amount).toLocaleString('en-IN')}</p>
                <p className="text-gray-500 text-xs">{a.payment_mode} · {new Date(a.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <span className={a.deducted ? 'badge-green' : 'badge-red'}>{a.deducted ? 'Deducted' : 'Pending'}</span>
            </div>
          ))}
          {advances.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No advances given</p>}
        </div>
      </div>

      {/* Wage History */}
      {wageHistory.length > 0 && (
        <div className="card">
          <h3 className="text-white font-semibold mb-3">Wage History</h3>
          <div className="space-y-2">
            {wageHistory.map((wh, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-surface-400 rounded-xl">
                <div>
                  <p className="text-gray-400 text-xs font-medium">{wh.effective_date}</p>
                  <p className="text-gray-500 text-xs">{wh.change_type === 'approved_request' ? 'Approved Request' : 'Direct'}</p>
                  {wh.reason && <p className="text-gray-600 text-xs truncate max-w-[180px]">"{wh.reason}"</p>}
                </div>
                <div className="text-right">
                  {wh.old_wage && <p className="text-red-400 text-xs line-through">₹{parseFloat(wh.old_wage).toLocaleString('en-IN')}/day</p>}
                  <p className="text-primary-400 font-bold text-sm">₹{parseFloat(wh.new_wage).toLocaleString('en-IN')}/day</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transfer History */}
      {transfers.length > 0 && (
        <div className="card">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <ArrowRightLeft size={15} className="text-orange-400" />
            Transfer History
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {transfers.map(t => (
              <div key={t.id} className="flex justify-between items-center p-2.5 bg-surface-400 rounded-xl">
                <div>
                  <p className="text-white text-sm font-medium">→ {t.toSite?.name || t.to_site_id}</p>
                  <p className="text-gray-500 text-xs">
                    {t.transfer_date} · {t.duration_days} day{t.duration_days !== 1 ? 's' : ''}
                    {t.reason ? ` · ${t.reason}` : ''}
                  </p>
                </div>
                <span className="text-orange-400 text-xs bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                  Transferred
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={advModal} onClose={() => setAdvModal(false)} title="Give Advance">
        <form onSubmit={handleAdvance} className="space-y-4">
          <div><label className="label">Amount (₹) *</label><input type="number" className="input" required value={advForm.amount} onChange={e => setAdvForm({ ...advForm, amount: e.target.value })} placeholder="Enter amount" /></div>
          <div><label className="label">Payment Mode</label>
            <select className="select" value={advForm.payment_mode} onChange={e => setAdvForm({ ...advForm, payment_mode: e.target.value })}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={advForm.notes || ''} onChange={e => setAdvForm({ ...advForm, notes: e.target.value })} /></div>
          <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? 'Saving...' : 'Confirm Advance'}</button>
        </form>
      </Modal>
    </div>
  )
}
