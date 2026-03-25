import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { PageHeader, LoadingPage, Modal, ConfirmDialog } from '../../components/ui'
import { PhotoUpload, DocUpload } from '../../components/ui/PhotoUpload'
import { Plus, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff, Edit } from 'lucide-react'

const EMPTY = {
  role: 'supervisor', name: '', employee_id: '', password: '', phone: '',
  photo: '', aadhar_number: '', emergency_contact: '',
  license_number: '', license_expiry: '', license_photo: '',
  bank_account: '', bank_ifsc: '', bank_name: '',
}

const generatePreviewId = (name, role) => {
  if (!name) return ''
  const prefix = role === 'supervisor' ? 'SUP' : role === 'driver' ? 'DRV' : 'ADM'
  const firstName = name.split(' ')[0].toUpperCase().slice(0, 4)
  return `${prefix}-${firstName}-001`
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [viewModal, setViewModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [filterRole, setFilterRole] = useState('')
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const load = async () => {
    setLoading(true)
    try { const r = await api.get(`/users${filterRole ? '?role=' + filterRole : ''}`); setUsers(r.data) }
    catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [filterRole])

  const openAdd  = () => { setEditing(null); setForm({ ...EMPTY }); setModal(true) }
  const openEdit = (u) => { setEditing(u.id); setForm({ ...EMPTY, ...u, password: '', email: undefined }); setModal(true) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      if (editing) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        delete payload.email
        await api.put(`/users/${editing}`, payload)
        toast.success('User updated')
      } else {
        if (!form.password) { toast.error('Password required'); return setSaving(false) }
        const payload = { ...form }
        delete payload.email
        const r = await api.post('/users', payload)
        toast.success(`User created! Employee ID: ${r.data.employee_id}`)
      }
      setModal(false); setEditing(null); setForm({ ...EMPTY }); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
    setSaving(false)
  }

  const toggleUser  = async (id) => { try { await api.patch(`/users/${id}/toggle`); load() } catch { toast.error('Failed') } }
  const handleDelete = async (id) => { try { await api.delete(`/users/${id}`); toast.success('Deleted'); setDeleting(null); load() } catch { toast.error('Failed') } }

  const [showPwd, setShowPwd] = useState({})
  const roleColors = { admin: 'badge-gold', supervisor: 'badge-blue', driver: 'badge-green' }
  const viewUser = users.find(u => u.id === viewModal)
  if (loading) return <LoadingPage />

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" subtitle={`${users.length} users`}
        action={<button onClick={openAdd} className="btn-gold"><Plus size={16} />Add User</button>}
      />

      <div className="flex gap-3">
        <select className="select w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="supervisor">Supervisor</option>
          <option value="driver">Driver</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>User</th><th>Role</th><th>Employee ID</th><th>Password</th><th>Phone</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    {u.photo ? <img src={u.photo} className="w-9 h-9 rounded-full object-cover border border-dark-600" />
                      : <div className="w-9 h-9 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 text-sm font-bold">{u.name?.[0]}</div>}
                    <div><p className="font-medium">{u.name}</p></div>
                  </div>
                </td>
                <td><span className={roleColors[u.role]}>{u.role}</span></td>
                <td><span className="text-gold-400 font-mono font-semibold text-sm">{u.employee_id || '—'}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm text-gray-300">{showPwd[u.id] ? (u.plain_password || '—') : '••••••'}</span>
                    <button onClick={() => setShowPwd(p => ({ ...p, [u.id]: !p[u.id] }))} className="btn-ghost p-1">
                      {showPwd[u.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </td>
                <td className="text-gray-400">{u.phone || '—'}</td>
                <td className="text-gray-400">{u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN') : 'Never'}</td>
                <td><span className={u.is_active ? 'badge-green' : 'badge-red'}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="flex gap-1">
                    <button onClick={() => setViewModal(u.id)} className="btn-ghost px-2 py-1 text-blue-400"><Eye size={14} /></button>
                    <button onClick={() => openEdit(u)} className="btn-ghost px-2 py-1 text-gold-400"><Edit size={14} /></button>
                    <button onClick={() => toggleUser(u.id)} className="btn-ghost px-2 py-1">
                      {u.is_active ? <ToggleRight size={16} className="text-green-400" /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => setDeleting(u.id)} className="btn-ghost px-2 py-1 text-red-400"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => { setModal(false); setEditing(null) }} title={editing ? 'Edit User' : 'Add User'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-center">
            <div className="text-center">
              <PhotoUpload value={form.photo} onChange={v => f('photo', v)} folder="dgsystem/users" label="Photo" />
              <p className="text-gray-500 text-xs mt-1">Profile photo</p>
            </div>
          </div>

          {/* Basic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="label">Full Name *</label><input className="input" required value={form.name} onChange={e => { f('name', e.target.value); if (!editing && !form.employee_id) f('employee_id', generatePreviewId(e.target.value, form.role)) }} /></div>
            <div><label className="label">Role *</label>
              <select className="select" value={form.role} onChange={e => { f('role', e.target.value); if (!editing && form.name) f('employee_id', generatePreviewId(form.name, e.target.value)) }}>
                <option value="supervisor">Supervisor</option><option value="driver">Driver</option><option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Employee ID (Login Credential)</label>
              <input className="input font-mono" value={form.employee_id} onChange={e => f('employee_id', e.target.value)} placeholder="Auto-generated from name" />
            </div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => f('phone', e.target.value)} /></div>
            <div className="col-span-2"><label className="label">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" className="input" value={form.password} onChange={e => f('password', e.target.value)} placeholder={editing ? 'Leave blank to keep current' : 'Set password'} />
            </div>
          </div>
          {!editing && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-blue-400 text-sm font-medium">ℹ️ Share this Employee ID and password with the employee. They will use it to login.</p>
              {form.employee_id && <p className="text-blue-300 text-xs mt-1 font-mono">Login ID: {form.employee_id}</p>}
            </div>
          )}

          {/* KYC */}
          <div className="border-t border-dark-700 pt-4">
            <p className="text-white font-medium mb-3">Identity Documents</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Aadhar Number</label><input className="input" value={form.aadhar_number} onChange={e => f('aadhar_number', e.target.value)} placeholder="12-digit" /></div>
              <div><label className="label">Emergency Contact</label><input className="input" value={form.emergency_contact || ''} onChange={e => f('emergency_contact', e.target.value)} /></div>
            </div>
          </div>

          {/* License */}
          {(form.role === 'supervisor' || form.role === 'driver') && (
            <div className="border-t border-dark-700 pt-4">
              <p className="text-white font-medium mb-3">License Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">License Number</label><input className="input" value={form.license_number} onChange={e => f('license_number', e.target.value)} /></div>
                <div><label className="label">License Expiry</label><input type="date" className="input" value={form.license_expiry} onChange={e => f('license_expiry', e.target.value)} /></div>
                <div className="col-span-2"><label className="label">License Photo</label>
                  <DocUpload value={form.license_photo} onChange={v => f('license_photo', v)} folder="dgsystem/licenses" label="Upload license" />
                </div>
              </div>
            </div>
          )}

          {/* Bank */}
          <div className="border-t border-dark-700 pt-4">
            <p className="text-white font-medium mb-3">Bank Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Account Number</label><input className="input" value={form.bank_account} onChange={e => f('bank_account', e.target.value)} /></div>
              <div><label className="label">IFSC Code</label><input className="input" value={form.bank_ifsc} onChange={e => f('bank_ifsc', e.target.value)} /></div>
              <div className="col-span-2"><label className="label">Bank Name</label><input className="input" value={form.bank_name} onChange={e => f('bank_name', e.target.value)} /></div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn-gold">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="User Details" size="lg">
        {viewUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {viewUser.photo ? <img src={viewUser.photo} className="w-16 h-16 rounded-xl object-cover border border-dark-600" />
                : <div className="w-16 h-16 rounded-xl bg-gold-500/20 flex items-center justify-center text-gold-400 text-2xl font-bold">{viewUser.name?.[0]}</div>}
              <div><h3 className="text-white font-bold text-xl">{viewUser.name}</h3><span className={roleColors[viewUser.role]}>{viewUser.role}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-dark-800 rounded-lg p-2.5">
                <p className="text-gray-400 text-xs">Employee ID</p>
                <p className="text-gold-400 font-mono font-semibold">{viewUser.employee_id || '—'}</p>
              </div>
              <div className="bg-dark-800 rounded-lg p-2.5">
                <p className="text-gray-400 text-xs mb-1">Password</p>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-white">{showPwd['view'] ? (viewUser.plain_password || '—') : '••••••••'}</span>
                  <button onClick={() => setShowPwd(p => ({ ...p, view: !p.view }))} className="btn-ghost p-1">
                    {showPwd['view'] ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              {[['Phone', viewUser.phone],
                ['Aadhar', viewUser.aadhar_number], ['Emergency', viewUser.emergency_contact],
                ['License', viewUser.license_number], ['Lic. Expiry', viewUser.license_expiry],
                ['Bank', viewUser.bank_name], ['Account', viewUser.bank_account], ['IFSC', viewUser.bank_ifsc],
                ['Last Login', viewUser.last_login ? new Date(viewUser.last_login).toLocaleString('en-IN') : 'Never'],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} className="bg-dark-800 rounded-lg p-2.5">
                  <p className="text-gray-400 text-xs">{l}</p><p className="text-white font-medium">{v}</p>
                </div>
              ))}
            </div>
            {viewUser.license_photo && (
              <div><p className="text-gray-400 text-xs mb-1">License Photo</p>
                <img src={viewUser.license_photo} className="h-28 rounded-lg object-cover" /></div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} title="Delete User" message="Permanently delete this user?" />
    </div>
  )
}
