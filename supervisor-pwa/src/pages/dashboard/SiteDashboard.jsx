import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Users, ClipboardCheck, FileText,
  Package, Wrench, MapPin, Calendar, TrendingUp, ChevronRight
} from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import { useSite } from '../../context/SiteContext'
import toast from 'react-hot-toast'

function ProgressBar({ progress }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Project Progress</span>
        <span className="text-primary-400 font-semibold">{progress}%</span>
      </div>
      <div className="h-2 bg-surface-400 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default function SiteDashboard() {
  const { site_id } = useParams()
  const navigate = useNavigate()
  const { selectSite } = useSite()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Attendance history state
  const [attHistory, setAttHistory] = useState([])
  const [attLoading, setAttLoading] = useState(false)
  const [attFilter, setAttFilter] = useState({
    from_date: (() => {
      const d = new Date()
      d.setDate(d.getDate() - 60)
      return d.toISOString().split('T')[0]
    })(),
    to_date: new Date().toISOString().split('T')[0],
    labour_id: '',
  })
  const [expandedRecord, setExpandedRecord] = useState(null)
  const [siteLabours, setSiteLabours] = useState([])

  const fetchAttHistory = useCallback(async (filter) => {
    if (!site_id) return
    setAttLoading(true)
    try {
      const token = sessionStorage.getItem('sv_token') || localStorage.getItem('sv_token')
      const f = filter || attFilter
      const params = new URLSearchParams({
        site_id,
        from_date: f.from_date,
        to_date: f.to_date,
        ...(f.labour_id ? { labour_id: f.labour_id } : {}),
      })
      const res = await api.get(`/attendance?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      setAttHistory(res.data || [])
    } catch {
      toast.error('Failed to load history')
    } finally {
      setAttLoading(false)
    }
  }, [site_id, attFilter])

  useEffect(() => {
    if (site_id) {
      selectSite(site_id)
      api.get(`/dashboard/supervisor/site/${site_id}`)
        .then(r => setData(r.data))
        .catch(() => {})
        .finally(() => setLoading(false))
      // Fetch site labours for filter dropdown
      api.get(`/workorders/site-labours?site_id=${site_id}`)
        .then(r => setSiteLabours(r.data || []))
        .catch(() => {})
      // Load initial attendance history
      const d = new Date()
      d.setDate(d.getDate() - 60)
      const initFilter = {
        from_date: d.toISOString().split('T')[0],
        to_date: new Date().toISOString().split('T')[0],
        labour_id: '',
      }
      fetchAttHistory(initFilter)
    }
  }, [site_id])

  if (loading) return <LoadingPage />

  const site = data?.site || {}
  const st = data?.stats || {}

  const present = st.present ?? 0
  const half_day = st.half_day ?? 0
  const absent = st.absent ?? 0
  const attendanceTotal = present + half_day + absent

  const sections = [
    { label: 'Attendance', icon: ClipboardCheck, color: 'bg-green-500/20 text-green-400', to: `/attendance` },
    { label: 'Labour', icon: Users, color: 'bg-blue-500/20 text-blue-400', to: `/labour?site_id=${site_id}` },
    { label: 'Godown', icon: Package, color: 'bg-orange-500/20 text-orange-400', to: '/godown' },
    { label: 'Machines', icon: Wrench, color: 'bg-purple-500/20 text-purple-400', to: '/machines' },
    { label: 'Reports', icon: FileText, color: 'bg-pink-500/20 text-pink-400', to: '/reports' },
    { label: 'Expenses', icon: TrendingUp, color: 'bg-yellow-500/20 text-yellow-400', to: '/expenses' },
  ]

  return (
    <div className="page-content space-y-4">
      {/* Header */}
      <div className="card bg-gradient-to-r from-primary-500/20 to-surface-300 border-primary-500/20 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="btn-ghost p-1 shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-primary-400 shrink-0" />
              <h1 className="text-white font-bold text-lg truncate">{site.name}</h1>
            </div>
            {(site.city || site.address) && (
              <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5 ml-6">
                <MapPin size={11} />
                {site.city || site.address}
              </p>
            )}
            {site.start_date && (
              <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5 ml-6">
                <Calendar size={11} />
                {site.start_date}
                {site.expected_end_date ? ` → ${site.expected_end_date}` : ''}
              </p>
            )}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
            site.status === 'active'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {site.status}
          </span>
        </div>
        <ProgressBar progress={st.progress ?? 0} />
      </div>

      {/* Today attendance breakdown */}
      <div className="card space-y-2">
        <h3 className="text-sm font-bold text-white">Today's Attendance</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2 text-center">
            <p className="text-green-400 font-bold text-xl">{present}</p>
            <p className="text-gray-500 text-xs">Present</p>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2 text-center">
            <p className="text-yellow-400 font-bold text-xl">{half_day}</p>
            <p className="text-gray-500 text-xs">Half Day</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2 text-center">
            <p className="text-red-400 font-bold text-xl">{absent}</p>
            <p className="text-gray-500 text-xs">Absent</p>
          </div>
        </div>
        {attendanceTotal > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden gap-px mt-1">
            {present > 0 && <div className="bg-green-500" style={{ width: `${(present / attendanceTotal) * 100}%` }} />}
            {half_day > 0 && <div className="bg-yellow-400" style={{ width: `${(half_day / attendanceTotal) * 100}%` }} />}
            {absent > 0 && <div className="bg-red-500/60" style={{ width: `${(absent / attendanceTotal) * 100}%` }} />}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
            <Users size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs">Total Labour</p>
            <p className="text-white font-bold text-xl">{st.totalLabour ?? 0}</p>
          </div>
        </div>
        <div className="card-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs">Pending Tasks</p>
            <p className="text-white font-bold text-xl">{st.pendingTasks ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div>
        <h3 className="text-white font-bold text-sm mb-3">Site Features</h3>
        <div className="grid grid-cols-3 gap-2">
          {sections.map(({ label, icon: Icon, color, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-surface-300 active:scale-95 transition-transform text-center min-h-[80px] justify-center"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                <Icon size={18} />
              </div>
              <span className="text-gray-300 text-xs leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Attendance CTA */}
      <div style={{
        background: '#1a1a1a', borderRadius: '12px',
        padding: '16px', marginBottom: '8px', border: '1px solid #222'
      }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
          Today's Attendance
        </div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '14px' }}>
          Plan your day first, then mark attendance
        </div>
        <button
          onClick={() => navigate('/plan')}
          style={{
            width: '100%', background: '#FF8C00', border: 'none', borderRadius: '10px',
            padding: '14px', color: '#000', fontWeight: 'bold', fontSize: '15px',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px'
          }}
        >
          📋 Go to Daily Plan
        </button>
      </div>

      {/* Attendance History */}
      <div>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', marginBottom: '14px' }}>
          Attendance History
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="date"
              value={attFilter.from_date}
              onChange={e => setAttFilter(prev => ({ ...prev, from_date: e.target.value }))}
              style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '8px', fontSize: '13px' }}
            />
            <input type="date"
              value={attFilter.to_date}
              onChange={e => setAttFilter(prev => ({ ...prev, to_date: e.target.value }))}
              style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '8px', fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={attFilter.labour_id}
              onChange={e => setAttFilter(prev => ({ ...prev, labour_id: e.target.value }))}
              style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '8px', fontSize: '13px' }}
            >
              <option value="">All Labourers</option>
              {siteLabours.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <button
              onClick={() => fetchAttHistory(attFilter)}
              style={{
                background: '#FF8C00', border: 'none', borderRadius: '8px',
                padding: '8px 16px', color: '#000', fontWeight: 'bold',
                fontSize: '13px', cursor: 'pointer'
              }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Records */}
        {attLoading
          ? <div style={{ textAlign: 'center', color: '#888', padding: '20px' }}>Loading...</div>
          : attHistory.length === 0
            ? <div style={{ textAlign: 'center', color: '#666', padding: '20px', fontSize: '13px' }}>
                No attendance records found
              </div>
            : attHistory.map(record => (
                <div key={record.id} style={{
                  background: '#1a1a1a', borderRadius: '10px',
                  marginBottom: '10px', overflow: 'hidden', border: '1px solid #222'
                }}>
                  {/* Header row */}
                  <div
                    onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '12px 14px', cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {record.labour?.photo
                        ? <img src={record.labour.photo}
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                        : <div style={{
                            width: '36px', height: '36px', borderRadius: '50%', background: '#333',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#888', fontSize: '14px'
                          }}>
                            {record.labour?.name?.charAt(0)}
                          </div>
                      }
                      <div>
                        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>
                          {record.labour?.name}
                        </div>
                        <div style={{ color: '#888', fontSize: '12px' }}>
                          {new Date(record.date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '12px', padding: '3px 10px', borderRadius: '20px', fontWeight: 'bold',
                        background: record.status === 'present' ? '#14532d' : '#78350f',
                        color: record.status === 'present' ? '#22c55e' : '#f59e0b'
                      }}>
                        {record.status === 'present' ? 'Present'
                          : record.status === 'half_day' ? 'Half Day' : 'Absent'}
                      </span>
                      <span style={{ color: '#666', fontSize: '16px' }}>
                        {expandedRecord === record.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedRecord === record.id && (
                    <div style={{ borderTop: '1px solid #2a2a2a', padding: '14px' }}>
                      {/* Check-in / Check-out photos */}
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '6px' }}>CHECK-IN PHOTO</div>
                          {record.check_in_photo
                            ? <img src={record.check_in_photo}
                                onClick={() => window.open(record.check_in_photo, '_blank')}
                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} alt="" />
                            : <div style={{ width: '100%', height: '80px', background: '#222', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '12px' }}>No photo</div>
                          }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '6px' }}>CHECK-OUT PHOTO</div>
                          {record.check_out_photo
                            ? <img src={record.check_out_photo}
                                onClick={() => window.open(record.check_out_photo, '_blank')}
                                style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }} alt="" />
                            : <div style={{ width: '100%', height: '80px', background: '#222', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '12px' }}>No photo</div>
                          }
                        </div>
                      </div>

                      {/* Tasks from plan_items */}
                      {record.plan_items?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>TASKS</div>
                          {record.plan_items.map((item, i) => (
                            <div key={i} style={{ background: '#111', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px' }}>
                              <div style={{ color: '#fff', fontSize: '13px' }}>{item.step_name || 'Task'}</div>
                              {Array.isArray(item.flat_nos) && item.flat_nos.length > 0 && (
                                <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>
                                  Flats: {item.flat_nos.join(', ')}
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                <span style={{ fontSize: '11px', color: item.status === 'done' ? '#22c55e' : '#f59e0b' }}>
                                  {item.status === 'done' ? '✓ Done'
                                    : item.status === 'carry_forward' ? '↩ Carried Forward' : item.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Materials used */}
                      {record.plan_items?.some(i => i.material_name) && (
                        <div>
                          <div style={{ color: '#888', fontSize: '11px', marginBottom: '8px' }}>MATERIALS USED</div>
                          {record.plan_items.filter(i => i.material_name).map((item, i) => (
                            <div key={i} style={{
                              display: 'flex', justifyContent: 'space-between',
                              background: '#111', borderRadius: '6px',
                              padding: '8px 10px', marginBottom: '6px'
                            }}>
                              <span style={{ color: '#ccc', fontSize: '13px' }}>{item.material_name}</span>
                              <span style={{ color: '#FF8C00', fontSize: '13px' }}>
                                {item.actual_qty || item.estimated_qty || '—'} {item.unit || ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
        }
      </div>
    </div>
  )
}
