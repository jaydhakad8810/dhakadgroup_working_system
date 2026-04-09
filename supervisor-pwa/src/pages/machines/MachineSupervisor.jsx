import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Plus, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, StatusBadge, Modal } from '../../components/ui'

// ── Defined OUTSIDE parent component ─────────────────────────────────────────
function MachineRequestModal({ open, onClose, preselectedMachine, sites, machines, onSubmit, saving }) {
  const [form, setForm] = useState({ machine_id: '', site_id: '', notes: '', requested_for: new Date().toISOString().split('T')[0] })

  useEffect(() => {
    if (open) {
      setForm(p => ({ ...p, machine_id: preselectedMachine?.id || '', notes: '' }))
    }
  }, [open, preselectedMachine])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.machine_id || !form.site_id) return toast.error('Select machine and site')
    onSubmit(form)
  }

  return (
    <Modal open={open} onClose={onClose} title={preselectedMachine ? `Request: ${preselectedMachine.name}` : 'Request Machine'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Machine *</label>
          <select className="select" value={form.machine_id} onChange={e => setForm(p => ({ ...p, machine_id: e.target.value }))} required>
            <option value="">Select machine</option>
            {machines.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.category?.name}) — {m.status}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Site *</label>
          <select className="select" value={form.site_id} onChange={e => setForm(p => ({ ...p, site_id: e.target.value }))} required>
            <option value="">Select site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Required For Date</label>
          <input type="date" className="input" value={form.requested_for} onChange={e => setForm(p => ({ ...p, requested_for: e.target.value }))} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} placeholder="Reason for request..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MachineSupervisor() {
  const [searchParams] = useSearchParams()
  const [machines, setMachines] = useState([])
  const [requests, setRequests] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('machines')
  const [reqModal, setReqModal] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [m, r, s] = await Promise.all([
        api.get('/machines?all=true'),
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

  const openRequest = (machine = null) => {
    setSelectedMachine(machine)
    setReqModal(true)
  }

  const handleRequest = async (form) => {
    setSaving(true)
    try {
      await api.post('/machines/requests', form)
      toast.success('Machine request submitted!')
      setReqModal(false)
      setSelectedMachine(null)
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
        <button onClick={() => openRequest()} className="btn-primary py-2 px-3 text-sm">
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
        <div className="space-y-3">
          {machines.length === 0
            ? <EmptyState icon={Package} title="No machines" message="No machines available" />
            : machines.map(m => (
              <div key={m.id} className="card overflow-hidden p-0">
                {m.photo
                  ? <img src={m.photo} alt={m.name} className="w-full h-40 object-cover" />
                  : <div className="w-full h-28 bg-surface-400 flex items-center justify-center"><Package size={36} className="text-gray-600" /></div>
                }
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-semibold">{m.name}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-gray-500 text-xs">{m.category?.name}{m.model ? ` · ${m.model}` : ''}</p>
                  {m.site && <p className="text-primary-400 text-xs mt-0.5">@ {m.site.name}</p>}
                  <button
                    onClick={() => openRequest(m)}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-semibold bg-primary-500/20 text-primary-400 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Plus size={13} /> Request This Machine
                  </button>
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

      <MachineRequestModal
        open={reqModal}
        onClose={() => { setReqModal(false); setSelectedMachine(null) }}
        preselectedMachine={selectedMachine}
        sites={sites}
        machines={machines}
        onSubmit={handleRequest}
        saving={saving}
      />
    </div>
  )
}
