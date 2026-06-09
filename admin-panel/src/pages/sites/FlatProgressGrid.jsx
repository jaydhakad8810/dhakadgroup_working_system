import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
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
  const [exporting, setExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

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

  // Chart data
  const doneCells = progress.filter(p => p.done_percentage >= 100).length
  const inProgressCells = progress.filter(p => p.done_percentage > 0 && p.done_percentage < 100).length
  const pendingCells = totalCells - doneCells - inProgressCells
  const overallData = [
    { name: 'Done', value: doneCells, color: '#22c55e' },
    { name: 'In Progress', value: inProgressCells, color: '#f97316' },
    { name: 'Pending', value: pendingCells, color: '#374151' }
  ].filter(d => d.value > 0)
  const stepData = steps.map(step => {
    const done = progress.filter(p => p.step_id === step.id && p.done_percentage >= 100).length
    const total = flats.length
    return {
      name: step.step_name.length > 12 ? step.step_name.slice(0, 12) + '…' : step.step_name,
      full_name: step.step_name,
      done,
      pct: total > 0 ? Math.round((done / total) * 100) : 0
    }
  })

  // Click-outside closes export menu
  useEffect(() => {
    function handleClick() { if (showExportMenu) setShowExportMenu(false) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [showExportMenu])

  async function exportToExcel() {
    setExporting(true)
    setShowExportMenu(false)
    try {
      const XLSX = (await import('xlsx')).default || (await import('xlsx'))
      const headers = ['Flat No', 'BHK Type', ...steps.map(s => s.step_name)]
      const rows = flats.map(flat => {
        const row = [flat.flat_no, flat.bhk_type || '']
        steps.forEach(step => {
          const prog = progress.find(p => p.flat_id === flat.id && p.step_id === step.id)
          const pct = prog?.done_percentage || 0
          row.push(pct >= 100 ? 'DONE' : pct > 0 ? `${pct}%` : 'Pending')
        })
        return row
      })
      rows.push([])
      rows.push(['SUMMARY', '', ...steps.map(step => {
        const done = progress.filter(p => p.step_id === step.id && p.done_percentage >= 100).length
        return `${done}/${flats.length} done`
      })])
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
      ws['!cols'] = [{ wch: 12 }, { wch: 10 }, ...steps.map(() => ({ wch: 18 }))]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Progress Report')
      const siteName = process?.site?.name || 'Site'
      const processTitle = process?.title || 'Process'
      const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '-')
      XLSX.writeFile(wb, `${siteName}_${processTitle}_Progress_${date}.xlsx`)
      toast.success('Excel exported')
    } catch (err) {
      toast.error('Export failed: ' + err.message)
    }
    setExporting(false)
  }

  async function exportToPDF() {
    setExporting(true)
    setShowExportMenu(false)
    try {
      const siteName = process?.site?.name || 'Site'
      const processTitle = process?.title || 'Process'
      const date = new Date().toLocaleDateString('en-IN')
      let html = `<html><head><style>
        body{font-family:Arial,sans-serif;font-size:11px}
        h1{color:#C9A84C;font-size:18px;margin-bottom:4px}
        h2{color:#333;font-size:14px;margin-bottom:16px}
        table{border-collapse:collapse;width:100%}
        th{background:#C9A84C;color:white;padding:6px 8px;text-align:center;border:1px solid #ddd;font-size:10px}
        td{padding:5px 8px;border:1px solid #ddd;text-align:center;font-size:10px}
        tr:nth-child(even){background:#f9f9f9}
        .done{color:#16a34a;font-weight:bold}.progress{color:#ea580c}.pending{color:#9ca3af}
      </style></head><body>
      <h1>Dhakad Group</h1>
      <h2>${siteName} — ${processTitle}</h2>
      <p>Generated: ${date} | Flats: ${flats.length} | Steps: ${steps.length} | Overall: ${totalCells > 0 ? Math.round((doneCells / totalCells) * 100) : 0}% Complete</p>
      <table><tr><th>Flat</th><th>Type</th>${steps.map(s => `<th>${s.step_name}</th>`).join('')}</tr>`
      flats.forEach(flat => {
        html += '<tr>'
        html += `<td><b>${flat.flat_no}</b></td><td>${flat.bhk_type || ''}</td>`
        steps.forEach(step => {
          const prog = progress.find(p => p.flat_id === flat.id && p.step_id === step.id)
          const pct = prog?.done_percentage || 0
          const cls = pct >= 100 ? 'done' : pct > 0 ? 'progress' : 'pending'
          html += `<td class="${cls}">${pct >= 100 ? 'DONE' : pct > 0 ? `${pct}%` : '—'}</td>`
        })
        html += '</tr>'
      })
      html += '</table></body></html>'
      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => { win.print(); win.close() }, 500)
      toast.success('PDF ready to print/save')
    } catch (err) {
      toast.error('PDF export failed: ' + err.message)
    }
    setExporting(false)
  }

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
        <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setShowExportMenu(v => !v)} disabled={exporting}
            style={{ background: 'var(--gold)', border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#000', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {exporting ? '⏳ Exporting…' : '⬇️ Export'}
          </button>
          {showExportMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 100, minWidth: '160px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', marginTop: '4px' }}>
              <button onClick={exportToExcel}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', color: 'var(--text)', fontSize: '14px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                📊 Export as Excel
              </button>
              <button onClick={exportToPDF}
                style={{ display: 'block', width: '100%', padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left', color: 'var(--text)', fontSize: '14px', cursor: 'pointer', borderTop: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                📄 Export as PDF
              </button>
            </div>
          )}
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

      {/* Charts row */}
      {totalCells > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--text)', fontSize: '14px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Overall Completion</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <PieChart width={140} height={140}>
                <Pie data={overallData} cx={65} cy={65} innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                  {overallData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v + ' tasks', n]} />
              </PieChart>
              <div style={{ flex: 1 }}>
                {overallData.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', flexShrink: 0, background: item.color }} />
                    <span style={{ color: 'var(--muted)', fontSize: '13px', flex: 1 }}>{item.name}</span>
                    <span style={{ color: 'var(--text)', fontSize: '13px', fontWeight: 'bold' }}>{item.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', color: 'var(--gold)', fontWeight: 'bold', fontSize: '14px' }}>
                  {Math.round((doneCells / totalCells) * 100)}% Complete
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ color: 'var(--text)', fontSize: '14px', fontWeight: '600', marginBottom: '16px', marginTop: 0 }}>Step Progress</h3>
            <div style={{ overflowY: 'auto', maxHeight: '140px' }}>
              {stepData.map((step, i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={step.full_name}>{step.name}</span>
                    <span style={{ color: 'var(--text)', fontSize: '12px', fontWeight: 'bold', marginLeft: '8px' }}>{step.pct}%</span>
                  </div>
                  <div style={{ background: 'var(--bg4,var(--bg3))', borderRadius: '4px', height: '6px' }}>
                    <div style={{ background: step.pct >= 100 ? '#22c55e' : step.pct > 0 ? '#f97316' : '#374151', borderRadius: '4px', height: '6px', width: `${step.pct}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
