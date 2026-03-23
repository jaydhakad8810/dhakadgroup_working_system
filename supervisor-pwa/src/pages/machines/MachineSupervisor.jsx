import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Plus, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, StatusBadge, Modal } from '../../components/ui'

export default function MachineSupervisor() {
  const [searchParams] = useSearchParams()
  const [machines, setMachines] = useState([])
  const [requests, setRequests] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('machines')
  const [reqModal, setReqModal] = useState(false)
  const [reqForm, setReqForm] = useState({ machine_id: '', site_id: searchParams.get('site_id') || '', notes: '', requested_for: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [m, r, s] = await Promise.all([
        api.get('/machines'),
        api.get('/machines/requests/all'),
        api.get('/sites'),
      ])
      setMachines(m.data)
      setRequests(r.data)
      setSites(s.data)
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const handleRequest = async (e) => {
    e.preventDefault()
    if (!reqForm.machine_id || !reqForm.site_id) return toast.error('Select machine and site')
    setSaving(true)
    try {
      await api.post('/machines/requests', reqForm)
      toast.success('Machine request submitted!')
      setReqModal(false)
      setReqForm(p => ({ ...p, machine_id: '', notes: '' }))
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  const statusIcon = (s) => {
    if (s === 'approved') return <CheckCircle size={14} className="text-green-400" />
    if (s === 'rejected') return <XCircle size={14} className="text-red-400" />
    return <Clock size={14} className="text-orange-400" />
  }

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">Machines</h2>
        <button onClick={() => setReqModal(true)} className="btn-primary py-2 px-3 text-sm">
          <Plus size={14} /> Request Machine
        </button>
      </div>

      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        <button onClick={() => setTab('machines')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'machines' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
          Machines ({machines.length})
        </button>
        <button onClick={() => setTab('requests')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'requests' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
          My Requests ({requests.length})
        </button>
      </div>

      {tab === 'machines' && (
        <div className="space-y-2">
          {machines.length === 0
            ? <EmptyState icon={Package} title="No machines" message="No machines available" />
            : machines.map(m => (
              <div key={m.id} className="card-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{m.name}</p>
                    <p className="text-gray-500 text-xs">{m.category?.name} {m.model ? `· ${m.model}` : ''}</p>
                    {m.site && <p className="text-primary-400 text-xs mt-0.5">@ {m.site.name}</p>}
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              </div>
            ))
          }
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-2">
          {requests.length === 0
            ? <EmptyState icon={Package} title="No requests" message="No machine requests made yet" />
            : requests.map(r => (
              <div key={r.id} className="card-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{r.machine?.name || 'Machine'}</p>
                    <p className="text-gray-500 text-xs">{r.machine?.category?.name} · {r.requested_for || new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                    {r.notes && <p className="text-gray-400 text-xs mt-0.5 truncate">{r.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(r.status)}
                    <span className={`text-xs font-semibold capitalize ${r.status === 'approved' ? 'text-green-400' : r.status === 'rejected' ? 'text-red-400' : 'text-orange-400'}`}>{r.status}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      <Modal open={reqModal} onClose={() => setReqModal(false)} title="Request Machine">
        <form onSubmit={handleRequest} className="space-y-4">
          <div>
            <label className="label">Machine *</label>
            <select className="select" value={reqForm.machine_id} onChange={e => setReqForm(p => ({ ...p, machine_id: e.target.value }))} required>
              <option value="">Select machine</option>
              {machines.filter(m => m.status !== 'in_use').map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.category?.name})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Site *</label>
            <select className="select" value={reqForm.site_id} onChange={e => setReqForm(p => ({ ...p, site_id: e.target.value }))} required>
              <option value="">Select site</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Required For Date</label>
            <input type="date" className="input" value={reqForm.requested_for} onChange={e => setReqForm(p => ({ ...p, requested_for: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} placeholder="Reason for request..." value={reqForm.notes} onChange={e => setReqForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setReqModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
