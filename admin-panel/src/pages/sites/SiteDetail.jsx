import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, MapPin, Loader2, X } from 'lucide-react'
import api from '../../utils/api'
import { LoadingPage, StatusBadge, Modal, InfoRow } from '../../components/ui'
import { PhotoUpload } from '../../components/ui/PhotoUpload'
import toast from 'react-hot-toast'

const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN')}`

// ── AddMaterialModal ────────────────────────────────────────────────────────
function AddMaterialModal({ siteId, onClose, onSuccess }) {
  const [form, setForm] = useState({
    company_name: '', product_name: '', shade_name: '',
    shade_code: '', unit: 'Kg', packaging: '', main_category: 'Paints'
  })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const previewParts = [form.company_name, form.product_name, form.shade_name, form.shade_code].filter(Boolean)
  const preview = previewParts.length ? previewParts.join(' - ') : '—'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/site-materials', { ...form, site_id: siteId })
      toast.success('Material added')
      onSuccess()
      onClose()
    } catch { toast.error('Failed to add material') }
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose} title="Add Material" size="lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Main Category</label>
          <select className="select" value={form.main_category} onChange={e => f('main_category', e.target.value)}>
            <option>Paints</option><option>Painting Kit</option><option>Other Material</option>
          </select>
        </div>
        <div>
          <label className="label">Company Name *</label>
          <input className="input" required value={form.company_name} onChange={e => f('company_name', e.target.value)} placeholder="e.g. Asian Paints, Birla White, Dulux" />
        </div>
        <div>
          <label className="label">Product Name *</label>
          <input className="input" required value={form.product_name} onChange={e => f('product_name', e.target.value)} placeholder="e.g. Putty, Primer, Interior Paint" />
        </div>
        <div>
          <label className="label">Shade Name</label>
          <input className="input" value={form.shade_name} onChange={e => f('shade_name', e.target.value)} placeholder="e.g. Fine Putty, SPARC Internal" />
        </div>
        <div>
          <label className="label">Shade Code</label>
          <input className="input" value={form.shade_code} onChange={e => f('shade_code', e.target.value)} placeholder="e.g. 001, W-102" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Unit *</label>
            <select className="select" value={form.unit} onChange={e => f('unit', e.target.value)}>
              <option>Kg</option><option>Ltr</option><option>Nos</option><option>Pcs</option>
            </select>
          </div>
          <div>
            <label className="label">Packaging</label>
            <input className="input" value={form.packaging} onChange={e => f('packaging', e.target.value)} placeholder="e.g. 40" />
          </div>
        </div>
        <div className="p-3 rounded-lg border" style={{ background: 'var(--bg3)', borderColor: '#b8962e' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Final Name Preview:</p>
          <p className="font-semibold text-gold-400">{preview}</p>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Add Material'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ── ImportModal ─────────────────────────────────────────────────────────────
function ImportModal({ siteId, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('site_id', siteId)
      const res = await api.post('/site-materials/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
      onSuccess()
    } catch { toast.error('Import failed') }
    setImporting(false)
  }

  return (
    <Modal open onClose={onClose} title="Import Materials from Excel" size="md">
      <div className="space-y-4">
        <div className="p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>Step 1: Download the template, fill it, then upload</p>
          <button onClick={async () => {
            try {
              const token = localStorage.getItem('dg_token')
              const res = await api.get('/site-materials/template', { responseType: 'blob', headers: { Authorization: `Bearer ${token}` } })
              const url = window.URL.createObjectURL(new Blob([res.data]))
              const link = document.createElement('a')
              link.href = url; link.setAttribute('download', 'material_import_template.xlsx')
              document.body.appendChild(link); link.click(); link.remove()
              window.URL.revokeObjectURL(url)
            } catch { alert('Failed to download template') }
          }} className="btn-outline text-sm">
            Download Template
          </button>
        </div>
        {!result ? (
          <>
            <div>
              <label className="label">Step 2: Upload filled Excel file</label>
              <input type="file" accept=".xlsx,.xls" className="input" onChange={e => setFile(e.target.files[0])} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={handleImport} disabled={!file || importing} className="btn-gold">
                {importing ? <><Loader2 size={14} className="animate-spin inline mr-1" />Importing...</> : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-green-400 font-semibold">✓ {result.imported} materials imported</p>
            {result.errors?.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-red-400 font-medium">Errors ({result.errors.length}):</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs" style={{ color: 'var(--muted)' }}>Row {e.row}: {e.error}</p>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button onClick={onClose} className="btn-gold">Done</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── CreateProcessModal ───────────────────────────────────────────────────────
function CreateProcessModal({ siteId, onClose }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', work_type: 'internal', work_type_custom: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await api.post('/process-master', { ...form, site_id: siteId })
      toast.success('Process created')
      navigate(`/sites/${siteId}/process/${res.data.id}`)
    } catch { toast.error('Failed to create process') }
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose} title="New Process Master" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input" required value={form.title} onChange={e => f('title', e.target.value)} placeholder="e.g. Tower A - Internal Work" />
        </div>
        <div>
          <label className="label">Work Type *</label>
          <select className="select" value={form.work_type} onChange={e => f('work_type', e.target.value)}>
            <option value="internal">Internal</option>
            <option value="external">External</option>
            <option value="oil">Oil Paint</option>
            <option value="gypsum">Gypsum</option>
            <option value="other">Other</option>
          </select>
        </div>
        {form.work_type === 'other' && (
          <div>
            <label className="label">Custom Work Type Name</label>
            <input className="input" value={form.work_type_custom} onChange={e => f('work_type_custom', e.target.value)} placeholder="Describe the work type" />
          </div>
        )}
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Creating...' : 'Create Process'}</button>
        </div>
      </form>
    </Modal>
  )
}

const WORK_TYPE_LABELS = { internal: 'Internal', external: 'External', oil: 'Oil Paint', gypsum: 'Gypsum', other: 'Other' }

export default function SiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [boqSummary, setBoqSummary] = useState(null)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Tab state
  const [activeTab, setActiveTab] = useState('overview')

  // Financials tab state
  const [financialsLoaded, setFinancialsLoaded] = useState(false)
  const [financialsLoading, setFinancialsLoading] = useState(false)
  const [newLedgerSummary, setNewLedgerSummary] = useState(null)
  const [clientSummary, setClientSummary] = useState(null)

  // Materials tab state
  const [materials, setMaterials] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialsLoaded, setMaterialsLoaded] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [matCategoryFilter, setMatCategoryFilter] = useState('All')
  const [materialSearch, setMaterialSearch] = useState('')

  // Process tab state
  const [processes, setProcesses] = useState([])
  const [processLoading, setProcessLoading] = useState(false)
  const [processLoaded, setProcessLoaded] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)

  const load = async () => {
    try {
      const [s, b, u] = await Promise.all([
        api.get(`/sites/${id}`),
        api.get(`/boq/summary/${id}`).catch(() => ({ data: null })),
        api.get('/users?role=supervisor')
      ])
      setSite(s.data); setForm(s.data)
      setBoqSummary(b.data); setUsers(u.data)
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }
  useEffect(() => {
    load()
    const urlParams = new URLSearchParams(window.location.search)
    const tabFromUrl = urlParams.get('tab')
    if (tabFromUrl) setActiveTab(tabFromUrl)
  }, [id])

  // Fetch financials only when Financials tab is active and not yet loaded
  useEffect(() => {
    if (activeTab !== 'financials' || financialsLoaded) return
    const fetchFinancials = async () => {
      setFinancialsLoading(true)
      try {
        const [ls, cs] = await Promise.all([
          api.get(`/ledger/summary?site_id=${id}`),
          api.get(`/ledger/client/summary?site_id=${id}`),
        ])
        setNewLedgerSummary(ls.data)
        setClientSummary(cs.data)
        setFinancialsLoaded(true)
      } catch {}
      setFinancialsLoading(false)
    }
    fetchFinancials()
  }, [activeTab, id, financialsLoaded])

  const fetchMaterials = async () => {
    setMaterialsLoading(true)
    try {
      const res = await api.get(`/site-materials?site_id=${id}`)
      setMaterials(res.data || [])
      setMaterialsLoaded(true)
    } catch {}
    setMaterialsLoading(false)
  }

  useEffect(() => {
    if (activeTab !== 'materials' || materialsLoaded) return
    fetchMaterials()
  }, [activeTab, id, materialsLoaded])

  async function deleteProcess(processId) {
    if (!confirm('Delete this process and all its data?')) return
    try {
      await api.delete(`/process-master/${processId}`)
      toast.success('Process deleted')
      setProcessLoaded(false)
      fetchProcesses()
    } catch { toast.error('Failed to delete') }
  }

  async function deleteMaterial(materialId) {
    if (!confirm('Delete this material?')) return
    try {
      await api.delete(`/site-materials/${materialId}`)
      toast.success('Material deleted')
      setMaterialsLoaded(false)
      fetchMaterials()
    } catch { toast.error('Failed to delete') }
  }

  async function downloadTemplate() {
    try {
      const token = localStorage.getItem('dg_token')
      const res = await api.get('/site-materials/template', {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token}` }
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'material_import_template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch { toast.error('Failed to download template') }
  }

  const fetchProcesses = async () => {
    setProcessLoading(true)
    try {
      const res = await api.get(`/process-master?site_id=${id}`)
      setProcesses(res.data || [])
      setProcessLoaded(true)
    } catch {}
    setProcessLoading(false)
  }

  useEffect(() => {
    if (activeTab !== 'process' || processLoaded) return
    fetchProcesses()
  }, [activeTab, id, processLoaded])

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const oldSupervisorId = site.supervisor_id
      await api.put(`/sites/${id}`, form)
      toast.success('Site updated')
      if (form.supervisor_id && form.supervisor_id !== oldSupervisorId) {
        toast.success('Supervisor reassigned. All labour transferred to new supervisor.')
      }
      setEditModal(false); load()
    } catch { toast.error('Save failed') }
    setSaving(false)
  }

  if (loading) return <LoadingPage />
  if (!site) return <div className="text-gray-400">Site not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/sites" className="btn-ghost"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{site.name}</h1>
            <StatusBadge status={site.status} />
            {site.contract_type && <span className="badge-blue capitalize">{site.contract_type.replace(/_/g, ' + ')}</span>}
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{site.organisation?.name}</p>
        </div>
        <button onClick={() => setEditModal(true)} className="btn-outline"><Edit size={16} />Edit</button>
      </div>

      {/* Site photo */}
      {site.raw_photo && <img src={site.raw_photo} className="w-full max-h-64 object-cover rounded-xl" alt="Site" />}

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
        {[['overview', 'Overview'], ['financials', 'Financials'], ['materials', 'Materials'], ['process', 'Process Master']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === key ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card space-y-0 lg:col-span-2">
            <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>Site Information</h3>
            <InfoRow label="Client" value={site.client_name} />
            <InfoRow label="Client Phone" value={site.client_phone} />
            <InfoRow label="Contract Value" value={site.contract_value ? fmt(site.contract_value) : null} valueClass="text-gold-400 font-semibold" />
            <InfoRow label="Supervisor" value={site.supervisor ? `${site.supervisor.name} (${site.supervisor.employee_id || ''})` : null} />
            <InfoRow label="Start Date" value={site.start_date} />
            <InfoRow label="Expected End" value={site.expected_end_date} />
            <InfoRow label="City" value={`${site.city || ''} ${site.state || ''}`.trim()} />
            {site.latitude && <InfoRow label="GPS" value={`${parseFloat(site.latitude).toFixed(4)}, ${parseFloat(site.longitude).toFixed(4)} (${site.gps_radius_meters}m radius)`} valueClass="text-green-400" />}
            {site.latitude && site.longitude && (
              <div className="py-2">
                <a href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                   target="_blank" rel="noreferrer"
                   className="btn-outline text-sm inline-flex items-center gap-1">
                  🗺️ Open in Google Maps →
                </a>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {boqSummary && (
              <div className="card">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text)' }}>BOQ Summary</h3>
                <InfoRow label="Estimated" value={fmt(boqSummary.total?.estimated)} />
                <InfoRow label="Actual" value={fmt(boqSummary.total?.actual)} valueClass="text-gold-400" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Financials Tab ── */}
      {activeTab === 'financials' && (
        <div>
          {financialsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={36} className="animate-spin text-gold-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Section 1 — Site Cost Summary */}
              <div className="card space-y-3">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Site Cost Summary</h3>
                {newLedgerSummary ? (
                  <>
                    <InfoRow label="Labour" value={fmt(newLedgerSummary.total_labour)} valueClass="text-blue-400 font-semibold" />
                    <InfoRow label="Expenses" value={fmt(newLedgerSummary.total_expenses)} valueClass="text-orange-400 font-semibold" />
                    <InfoRow label="Materials" value={fmt(newLedgerSummary.total_materials)} valueClass="text-purple-400 font-semibold" />
                    <InfoRow label="Grand Total" value={fmt(newLedgerSummary.grand_total)} valueClass="text-gold-400 font-bold" />
                  </>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--muted)' }}>No cost data yet</p>
                )}
                <button
                  onClick={() => navigate(`/ledger?site_id=${id}`)}
                  className="btn-outline w-full mt-2 text-sm"
                >
                  View Full Ledger →
                </button>
              </div>

              {/* Section 2 — Client Summary */}
              <div className="card space-y-3">
                <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Client Collection Summary</h3>
                {clientSummary ? (
                  <>
                    <InfoRow label="Contract Value" value={fmt(clientSummary.contract_amount)} valueClass="text-white font-semibold" />
                    <InfoRow label="Total Paid" value={fmt(clientSummary.total_paid)} valueClass="text-green-400 font-semibold" />
                    <InfoRow
                      label="Balance Due"
                      value={fmt(clientSummary.balance_due)}
                      valueClass={parseFloat(clientSummary.balance_due) > 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}
                    />
                    <div className="pt-1">
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>Collection Progress</span>
                        <span className="text-gold-400 text-xs font-semibold">{clientSummary.percent_collected}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full" style={{ background: 'var(--bg2)' }}>
                        <div
                          className="h-2.5 rounded-full bg-gold-500 transition-all duration-500"
                          style={{ width: `${Math.min(Math.max(clientSummary.percent_collected, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm py-4" style={{ color: 'var(--muted)' }}>No client payments recorded</p>
                )}
                <button
                  onClick={() => navigate(`/ledger?site_id=${id}`)}
                  className="btn-outline w-full mt-2 text-sm"
                >
                  Add Payment →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Materials Tab ── */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Site Materials</h3>
            <div className="flex gap-2">
              <button onClick={downloadTemplate} className="btn-outline text-sm">Download Template</button>
              <button onClick={() => setShowImportModal(true)} className="btn-outline text-sm">Import Excel</button>
              <button onClick={() => setShowMaterialModal(true)} className="btn-gold text-sm">+ Add Material</button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '12px', position: 'relative' }}>
            <input
              placeholder="Search by name, company, product, shade..."
              value={materialSearch}
              onChange={e => setMaterialSearch(e.target.value)}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px 8px 36px', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '16px' }}>🔍</span>
            {materialSearch && (
              <button onClick={() => setMaterialSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px' }}>×</button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
            {['All', 'Paints', 'Painting Kit', 'Other Material'].map(cat => (
              <button key={cat} onClick={() => setMatCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${matCategoryFilter === cat ? 'bg-gold-500 text-dark-950' : 'text-gray-400 hover:text-white'}`}>
                {cat}
              </button>
            ))}
          </div>

          {materialsLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-gold-500" /></div>
          ) : materials.length === 0 ? (
            <div className="card text-center py-12">
              <p style={{ color: 'var(--muted)' }}>No materials yet. Add materials or import from Excel.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg2)' }}>
                    {['Full Name','Company','Product','Shade','Code','Unit','Pkg','Category',''].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materials
                    .filter(m => matCategoryFilter === 'All' || m.main_category === matCategoryFilter)
                    .filter(m => {
                      if (!materialSearch) return true
                      const q = materialSearch.toLowerCase()
                      return (
                        m.full_name?.toLowerCase().includes(q) ||
                        m.company_name?.toLowerCase().includes(q) ||
                        m.product_name?.toLowerCase().includes(q) ||
                        m.shade_name?.toLowerCase().includes(q) ||
                        m.shade_code?.toLowerCase().includes(q) ||
                        m.main_category?.toLowerCase().includes(q)
                      )
                    })
                    .map(m => (
                      <tr key={m.id} className="border-t" style={{ borderColor: 'var(--bg2)' }}>
                        <td className="px-3 py-2 font-medium" style={{ color: 'var(--text)' }}>{m.full_name}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{m.company_name}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{m.product_name}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{m.shade_name || '—'}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{m.shade_code || '—'}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{m.unit}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{m.packaging || '—'}</td>
                        <td className="px-3 py-2"><span className="badge-blue text-xs">{m.main_category}</span></td>
                        <td className="px-3 py-2">
                          <button onClick={() => deleteMaterial(m.id)} className="text-red-400 hover:text-red-300 text-xs">×</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {showMaterialModal && (
            <AddMaterialModal siteId={id} onClose={() => setShowMaterialModal(false)} onSuccess={() => { setMaterialsLoaded(false); fetchMaterials() }} />
          )}
          {showImportModal && (
            <ImportModal siteId={id} onClose={() => setShowImportModal(false)} onSuccess={() => { setMaterialsLoaded(false); fetchMaterials() }} />
          )}
        </div>
      )}

      {/* ── Process Master Tab ── */}
      {activeTab === 'process' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Process Master</h3>
            <button onClick={() => setShowProcessModal(true)} className="btn-gold text-sm">+ New Process</button>
          </div>

          {processLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-gold-500" /></div>
          ) : processes.length === 0 ? (
            <div className="card text-center py-12">
              <p style={{ color: 'var(--muted)' }}>No processes yet. Create one to start tracking work.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processes.map(pm => (
                <div key={pm.id} className="card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold" style={{ color: 'var(--text)' }}>{pm.title}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className="badge-blue text-xs">{WORK_TYPE_LABELS[pm.work_type] || pm.work_type_custom}</span>
                        <StatusBadge status={pm.status} />
                      </div>
                    </div>
                    <button onClick={() => deleteProcess(pm.id)} className="text-red-400 hover:text-red-300 text-lg leading-none ml-2">×</button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => navigate(`/sites/${id}/process/${pm.id}`)} className="btn-outline text-xs">
                      Edit Process
                    </button>
                    <button onClick={() => navigate(`/sites/${id}/process/${pm.id}/progress`)} className="btn-gold text-xs">
                      View Progress
                    </button>
                  </div>
                  <div className="flex gap-4 text-xs" style={{ color: 'var(--muted)' }}>
                    <span>{pm.areas?.length || 0} areas</span>
                    <span>{pm.flats?.length || 0} flats</span>
                    <span>{pm.steps?.length || 0} steps</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showProcessModal && (
            <CreateProcessModal siteId={id} onClose={() => setShowProcessModal(false)} />
          )}
        </div>
      )}

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Site" size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="label">Site Photo</label>
            <PhotoUpload value={form.raw_photo} onChange={v => f('raw_photo', v)} folder="dgsystem/sites" label="Site Photo" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Site Name</label><input className="input" value={form.name || ''} onChange={e => f('name', e.target.value)} /></div>
            <div><label className="label">Supervisor</label>
              <select className="select" value={form.supervisor_id || ''} onChange={e => f('supervisor_id', e.target.value)}>
                <option value="">Select</option>{users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.employee_id || ''})</option>)}
              </select>
              {form.supervisor_id !== site.supervisor_id && <p className="text-orange-400 text-xs mt-1">⚠️ Changing supervisor will reassign all labour on this site</p>}
            </div>
            <div><label className="label">Contract Type</label>
              <select className="select" value={form.contract_type || 'material_labour'} onChange={e => f('contract_type', e.target.value)}>
                <option value="material_labour">Material + Labour</option>
                <option value="labour_only">Labour Only</option>
                <option value="material_only">Material Only</option>
              </select>
            </div>
            <div><label className="label">Status</label>
              <select className="select" value={form.status || ''} onChange={e => f('status', e.target.value)}>
                <option value="active">Active</option><option value="on_hold">On Hold</option>
                <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div><label className="label">Client Name</label><input className="input" value={form.client_name || ''} onChange={e => f('client_name', e.target.value)} /></div>
            <div><label className="label">Contract Value (₹)</label><input type="number" className="input" value={form.contract_value || ''} onChange={e => f('contract_value', e.target.value)} /></div>
            <div><label className="label">Start Date</label><input type="date" className="input" value={form.start_date || ''} onChange={e => f('start_date', e.target.value)} /></div>
            <div><label className="label">Expected End</label><input type="date" className="input" value={form.expected_end_date || ''} onChange={e => f('expected_end_date', e.target.value)} /></div>
            <div><label className="label">City</label><input className="input" value={form.city || ''} onChange={e => f('city', e.target.value)} /></div>
            <div><label className="label">State</label><input className="input" value={form.state || ''} onChange={e => f('state', e.target.value)} /></div>
            <div><label className="label">GPS Radius (m)</label><input type="number" className="input" value={form.gps_radius_meters || 100} onChange={e => f('gps_radius_meters', e.target.value)} /></div>
          </div>
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes || ''} onChange={e => f('notes', e.target.value)} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setEditModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
