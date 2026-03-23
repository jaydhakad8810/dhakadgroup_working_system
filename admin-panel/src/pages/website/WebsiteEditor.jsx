import { useEffect, useState } from 'react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { PageHeader, Modal } from '../../components/ui'
import { MultiPhotoUpload, PhotoUpload } from '../../components/ui/PhotoUpload'
import { Plus, Trash2, Edit, Globe, Save } from 'lucide-react'

const DEFAULT_HERO = {
  badge_text: 'Premium Asian Paints Applicator Since 2002',
  title_line1: 'Transforming Spaces With',
  title_highlight: 'Color & Craft',
  subtitle: 'Dhakad Group brings world-class painting solutions to Nashik. 500+ projects. Trusted since 2002.',
  btn_primary_text: 'View Projects',
  btn_secondary_text: 'Contact Us',
  hero_dark_mode: 'dark',
}

const DEFAULT_STATS = {
  stat_1_number: '150', stat_1_label: 'Projects Completed', stat_1_suffix: '+',
  stat_2_number: '12', stat_2_label: 'Years of Excellence', stat_2_suffix: '+',
  stat_3_number: '500', stat_3_label: 'Workers Employed', stat_3_suffix: '+',
  stat_4_number: '25', stat_4_label: 'Ongoing Projects', stat_4_suffix: '',
}

const DEFAULT_ABOUT = {
  about_title: 'About Dhakad Group',
  about_description: 'Dhakad Group is a leading construction company based in Pune, Maharashtra.',
  about_established_year: '2010',
  about_city: 'Pune',
  about_tag_line1: 'Est. 2010',
  about_tag_line2: 'Pune, India',
  feature_1: 'ISO 9001 Certified',
  feature_2: 'Pan India Operations',
  feature_3: 'Expert Engineering Team',
  feature_4: '24/7 Project Support',
  feature_5: 'Timely Delivery',
  feature_6: 'Quality Materials',
}

const DEFAULT_SERVICES = {
  service_1_icon: '🏗️', service_1_title: 'Building Construction', service_1_desc: 'Residential and commercial building projects.',
  service_2_icon: '🏛️', service_2_title: 'Infrastructure', service_2_desc: 'Roads, bridges, and public infrastructure.',
  service_3_icon: '🔧', service_3_title: 'Renovation', service_3_desc: 'Interior and exterior renovation work.',
  service_4_icon: '⚡', service_4_title: 'Electrical Works', service_4_desc: 'Complete electrical installations and wiring.',
  service_5_icon: '🚰', service_5_title: 'Plumbing', service_5_desc: 'Plumbing installations and maintenance.',
  service_6_icon: '🎨', service_6_title: 'Interior Design', service_6_desc: 'Modern interior design and fitout.',
}

const DEFAULT_CONTACT = {
  contact_address: 'Dhakad Group, Pune, Maharashtra, India',
  contact_phone: '+91 98225 11483',
  contact_email: 'info@dhakadgroup.in',
  contact_hours: 'Mon–Sat: 9:00 AM – 7:00 PM',
  contact_maps_url: '',
}

const DEFAULT_PORTALS = {
  admin_url: 'https://admin.dhakadgroup.in/login',
  supervisor_url: 'https://supervisor.dhakadgroup.in/login',
  driver_url: 'https://driver.dhakadgroup.in/login',
}

export default function WebsiteEditor() {
  const [projects, setProjects] = useState([])
  const [hero, setHero] = useState({ ...DEFAULT_HERO })
  const [stats, setStats] = useState({ ...DEFAULT_STATS })
  const [about, setAbout] = useState({ ...DEFAULT_ABOUT })
  const [services, setServices] = useState({ ...DEFAULT_SERVICES })
  const [contact, setContact] = useState({ ...DEFAULT_CONTACT })
  const [portals, setPortals] = useState({ ...DEFAULT_PORTALS })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
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
      const c = content.data
      const bySection = {}
      c.forEach(i => {
        if (!bySection[i.section]) bySection[i.section] = {}
        bySection[i.section][i.key] = i.value
      })
      if (bySection.hero) setHero(p => ({ ...p, ...bySection.hero }))
      if (bySection.stats) setStats(p => ({ ...p, ...bySection.stats }))
      if (bySection.about) setAbout(p => ({ ...p, ...bySection.about }))
      if (bySection.services) setServices(p => ({ ...p, ...bySection.services }))
      if (bySection.contact) setContact(p => ({ ...p, ...bySection.contact }))
      if (bySection.portals) setPortals(p => ({ ...p, ...bySection.portals }))
    } catch { toast.error('Failed to load') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const saveAll = async () => {
    setSaving(true)
    try {
      const items = [
        ...Object.entries(hero).map(([key, value]) => ({ section: 'hero', key, value, type: 'text' })),
        ...Object.entries(stats).map(([key, value]) => ({ section: 'stats', key, value, type: 'text' })),
        ...Object.entries(about).map(([key, value]) => ({ section: 'about', key, value, type: 'text' })),
        ...Object.entries(services).map(([key, value]) => ({ section: 'services', key, value, type: 'text' })),
        ...Object.entries(contact).map(([key, value]) => ({ section: 'contact', key, value, type: 'text' })),
        ...Object.entries(portals).map(([key, value]) => ({ section: 'portals', key, value, type: 'text' })),
      ]
      await api.put('/website/content/bulk', { items })
      setLastSaved(new Date())
      toast.success('All changes saved!')
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

  const tabs = ['projects', 'hero', 'stats', 'about', 'services', 'contact', 'portals']

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>

  return (
    <div className="space-y-6">
      <PageHeader title="Website Editor"
        subtitle="Customize dhakadgroup.in content"
        action={
          <div className="flex items-center gap-2">
            {lastSaved && <span className="text-gray-500 text-xs">Last saved: {lastSaved.toLocaleTimeString()}</span>}
            <a href="/" target="_blank" className="btn-outline text-sm"><Globe size={14} />Preview</a>
            <button onClick={saveAll} disabled={saving} className="btn-gold">
              {saving ? <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin inline-block mr-1" />Saving...</> : <><Save size={16} />Save All Changes</>}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg2)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap capitalize transition-all flex-shrink-0 ${tab === t ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}>
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
                  <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{p.location}</p>
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
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Hero Section</h3>
          <div><label className="label">Badge Text</label><input className="input" value={hero.badge_text || ''} onChange={e => setHero(p => ({ ...p, badge_text: e.target.value }))} /></div>
          <div><label className="label">Title Line 1</label><input className="input" value={hero.title_line1 || ''} onChange={e => setHero(p => ({ ...p, title_line1: e.target.value }))} /></div>
          <div><label className="label">Title Highlighted Word (gold gradient)</label><input className="input" value={hero.title_highlight || ''} onChange={e => setHero(p => ({ ...p, title_highlight: e.target.value }))} /></div>
          <div><label className="label">Subtitle</label><textarea className="input" rows={3} value={hero.subtitle || ''} onChange={e => setHero(p => ({ ...p, subtitle: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Primary Button Text</label><input className="input" value={hero.btn_primary_text || ''} onChange={e => setHero(p => ({ ...p, btn_primary_text: e.target.value }))} /></div>
            <div><label className="label">Secondary Button Text</label><input className="input" value={hero.btn_secondary_text || ''} onChange={e => setHero(p => ({ ...p, btn_secondary_text: e.target.value }))} /></div>
          </div>
          <div><label className="label">Mode</label>
            <select className="select" value={hero.hero_dark_mode || 'dark'} onChange={e => setHero(p => ({ ...p, hero_dark_mode: e.target.value }))}>
              <option value="dark">Dark</option><option value="light">Light</option>
            </select>
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && (
        <div className="card space-y-6 max-w-2xl">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Stats Section (4 stats)</h3>
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="p-4 rounded-xl" style={{ background: 'var(--bg3)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--muted)' }}>Stat {n}</p>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">Number</label><input className="input" value={stats[`stat_${n}_number`] || ''} onChange={e => setStats(p => ({ ...p, [`stat_${n}_number`]: e.target.value }))} /></div>
                <div><label className="label">Label</label><input className="input" value={stats[`stat_${n}_label`] || ''} onChange={e => setStats(p => ({ ...p, [`stat_${n}_label`]: e.target.value }))} /></div>
                <div><label className="label">Suffix (e.g. +)</label><input className="input" value={stats[`stat_${n}_suffix`] || ''} onChange={e => setStats(p => ({ ...p, [`stat_${n}_suffix`]: e.target.value }))} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* About Tab */}
      {tab === 'about' && (
        <div className="card space-y-4 max-w-2xl">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>About Section</h3>
          <div><label className="label">About Title</label><input className="input" value={about.about_title || ''} onChange={e => setAbout(p => ({ ...p, about_title: e.target.value }))} /></div>
          <div><label className="label">Description</label><textarea className="input" rows={4} value={about.about_description || ''} onChange={e => setAbout(p => ({ ...p, about_description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Established Year</label><input type="number" className="input" value={about.about_established_year || ''} onChange={e => setAbout(p => ({ ...p, about_established_year: e.target.value }))} /></div>
            <div><label className="label">City</label><input className="input" value={about.about_city || ''} onChange={e => setAbout(p => ({ ...p, about_city: e.target.value }))} /></div>
            <div><label className="label">Tag Line 1 (e.g. Est. 2010)</label><input className="input" value={about.about_tag_line1 || ''} onChange={e => setAbout(p => ({ ...p, about_tag_line1: e.target.value }))} /></div>
            <div><label className="label">Tag Line 2 (e.g. Pune, India)</label><input className="input" value={about.about_tag_line2 || ''} onChange={e => setAbout(p => ({ ...p, about_tag_line2: e.target.value }))} /></div>
          </div>
          <div>
            <p className="label mb-3">Features (6 items)</p>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n}><label className="label text-xs">Feature {n}</label><input className="input" value={about[`feature_${n}`] || ''} onChange={e => setAbout(p => ({ ...p, [`feature_${n}`]: e.target.value }))} /></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {tab === 'services' && (
        <div className="card space-y-4 max-w-2xl">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Services (6 cards)</h3>
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="p-4 rounded-xl" style={{ background: 'var(--bg3)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--muted)' }}>Service {n}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Icon (emoji)</label><input className="input" value={services[`service_${n}_icon`] || ''} onChange={e => setServices(p => ({ ...p, [`service_${n}_icon`]: e.target.value }))} /></div>
                <div><label className="label">Title</label><input className="input" value={services[`service_${n}_title`] || ''} onChange={e => setServices(p => ({ ...p, [`service_${n}_title`]: e.target.value }))} /></div>
                <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={services[`service_${n}_desc`] || ''} onChange={e => setServices(p => ({ ...p, [`service_${n}_desc`]: e.target.value }))} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contact Tab */}
      {tab === 'contact' && (
        <div className="card space-y-4 max-w-xl">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Contact Information</h3>
          <div><label className="label">Office Address</label><textarea className="input" rows={2} value={contact.contact_address || ''} onChange={e => setContact(p => ({ ...p, contact_address: e.target.value }))} /></div>
          <div><label className="label">Phone Number</label><input className="input" value={contact.contact_phone || ''} onChange={e => setContact(p => ({ ...p, contact_phone: e.target.value }))} /></div>
          <div><label className="label">Email Address</label><input className="input" value={contact.contact_email || ''} onChange={e => setContact(p => ({ ...p, contact_email: e.target.value }))} /></div>
          <div><label className="label">Working Hours</label><input className="input" value={contact.contact_hours || ''} onChange={e => setContact(p => ({ ...p, contact_hours: e.target.value }))} /></div>
          <div>
            <label className="label">Google Maps Embed URL (optional)</label>
            <input className="input" value={contact.contact_maps_url || ''} onChange={e => setContact(p => ({ ...p, contact_maps_url: e.target.value }))} placeholder="Paste Google Maps iframe src URL" />
            {contact.contact_maps_url && (
              <div className="mt-2 rounded-xl overflow-hidden">
                <iframe src={contact.contact_maps_url} width="100%" height="200" loading="lazy" style={{ border: 0 }} title="Map preview" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Portals Tab */}
      {tab === 'portals' && (
        <div className="space-y-6 max-w-xl">
          <div className="card space-y-4">
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Employee Portal URLs</h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>These URLs are used in the Employee Portal section of dhakadgroup.in</p>
            <div><label className="label">Admin Panel URL</label><input className="input" value={portals.admin_url || ''} onChange={e => setPortals(p => ({ ...p, admin_url: e.target.value }))} /></div>
            <div><label className="label">Supervisor Portal URL</label><input className="input" value={portals.supervisor_url || ''} onChange={e => setPortals(p => ({ ...p, supervisor_url: e.target.value }))} /></div>
            <div><label className="label">Driver Portal URL</label><input className="input" value={portals.driver_url || ''} onChange={e => setPortals(p => ({ ...p, driver_url: e.target.value }))} /></div>
          </div>
          {/* Live preview */}
          <div className="card">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text)' }}>Preview — Employee Login Cards</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Admin Panel', url: portals.admin_url, icon: '🛡️', color: 'border-gold-500/40 bg-gold-500/5' },
                { label: 'Supervisor Portal', url: portals.supervisor_url, icon: '👷', color: 'border-orange-500/40 bg-orange-500/5' },
                { label: 'Driver Portal', url: portals.driver_url, icon: '🚛', color: 'border-blue-500/40 bg-blue-500/5' },
              ].map(({ label, url, icon, color }) => (
                <div key={label} className={`p-4 rounded-xl border ${color} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                      <p className="font-semibold text-white text-sm">{label}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs">{url || 'Not set'}</p>
                    </div>
                  </div>
                  {url && <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline">Open →</a>}
                </div>
              ))}
            </div>
          </div>
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
