import { useEffect, useState } from 'react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { PageHeader, Modal } from '../../components/ui'
import { MultiPhotoUpload, PhotoUpload } from '../../components/ui/PhotoUpload'
import { Plus, Trash2, Edit, Globe, ExternalLink, Save } from 'lucide-react'

export default function WebsiteEditor() {
  const [projects, setProjects] = useState([])
  const [stats, setStats] = useState({ projects_completed: '150', years: '12', workers: '500', ongoing: '25' })
  const [heroText, setHeroText] = useState({ badge: 'Trusted Construction Partner Since 2010', title_line1: "Building Tomorrow's", title_highlight: 'Infrastructure Today', subtitle: 'Dhakad Group delivers excellence in construction across India.' })
  const [contactInfo, setContactInfo] = useState({ address: 'Dhakad Group, Pune, Maharashtra, India', phone: '+91 98225 XXXXX', email: 'info@dhakadgroup.in', hours: 'Mon–Sat: 9:00 AM – 7:00 PM' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('projects')
  const [projectModal, setProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [pForm, setPForm] = useState({ title: '', description: '', location: '', status: 'ongoing', client_name: '', cover_photo: '', photos: [] })
  const pf = (k, v) => setPForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try {
      const [proj, content] = await Promise.all([api.get('/website/projects'), api.get('/website/content')])
      setProjects(proj.data)
      // Load content into state
      const c = content.data
      const statsItems = c.filter(i => i.section === 'stats')
      const heroItems = c.filter(i => i.section === 'hero')
      const contactItems = c.filter(i => i.section === 'contact')
      if (statsItems.length) { const s = {}; statsItems.forEach(i => s[i.key] = i.value); setStats(p => ({ ...p, ...s })) }
      if (heroItems.length) { const h = {}; heroItems.forEach(i => h[i.key] = i.value); setHeroText(p => ({ ...p, ...h })) }
      if (contactItems.length) { const ct = {}; contactItems.forEach(i => ct[i.key] = i.value); setContactInfo(p => ({ ...p, ...ct })) }
    } catch (e) { toast.error('Failed to load') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const saveContent = async () => {
    setSaving(true)
    try {
      const items = [
        ...Object.entries(stats).map(([key, value]) => ({ section: 'stats', key, value, type: 'number' })),
        ...Object.entries(heroText).map(([key, value]) => ({ section: 'hero', key, value, type: 'text' })),
        ...Object.entries(contactInfo).map(([key, value]) => ({ section: 'contact', key, value, type: 'text' })),
      ]
      await api.put('/website/content/bulk', { items })
      toast.success('Website content updated!')
    } catch { toast.error('Save failed') }
    setSaving(false)
  }

  const openAddProject = () => { setEditingProject(null); setPForm({ title: '', description: '', location: '', status: 'ongoing', client_name: '', cover_photo: '', photos: [] }); setProjectModal(true) }
  const openEditProject = (p) => { setEditingProject(p.id); setPForm({ ...p, photos: p.photos || [] }); setProjectModal(true) }

  const handleProjectSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editingProject) { await api.put(`/website/projects/${editingProject}`, pForm); toast.success('Updated') }
      else { await api.post('/website/projects', pForm); toast.success('Project added') }
      setProjectModal(false); load()
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  const deleteProject = async (id) => {
    if (!confirm('Delete this project?')) return
    try { await api.delete(`/website/projects/${id}`); toast.success('Deleted'); load() }
    catch { toast.error('Failed') }
  }

  const tabs = ['projects', 'hero', 'stats', 'contact']

  return (
    <div className="space-y-6">
      <PageHeader title="Website Editor"
        subtitle="Customize dhakadgroup.in content from here"
        action={
          <div className="flex gap-2">
            <a href="/" target="_blank" className="btn-outline text-sm"><Globe size={14} />Preview Site</a>
            <button onClick={saveContent} disabled={saving} className="btn-gold"><Save size={16} />{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg2)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            {t === 'projects' ? `Projects (${projects.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <button onClick={openAddProject} className="btn-gold"><Plus size={16} />Add Project</button>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => (
              <div key={p.id} className="card overflow-hidden p-0">
                {p.cover_photo
                  ? <img src={p.cover_photo} className="w-full h-40 object-cover" alt={p.title} />
                  : <div className="w-full h-40 flex items-center justify-center text-5xl" style={{ background: 'var(--bg3)' }}>🏗️</div>
                }
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold" style={{ color: 'var(--text)' }}>{p.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>{p.status}</span>
                  </div>
                  <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{p.location}</p>
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--muted)' }}>{p.description}</p>
                  <div className="flex gap-2">
                    <button onClick={() => openEditProject(p)} className="btn-outline flex-1 justify-center text-sm py-1.5"><Edit size={13} />Edit</button>
                    <button onClick={() => deleteProject(p.id)} className="btn-danger py-1.5 px-3 text-sm"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hero Tab */}
      {tab === 'hero' && (
        <div className="card space-y-4 max-w-2xl">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Hero Section Text</h3>
          {[['badge', 'Badge text (top pill)'], ['title_line1', 'Title Line 1'], ['title_highlight', 'Title Highlighted Word'], ['subtitle', 'Subtitle text']].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" value={heroText[key] || ''} onChange={e => setHeroText(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="card space-y-4 max-w-xl">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Stats Numbers</h3>
          {[['projects_completed', 'Projects Completed'], ['years', 'Years of Excellence'], ['workers', 'Workers Employed'], ['ongoing', 'Ongoing Projects']].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="number" className="input" value={stats[key] || ''} onChange={e => setStats(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      )}

      {/* Contact Tab */}
      {tab === 'contact' && (
        <div className="card space-y-4 max-w-xl">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Contact Information</h3>
          {[['address', 'Office Address'], ['phone', 'Phone Number'], ['email', 'Email Address'], ['hours', 'Working Hours']].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" value={contactInfo[key] || ''} onChange={e => setContactInfo(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      )}

      {/* Project Modal */}
      <Modal open={projectModal} onClose={() => setProjectModal(false)} title={editingProject ? 'Edit Project' : 'Add Project'} size="lg">
        <form onSubmit={handleProjectSubmit} className="space-y-4">
          <div>
            <label className="label">Cover Photo</label>
            <PhotoUpload value={pForm.cover_photo} onChange={v => pf('cover_photo', v)} folder="dgsystem/website/projects" label="Cover" />
          </div>
          <div><label className="label">Additional Photos</label><MultiPhotoUpload value={pForm.photos} onChange={v => pf('photos', v)} folder="dgsystem/website/projects" label="Add" max={8} /></div>
          <div><label className="label">Project Title *</label><input className="input" required value={pForm.title} onChange={e => pf('title', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Location</label><input className="input" value={pForm.location || ''} onChange={e => pf('location', e.target.value)} /></div>
            <div><label className="label">Status</label>
              <select className="select" value={pForm.status} onChange={e => pf('status', e.target.value)}>
                <option value="ongoing">Ongoing</option><option value="completed">Completed</option>
              </select>
            </div>
            <div><label className="label">Client Name</label><input className="input" value={pForm.client_name || ''} onChange={e => pf('client_name', e.target.value)} /></div>
            <div><label className="label">Start Date</label><input type="date" className="input" value={pForm.start_date || ''} onChange={e => pf('start_date', e.target.value)} /></div>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={3} value={pForm.description || ''} onChange={e => pf('description', e.target.value)} /></div>
          <div className="flex gap-2 items-center">
            <input type="checkbox" id="featured" checked={!!pForm.is_featured} onChange={e => pf('is_featured', e.target.checked)} className="w-4 h-4 accent-gold-500" />
            <label htmlFor="featured" className="label mb-0">Featured project (show at top)</label>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setProjectModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : editingProject ? 'Update' : 'Add Project'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
