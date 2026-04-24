import { useEffect, useState } from 'react'
import { Package, Loader2, CheckCircle, Clock, XCircle, Wrench } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { LoadingPage, EmptyState, Modal } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

// ── RequestMachineModal — defined OUTSIDE parent ──────────────────────────────
function RequestMachineModal({ machine, onClose, supervisorSite, supervisorSiteId, supervisorName }) {
  const today = new Date().toISOString().split('T')[0]
  const [purpose, setPurpose] = useState('')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState('')
  const [urgency, setUrgency] = useState('normal')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!purpose.trim()) return toast.error('Purpose is required')
    if (!dateTo) return toast.error('Date Needed To is required')
    setSaving(true)
    try {
      await api.post('/machines/requests', {
        machine_id: machine.id,
        site_id: supervisorSiteId,
        purpose,
        date_from: dateFrom,
        date_to: dateTo,
        urgency,
        notes,
      })
      toast.success('Machine request sent')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request')
    }
    setSaving(false)
  }

  return (
    <Modal open={true} onClose={onClose} title="Request Machine">
      <div className="space-y-4">
        <div className="bg-surface-400 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Machine Name</span>
            <span className="text-white text-sm font-semibold">{machine.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Machine ID</span>
            <span className="text-white text-sm font-mono">
              {machine.registration_number || machine.serial_number || machine.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Requesting Site</span>
            <span className="text-white text-sm font-semibold">{supervisorSite || '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Requested By</span>
            <span className="text-white text-sm">{supervisorName}</span>
          </div>
        </div>

        <div>
          <label className="label">Purpose *</label>
          <input
            className="input"
            placeholder="Why do you need this machine?"
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Date Needed From *</label>
            <input
              type="date"
              className="input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Date Needed To *</label>
            <input
              type="date"
              className="input"
              value={dateTo}
              min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Urgency</label>
          <select className="select" value={urgency} onChange={e => setUrgency(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            placeholder="Any additional notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1">
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Status filter config ──────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'in_use', label: 'In Use' },
  { key: 'maintenance', label: 'Maintenance' },
]

function StatusBadge({ status }) {
  if (status === 'available')
    return <span className="text-xs px-2 py-1 rounded-full font-semibold bg-green-500/15 text-green-400 border border-green-500/20">Available</span>
  if (status === 'in_use')
    return <span className="text-xs px-2 py-1 rounded-full font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/20">In Use</span>
  if (status === 'maintenance')
    return <span className="text-xs px-2 py-1 rounded-full font-semibold bg-red-500/15 text-red-400 border border-red-500/20">Maintenance</span>
  return <span className="text-xs px-2 py-1 rounded-full font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/20">{status}</span>
}

function RequestStatusIcon({ status }) {
  if (status === 'approved') return <CheckCircle size={14} className="text-green-400" />
  if (status === 'rejected') return <XCircle size={14} className="text-red-400" />
  return <Clock size={14} className="text-orange-400" />
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MachineSupervisor() {
  const { user } = useAuth()
  const [machines, setMachines] = useState([])
  const [requests, setRequests] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('machines')
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [showRequestModal, setShowRequestModal] = useState(false)

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

  const supervisorSite = sites.find(s => s.id === user?.site_id)
  const supervisorSiteName = supervisorSite?.name || ''
  const supervisorSiteId = user?.site_id || ''
  const supervisorName = user?.name || ''

  const filteredMachines = activeFilter === 'all'
    ? machines
    : machines.filter(m => m.status === activeFilter)

  const onRequestClick = (machine) => {
    setSelectedMachine(machine)
    setShowRequestModal(true)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      {/* Main tabs */}
      <div className="flex gap-1 bg-surface-400 rounded-xl p-1">
        <button
          onClick={() => setTab('machines')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'machines' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}
        >
          Machines ({machines.length})
        </button>
        <button
          onClick={() => setTab('requests')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'requests' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}
        >
          My Requests ({requests.length})
        </button>
      </div>

      {tab === 'machines' && (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  activeFilter === f.key
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'text-gray-400 border-gray-600 bg-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Machine cards */}
          <div className="space-y-3">
            {filteredMachines.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No machines"
                message={`No ${activeFilter === 'all' ? '' : activeFilter.replace('_', ' ')} machines found`}
              />
            ) : filteredMachines.map(m => (
              <div key={m.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight">{m.name}</h3>
                    <p className="text-gray-400 text-sm mt-0.5">{m.category?.name || m.type || '—'}</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      ID: {m.registration_number || m.serial_number || m.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={m.status} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 text-xs">Location:</span>
                  <span className="text-gray-300 text-xs font-medium">
                    {m.site?.name || m.current_site?.name || 'Godown / Not Assigned'}
                  </span>
                </div>

                {m.status === 'in_use' && m.site?.name && (
                  <p className="text-orange-400 text-xs -mt-2">Currently at: {m.site.name}</p>
                )}

                <button
                  onClick={() => onRequestClick(m)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-orange-500/25"
                >
                  <Wrench size={14} /> Request Machine
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-2">
          {requests.length === 0 ? (
            <EmptyState icon={Package} title="No requests" message="No machine requests made yet" />
          ) : requests.map(r => (
            <div key={r.id} className="card-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{r.machine?.name || 'Machine'}</p>
                  <p className="text-gray-500 text-xs">
                    {r.machine?.category?.name} · {r.requested_for || new Date(r.createdAt).toLocaleDateString('en-IN')}
                  </p>
                  {r.notes && <p className="text-gray-400 text-xs mt-0.5 truncate">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <RequestStatusIcon status={r.status} />
                  <span className={`text-xs font-semibold capitalize ${
                    r.status === 'approved' ? 'text-green-400'
                    : r.status === 'rejected' ? 'text-red-400'
                    : 'text-orange-400'
                  }`}>{r.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showRequestModal && selectedMachine && (
        <RequestMachineModal
          machine={selectedMachine}
          onClose={() => { setShowRequestModal(false); setSelectedMachine(null) }}
          supervisorSite={supervisorSiteName}
          supervisorSiteId={supervisorSiteId}
          supervisorName={supervisorName}
        />
      )}
    </div>
  )
}
