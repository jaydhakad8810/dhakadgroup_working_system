import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, ChevronRight, Users, UserPlus, X } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, EmptyState, StatusBadge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function LabourList() {
  const [tab, setTab] = useState('myteam')
  const [labour, setLabour] = useState([])
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSite, setFilterSite] = useState('')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  // "Add from Database" tab state
  const [dbLabour, setDbLabour] = useState([])
  const [dbSearch, setDbSearch] = useState('')
  const [dbLoading, setDbLoading] = useState(false)
  const [addModal, setAddModal] = useState(null) // labour record
  const [selectedSite, setSelectedSite] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const siteFromUrl = searchParams.get('site_id')
    if (siteFromUrl) setFilterSite(siteFromUrl)
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ is_active: 'true' })
      if (filterSite) params.append('site_id', filterSite)
      const [l, s] = await Promise.all([api.get(`/labour?${params}`), api.get('/sites')])
      setLabour(l.data); setSites(s.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filterSite])

  // Debounced search for DB tab
  useEffect(() => {
    if (tab !== 'database') return
    const timer = setTimeout(() => {
      setDbLoading(true)
      api.get(`/labour/all-available${dbSearch ? '?search=' + encodeURIComponent(dbSearch) : ''}`)
        .then(r => setDbLabour(r.data))
        .catch(() => {})
        .finally(() => setDbLoading(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [dbSearch, tab])

  useEffect(() => {
    if (tab === 'database' && dbLabour.length === 0 && !dbLoading) {
      setDbLoading(true)
      api.get('/labour/all-available')
        .then(r => setDbLabour(r.data))
        .catch(() => {})
        .finally(() => setDbLoading(false))
    }
  }, [tab])

  const filtered = labour.filter(l => l.name.toLowerCase().includes(search.toLowerCase()))

  const handleAddToTeam = async () => {
    if (!selectedSite) return toast.error('Select a site')
    setAdding(true)
    try {
      const site = sites.find(s => s.id === selectedSite)
      await api.put(`/labour/${addModal.id}`, {
        assigned_site_id: selectedSite,
        supervisor_id: user?.id
      })
      toast.success(`${addModal.name} added to ${site?.name}!`)
      setAddModal(null)
      setSelectedSite('')
      // Remove from DB list
      setDbLabour(prev => prev.filter(l => l.id !== addModal.id))
      // Refresh my team
      load()
    } catch { toast.error('Failed to add') }
    setAdding(false)
  }

  if (loading && tab === 'myteam') return <LoadingPage />

  return (
    <div className="page-content space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg2, #1a1a1a)' }}>
        <button onClick={() => setTab('myteam')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'myteam' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
          My Team ({labour.length})
        </button>
        <button onClick={() => setTab('database')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'database' ? 'bg-primary-500 text-white' : 'text-gray-400'}`}>
          Add from Database
        </button>
      </div>

      {/* MY TEAM TAB */}
      {tab === 'myteam' && (
        <>
          <div className="space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input className="input pl-10" placeholder="Search labour..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select" value={filterSite} onChange={e => setFilterSite(e.target.value)}>
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <button onClick={() => navigate('/labour/add')} className="btn-primary w-full">
            <Plus size={18} /> Add Labour
          </button>

          <p className="text-gray-500 text-sm">{filtered.length} workers</p>

          {filtered.length === 0
            ? <EmptyState icon={Users} title="No labour found" message="Add labour to get started." action={<button onClick={() => navigate('/labour/add')} className="btn-primary">Add Labour</button>} />
            : (
              <div className="space-y-2">
                {filtered.map(l => (
                  <button key={l.id} onClick={() => navigate(`/labour/${l.id}`)}
                    className="card w-full text-left active:scale-95 transition-transform">
                    <div className="flex items-center gap-3">
                      {l.photo
                        ? <img src={l.photo} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt={l.name} />
                        : <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-lg flex-shrink-0">{l.name[0]}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-semibold truncate">{l.name}</p>
                          <StatusBadge status={l.labour_type} />
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">{l.site?.name || 'No site'} · ₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}/day</p>
                        {l.phone && <p className="text-gray-600 text-xs">{l.phone}</p>}
                      </div>
                      <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )
          }
        </>
      )}

      {/* ADD FROM DATABASE TAB */}
      {tab === 'database' && (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input pl-10" placeholder="Search by name, phone, aadhar..."
              value={dbSearch} onChange={e => setDbSearch(e.target.value)} />
          </div>

          {dbLoading ? (
            <div className="text-center py-8 text-gray-400">Searching...</div>
          ) : (
            <div className="space-y-2">
              {dbLabour.map(l => (
                <div key={l.id} className="card flex items-center gap-3">
                  {l.photo
                    ? <img src={l.photo} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" alt={l.name} />
                    : <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold text-lg flex-shrink-0">{l.name[0]}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold">{l.name}</p>
                      <StatusBadge status={l.labour_type} />
                    </div>
                    <p className="text-gray-500 text-xs">₹{parseFloat(l.daily_wage).toLocaleString('en-IN')}/day</p>
                    {l.site
                      ? <p className="text-orange-400 text-xs">Currently at: {l.site.name}</p>
                      : <p className="text-green-400 text-xs">Available</p>
                    }
                  </div>
                  <button onClick={() => { setAddModal(l); setSelectedSite('') }}
                    className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-400 active:scale-95 transition-transform">
                    <UserPlus size={16} />
                  </button>
                </div>
              ))}
              {dbLabour.length === 0 && !dbLoading && (
                <EmptyState icon={Users} title="No labour found" message="Try a different search term." />
              )}
            </div>
          )}
        </>
      )}

      {/* Add to team bottom-sheet modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setAddModal(null)}>
          <div className="w-full max-w-md bg-surface-500 rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Add {addModal.name} to which site?</h3>
              <button onClick={() => setAddModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <select className="select w-full" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
              <option value="">Select a site</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={handleAddToTeam} disabled={adding || !selectedSite} className="btn-primary w-full py-4">
              {adding ? 'Adding...' : 'Add to Team'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
