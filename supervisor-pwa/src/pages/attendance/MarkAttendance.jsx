import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, Save, Loader2, ArrowRightLeft } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, Modal } from '../../components/ui'
import { Users } from 'lucide-react'

export default function MarkAttendance() {
  const [searchParams] = useSearchParams()
  const [sites, setSites] = useState([])
  const [labour, setLabour] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterSite, setFilterSite] = useState(searchParams.get('site_id') || '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // Transfer modal state
  const [transferModal, setTransferModal] = useState(false)
  const [transferLabour, setTransferLabour] = useState(null)
  const [transferForm, setTransferForm] = useState({ to_site_id: '', reason: '', duration_days: 1 })
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    api.get('/sites').then(r => setSites(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!filterSite) { setLabour([]); return }
    setLoading(true)
    Promise.all([
      api.get(`/labour?site_id=${filterSite}&is_active=true`),
      api.get(`/attendance?site_id=${filterSite}&date=${date}`)
    ]).then(([l, a]) => {
      setLabour(l.data)
      const map = {}
      a.data.forEach(r => { map[r.labour_id] = r.status })
      setAttendance(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [filterSite, date])

  const setStatus = (id, status) => setAttendance(p => ({ ...p, [id]: p[id] === status ? undefined : status }))
  const markAll = (status) => { const m = {}; labour.forEach(l => { m[l.id] = status }); setAttendance(m) }

  const handleSave = async () => {
    if (!filterSite) return toast.error('Select a site first')
    const records = labour.map(l => ({ labour_id: l.id, status: attendance[l.id] || 'absent', day_multiplier: attendance[l.id] === 'half_day' ? 0.5 : 1 }))
    setSaving(true)
    try {
      await api.post('/attendance/bulk', { site_id: filterSite, date, records })
      toast.success(`Attendance saved for ${records.length} workers!`)
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  const openTransfer = (l) => {
    setTransferLabour(l)
    setTransferForm({ to_site_id: '', reason: '', duration_days: 1 })
    setTransferModal(true)
  }

  const handleTransfer = async () => {
    if (!transferForm.to_site_id) return toast.error('Select destination site')
    setTransferring(true)
    try {
      await api.post('/attendance/transfer', {
        labour_id: transferLabour.id,
        from_site_id: filterSite,
        to_site_id: transferForm.to_site_id,
        reason: transferForm.reason,
        duration_days: transferForm.duration_days,
        transfer_date: date
      })
      toast.success(`${transferLabour.name} transferred successfully!`)
      setTransferModal(false)
      // Refresh labour list
      const l = await api.get(`/labour?site_id=${filterSite}&is_active=true`)
      setLabour(l.data)
    } catch (err) { toast.error(err.response?.data?.message || 'Transfer failed') }
    setTransferring(false)
  }

  const presentCount = Object.values(attendance).filter(v => v === 'present').length
  const halfCount = Object.values(attendance).filter(v => v === 'half_day').length
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length
  const otherSites = sites.filter(s => s.id !== filterSite)

  return (
    <div className="page-content space-y-4">
      <div className="space-y-2">
        <select className="select" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
          <option value="">Select Site *</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
      </div>

      {labour.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center"><p className="text-green-400 font-bold text-xl">{presentCount}</p><p className="text-gray-400 text-xs">Present</p></div>
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-center"><p className="text-primary-400 font-bold text-xl">{halfCount}</p><p className="text-gray-400 text-xs">Half Day</p></div>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center"><p className="text-red-400 font-bold text-xl">{absentCount}</p><p className="text-gray-400 text-xs">Absent</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => markAll('present')} className="flex-1 py-2.5 rounded-xl bg-green-500/20 text-green-400 font-medium text-sm active:scale-95 transition-transform">All Present</button>
            <button onClick={() => markAll('absent')} className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 font-medium text-sm active:scale-95 transition-transform">All Absent</button>
          </div>
        </>
      )}

      {loading ? <LoadingPage />
        : !filterSite ? <EmptyState icon={Users} title="Select a site" message="Choose a site to mark attendance" />
        : !labour.length ? <EmptyState icon={Users} title="No labour" message="No active labour on this site" />
        : (
          <div className="space-y-2">
            {labour.map(l => {
              const status = attendance[l.id]
              return (
                <div key={l.id} className="card-sm">
                  <div className="flex items-center gap-3">
                    {l.photo ? <img src={l.photo} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-lg flex-shrink-0">{l.name[0]}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{l.name}</p>
                      <p className="text-gray-500 text-xs">₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}/day</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setStatus(l.id, 'present')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'present' ? 'bg-green-500 text-white' : 'bg-surface-200 text-gray-500'}`}><CheckCircle size={16} /></button>
                      <button onClick={() => setStatus(l.id, 'half_day')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'half_day' ? 'bg-primary-500 text-white' : 'bg-surface-200 text-gray-500'}`}><Clock size={16} /></button>
                      <button onClick={() => setStatus(l.id, 'absent')} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-surface-200 text-gray-500'}`}><XCircle size={16} /></button>
                      {/* Transfer button */}
                      <button onClick={() => openTransfer(l)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-200 text-gray-500 hover:text-orange-400 transition-all active:scale-95" title="Transfer labour"><ArrowRightLeft size={14} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      {labour.length > 0 && (
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-4 sticky bottom-24 shadow-xl shadow-primary-500/20">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : `Save Attendance (${presentCount + halfCount} present)`}
        </button>
      )}

      {/* Transfer Modal */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)} title={`Transfer ${transferLabour?.name}`}>
        <div className="space-y-4">
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm text-orange-300">
            <p>Transferring <strong>{transferLabour?.name}</strong> from current site to another.</p>
          </div>
          <div>
            <label className="label">Transfer To Site *</label>
            <select className="select" value={transferForm.to_site_id} onChange={e => setTransferForm(p => ({ ...p, to_site_id: e.target.value }))}>
              <option value="">Select destination site</option>
              {otherSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Duration (days)</label>
            <input type="number" className="input" min={1} value={transferForm.duration_days} onChange={e => setTransferForm(p => ({ ...p, duration_days: e.target.value }))} />
          </div>
          <div>
            <label className="label">Reason / Note</label>
            <textarea className="input" rows={3} placeholder="Reason for transfer..." value={transferForm.reason} onChange={e => setTransferForm(p => ({ ...p, reason: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setTransferModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleTransfer} disabled={transferring} className="btn-primary flex-1">
              {transferring ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
              {transferring ? 'Transferring...' : 'Transfer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
