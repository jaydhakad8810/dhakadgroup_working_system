import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, BarChart3 } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const WORK_TYPE_LABELS = { internal: 'Internal', external: 'External', oil: 'Oil', gypsum: 'Gypsum', other: 'Other' }

function getCellStyle(pct) {
  if (!pct || pct === 0) return {
    background: '#1a1a1a', color: '#555',
    textAlign: 'center', fontSize: '12px'
  }
  if (pct >= 100) return {
    background: '#14532d', color: '#22c55e',
    textAlign: 'center', fontWeight: 'bold', fontSize: '12px'
  }
  return {
    background: '#431407', color: '#fb923c',
    textAlign: 'center', fontSize: '12px'
  }
}

// ── Site selector ────────────────────────────────────────────────────────────
function SiteList({ sites, onSelect }) {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-lg font-bold text-white mb-4">Reports</h2>
      {sites.map(site => (
        <button key={site.id} onClick={() => onSelect(site)}
          className="w-full text-left p-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
          style={{ background: '#1c1c1c' }}>
          <p className="font-semibold text-white">{site.name}</p>
          {site.client_name && <p className="text-xs mt-0.5" style={{ color: '#888' }}>{site.client_name}</p>}
        </button>
      ))}
      {sites.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: '#555' }}>No sites assigned</p>
        </div>
      )}
    </div>
  )
}

// ── Process selector ─────────────────────────────────────────────────────────
function ProcessList({ site, processes, loading, onSelect, onBack }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 rounded-xl active:scale-95" style={{ background: '#1c1c1c' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div>
          <h2 className="text-base font-bold text-white">{site.name}</h2>
          <p className="text-xs" style={{ color: '#888' }}>Select a process</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin" style={{ color: '#FF8C00' }} /></div>
      ) : processes.length === 0 ? (
        <div className="text-center py-12">
          <p style={{ color: '#555' }}>No processes created for this site yet</p>
        </div>
      ) : (
        processes.map(pm => (
          <button key={pm.id} onClick={() => onSelect(pm)}
            className="w-full text-left p-4 rounded-2xl border border-white/10 active:scale-95 transition-all"
            style={{ background: '#1c1c1c' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">{pm.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#FF8C00/15', color: '#FF8C00', border: '1px solid #FF8C00/30' }}>
                    {WORK_TYPE_LABELS[pm.work_type] || pm.work_type}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full capitalize"
                    style={{ background: pm.status === 'active' ? '#14532d' : '#1c1c1c', color: pm.status === 'active' ? '#22c55e' : '#888' }}>
                    {pm.status}
                  </span>
                </div>
              </div>
              <span style={{ color: '#FF8C00', fontSize: '20px' }}>→</span>
            </div>
            <div className="flex gap-3 mt-2 text-xs" style={{ color: '#555' }}>
              <span>{pm.areas?.length || 0} areas</span>
              <span>{pm.flats?.length || 0} flats</span>
              <span>{pm.steps?.length || 0} steps</span>
            </div>
          </button>
        ))
      )}
    </div>
  )
}

// ── Progress grid ────────────────────────────────────────────────────────────
function ProgressGrid({ process: pm, flats, steps, progress, loading, onBack }) {
  const totalCells = flats.length * steps.length
  const sumPct = progress.reduce((acc, p) => acc + (p.done_percentage || 0), 0)
  const completedCells = progress.filter(p => p.done_percentage >= 100).length
  const overallPct = totalCells > 0 ? Math.round(sumPct / (totalCells * 100) * 100) : 0

  function getProg(flat_id, step_id) {
    return progress.find(p => p.flat_id === flat_id && p.step_id === step_id)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={onBack} className="p-2 rounded-xl active:scale-95" style={{ background: '#1c1c1c' }}>
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white truncate">{pm?.title}</h2>
          <p className="text-xs" style={{ color: '#888' }}>Progress Grid</p>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4">
        <div className="p-3 rounded-2xl" style={{ background: '#1c1c1c' }}>
          <p className="text-xs mb-1.5" style={{ color: '#888' }}>
            {completedCells} of {totalCells} tasks completed — {overallPct}%
          </p>
          <div className="w-full h-2.5 rounded-full" style={{ background: '#333' }}>
            <div className="h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(overallPct, 100)}%`, background: '#FF8C00' }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin" style={{ color: '#FF8C00' }} /></div>
      ) : flats.length === 0 || steps.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p style={{ color: '#555' }}>
            {flats.length === 0 ? 'No flats in this process.' : 'No steps in this process.'}
          </p>
        </div>
      ) : (
        <div className="px-2" style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: '400px', width: '100%' }}>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  background: '#111', padding: '8px 10px',
                  textAlign: 'left', borderBottom: '1px solid #333',
                  minWidth: '90px', color: '#888', fontSize: '11px'
                }}>
                  Flat
                </th>
                {steps.map(step => (
                  <th key={step.id} style={{
                    padding: '8px 6px', textAlign: 'center',
                    borderBottom: '1px solid #333', borderLeft: '1px solid #333',
                    color: '#ccc', fontSize: '11px', minWidth: '80px', whiteSpace: 'nowrap'
                  }}>
                    {step.step_name.length > 10 ? step.step_name.slice(0, 10) + '…' : step.step_name}
                    {step.coat_count > 1 && (
                      <span style={{ color: '#555', fontSize: '10px', display: 'block' }}>×{step.coat_count}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flats.map(flat => (
                <tr key={flat.id}>
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 5,
                    background: '#111', padding: '8px 10px',
                    borderBottom: '1px solid #222',
                    fontWeight: 'bold', color: '#fff', fontSize: '12px'
                  }}>
                    {flat.flat_no}
                    {flat.bhk_type && (
                      <span style={{ color: '#555', fontSize: '10px', display: 'block', fontWeight: 'normal' }}>
                        {flat.bhk_type}
                      </span>
                    )}
                  </td>
                  {steps.map(step => {
                    const prog = getProg(flat.id, step.id)
                    const pct = prog?.done_percentage || 0
                    return (
                      <td key={step.id} style={{
                        padding: '8px 4px',
                        borderBottom: '1px solid #222',
                        borderLeft: '1px solid #222',
                        ...getCellStyle(pct)
                      }}>
                        {pct >= 100 ? 'DONE' : pct > 0 ? `${pct}%` : '—'}
                        {prog?.date_updated && pct > 0 && pct < 100 && (
                          <div style={{ fontSize: '9px', color: '#f97316', marginTop: '1px' }}>
                            {new Date(prog.date_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── SiteReports (main component) ─────────────────────────────────────────────
export default function SiteReports() {
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(null)
  const [processes, setProcesses] = useState([])
  const [selectedProcess, setSelectedProcess] = useState(null)
  const [flats, setFlats] = useState([])
  const [steps, setSteps] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [processLoading, setProcessLoading] = useState(false)
  const [gridLoading, setGridLoading] = useState(false)
  const [view, setView] = useState('sites') // 'sites'|'processes'|'grid'

  useEffect(() => {
    api.get('/sites')
      .then(r => {
        const s = r.data || []
        setSites(s)
        if (s.length === 1) {
          handleSelectSite(s[0])
        }
      })
      .catch(() => toast.error('Failed to load sites'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelectSite = (site) => {
    setSelectedSite(site)
    setView('processes')
    setProcessLoading(true)
    api.get(`/process-master?site_id=${site.id}`)
      .then(r => setProcesses(r.data || []))
      .catch(() => toast.error('Failed to load processes'))
      .finally(() => setProcessLoading(false))
  }

  const handleSelectProcess = (pm) => {
    setSelectedProcess(pm)
    setView('grid')
    setGridLoading(true)
    api.get(`/process-master/${pm.id}/progress`)
      .then(r => {
        setFlats(r.data.flats || [])
        setSteps(r.data.steps || [])
        setProgress(r.data.progress || [])
      })
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setGridLoading(false))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 size={32} className="animate-spin" style={{ color: '#FF8C00' }} />
      </div>
    )
  }

  if (view === 'grid') {
    return (
      <ProgressGrid
        process={selectedProcess}
        flats={flats}
        steps={steps}
        progress={progress}
        loading={gridLoading}
        onBack={() => setView('processes')}
      />
    )
  }

  if (view === 'processes') {
    return (
      <ProcessList
        site={selectedSite}
        processes={processes}
        loading={processLoading}
        onSelect={handleSelectProcess}
        onBack={() => sites.length > 1 ? setView('sites') : null}
      />
    )
  }

  return <SiteList sites={sites} onSelect={handleSelectSite} />
}
