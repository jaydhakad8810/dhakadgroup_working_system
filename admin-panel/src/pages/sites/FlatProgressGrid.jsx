import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage } from '../../components/ui'
import toast from 'react-hot-toast'

function getCellStyle(pct) {
  if (!pct || pct === 0) return {
    background: 'var(--bg3)', color: 'var(--muted)',
    textAlign: 'center', cursor: 'pointer'
  }
  if (pct >= 100) return {
    background: '#14532d', color: '#22c55e',
    textAlign: 'center', fontWeight: 'bold', cursor: 'pointer'
  }
  return {
    background: '#431407', color: '#fb923c',
    textAlign: 'center', cursor: 'pointer'
  }
}

// ── HistoryModal ─────────────────────────────────────────────────────────────
function HistoryModal({ flat, step, progressRecord, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!progressRecord?.id) return
    setLoading(true)
    api.get(`/process-master/progress/${progressRecord.id}/history`)
      .then(r => setHistory(r.data || []))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [progressRecord?.id])

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--bg1)', border: '1px solid var(--bg3)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold" style={{ color: 'var(--text)' }}>
              Flat {flat.flat_no} — {step.step_name}
            </p>
            {flat.bhk_type && <p className="text-xs" style={{ color: 'var(--muted)' }}>{flat.bhk_type}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
            <X size={18} style={{ color: 'var(--muted)' }} />
          </button>
        </div>

        {progressRecord && (
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
            <div style={getCellStyle(progressRecord.done_percentage)} className="w-14 h-10 rounded-lg flex items-center justify-center text-sm font-bold">
              {progressRecord.done_percentage >= 100 ? 'DONE' : progressRecord.done_percentage > 0 ? `${progressRecord.done_percentage}%` : '—'}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Current: {progressRecord.done_percentage}%</p>
              {progressRecord.date_updated && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Last updated: {new Date(progressRecord.date_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--muted)' }}>Update History</p>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-gold-500" /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>No updates recorded yet</p>
          ) : (
            <div className="space-y-0 relative">
              <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: 'var(--bg3)' }} />
              {history.map((h, i) => (
                <div key={h.id || i} className="relative pl-8 pb-4">
                  <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-gold-500"
                    style={{ background: 'var(--bg1)' }} />
                  <div className="p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        {new Date(h.date_worked).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#431407', color: '#fb923c' }}>
                        {h.done_percentage}%
                      </span>
                    </div>
                    {h.notes && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{h.notes}</p>}
                    {h.material_used?.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Materials used:</p>
                        {h.material_used.map((m, j) => (
                          <p key={j} className="text-xs pl-2" style={{ color: 'var(--muted)' }}>• {m.name || m.material_name}: {m.quantity} {m.unit}</p>
                        ))}
                      </div>
                    )}
                    {h.labour_ids?.length > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        {h.labour_ids.length} labour assigned
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── FlatProgressGrid ─────────────────────────────────────────────────────────
export default function FlatProgressGrid() {
  const { siteId, processId } = useParams()
  const [process, setProcess] = useState(null)
  const [flats, setFlats] = useState([])
  const [steps, setSteps] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyModal, setHistoryModal] = useState(null) // {flat, step, progressRecord}

  useEffect(() => {
    api.get(`/process-master/${processId}/progress`)
      .then(res => {
        setProcess(res.data.process || null)
        setFlats(res.data.flats || [])
        setSteps(res.data.steps || [])
        setProgress(res.data.progress || [])
      })
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setLoading(false))
  }, [processId])

  function getProgress(flat_id, step_id) {
    return progress.find(p => p.flat_id === flat_id && p.step_id === step_id)
  }

  const openHistory = (flat, step, prog) => {
    setHistoryModal({ flat, step, progressRecord: prog })
  }

  // Summary stats
  const totalCells = flats.length * steps.length
  const completedCells = progress.filter(p => p.done_percentage >= 100).length
  const sumPct = progress.reduce((acc, p) => acc + (p.done_percentage || 0), 0)
  const overallPct = totalCells > 0 ? Math.round(sumPct / (totalCells * 100) * 100) : 0

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/sites/${siteId}`} className="btn-ghost"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            {process?.title || 'Progress Grid'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Last updated: {today}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Flats', value: flats.length },
          { label: 'Steps', value: steps.length },
          { label: 'Done', value: completedCells },
          { label: 'Overall', value: `${overallPct}%` },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center py-3">
            <p className="text-xl font-bold text-gold-400">{value}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="card py-3">
        <div className="flex justify-between mb-2">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Overall Progress</span>
          <span className="text-sm font-bold text-gold-400">{overallPct}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--bg3)' }}>
          <div className="h-2.5 rounded-full bg-gold-500 transition-all duration-700"
            style={{ width: `${Math.min(overallPct, 100)}%` }} />
        </div>
      </div>

      {flats.length === 0 || steps.length === 0 ? (
        <div className="card text-center py-12">
          <p style={{ color: 'var(--muted)' }}>
            {flats.length === 0 ? 'No flats added yet.' : 'No steps added yet.'}
            {' '}Go to the Process Setup to add them.
          </p>
          <Link to={`/sites/${siteId}/process/${processId}`} className="btn-outline text-sm mt-4 inline-block">
            Go to Process Setup
          </Link>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '600px', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, zIndex: 10,
                    background: 'var(--bg2)', padding: '10px 14px',
                    textAlign: 'left', borderBottom: '1px solid var(--bg3)',
                    minWidth: '120px', color: 'var(--muted)', fontSize: '12px'
                  }}>
                    Flat / Area
                  </th>
                  {steps.map(step => (
                    <th key={step.id} style={{
                      padding: '10px 12px', textAlign: 'center',
                      borderBottom: '1px solid var(--bg3)',
                      borderLeft: '1px solid var(--bg3)',
                      color: 'var(--text)', fontSize: '12px',
                      minWidth: '100px', whiteSpace: 'nowrap'
                    }}>
                      {step.step_name}
                      {step.coat_count > 1 && (
                        <span style={{ color: 'var(--muted)', fontSize: '11px', display: 'block' }}>
                          {step.coat_count} coats
                        </span>
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
                      background: 'var(--bg2)', padding: '10px 14px',
                      borderBottom: '1px solid var(--bg3)',
                      fontWeight: 'bold', color: 'var(--text)'
                    }}>
                      {flat.flat_no}
                      {flat.bhk_type && (
                        <span style={{ color: 'var(--muted)', fontSize: '11px', display: 'block', fontWeight: 'normal' }}>
                          {flat.bhk_type}
                        </span>
                      )}
                      {flat.area_name && (
                        <span style={{ color: 'var(--muted)', fontSize: '10px', display: 'block', fontWeight: 'normal' }}>
                          {flat.area_name}
                        </span>
                      )}
                    </td>
                    {steps.map(step => {
                      const prog = getProgress(flat.id, step.id)
                      const pct = prog?.done_percentage || 0
                      return (
                        <td key={step.id}
                          onClick={() => openHistory(flat, step, prog)}
                          style={{
                            padding: '10px 8px',
                            borderBottom: '1px solid var(--bg3)',
                            borderLeft: '1px solid var(--bg3)',
                            ...getCellStyle(pct)
                          }}>
                          {pct >= 100 ? 'DONE' : pct > 0 ? `${pct}%` : '—'}
                          {prog?.date_updated && pct > 0 && pct < 100 && (
                            <div style={{ fontSize: '10px', color: '#f97316', marginTop: '2px' }}>
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
        </div>
      )}

      {historyModal && (
        <HistoryModal
          flat={historyModal.flat}
          step={historyModal.step}
          progressRecord={historyModal.progressRecord}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  )
}
