import { useState } from 'react'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { uploadFile } from '../../utils/upload'
import toast from 'react-hot-toast'

// Single photo uploader
export function PhotoUpload({ value, onChange, folder = 'dgsystem', label = 'Photo', className = '' }) {
  const [uploading, setUploading] = useState(false)

  const handle = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, folder)
      onChange(url)
      toast.success('Uploaded!')
    } catch { toast.error('Upload failed') }
    setUploading(false)
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <label className="cursor-pointer relative group">
        {value
          ? <div className="relative">
              <img src={value} className="w-20 h-20 rounded-xl object-cover border-2 border-gold-500/50" alt="photo" />
              <button type="button" onClick={e => { e.preventDefault(); onChange('') }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
                <X size={10} />
              </button>
            </div>
          : <div className="w-20 h-20 rounded-xl bg-dark-800 border-2 border-dashed border-dark-500 group-hover:border-gold-500/50 flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors">
              {uploading ? <Loader2 size={20} className="animate-spin text-gold-500" /> : <><Camera size={20} /><span className="text-xs">{label}</span></>}
            </div>
        }
        {!uploading && <input type="file" accept="image/*" className="hidden" onChange={handle} />}
      </label>
    </div>
  )
}

// Document/file upload (shows filename or thumbnail)
export function DocUpload({ value, onChange, folder = 'dgsystem', label = 'Document' }) {
  const [uploading, setUploading] = useState(false)

  const handle = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file, folder)
      onChange(url)
      toast.success('Uploaded!')
    } catch { toast.error('Upload failed') }
    setUploading(false)
  }

  return (
    <label className="cursor-pointer flex items-center gap-2 p-2.5 bg-dark-800 border border-dark-600 hover:border-gold-500/50 rounded-lg transition-colors">
      {uploading
        ? <Loader2 size={16} className="animate-spin text-gold-500 flex-shrink-0" />
        : <Upload size={16} className="text-gray-400 flex-shrink-0" />
      }
      {value
        ? <img src={value} className="h-8 w-12 object-cover rounded" alt="doc" />
        : <span className="text-gray-400 text-sm">{uploading ? 'Uploading...' : label}</span>
      }
      {value && <a href={value} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-gold-500 text-xs hover:underline ml-auto">View</a>}
      {!uploading && <input type="file" accept="image/*,.pdf" className="hidden" onChange={handle} />}
    </label>
  )
}

// Multiple photos uploader
export function MultiPhotoUpload({ value = [], onChange, folder = 'dgsystem', label = 'Add Photos', max = 5 }) {
  const [uploading, setUploading] = useState(false)

  const handle = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map(f => uploadFile(f, folder)))
      onChange([...value, ...urls].slice(0, max))
      toast.success(`${urls.length} photo(s) uploaded`)
    } catch { toast.error('Upload failed') }
    setUploading(false)
  }

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative">
            <img src={url} className="w-16 h-16 rounded-lg object-cover border border-dark-600" />
            <button type="button" onClick={() => remove(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white">
              <X size={10} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="w-16 h-16 rounded-lg bg-dark-800 border-2 border-dashed border-dark-500 hover:border-gold-500/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
            {uploading ? <Loader2 size={16} className="animate-spin text-gold-500" /> : <><Upload size={14} className="text-gray-500" /><span className="text-xs text-gray-500 mt-0.5">{label}</span></>}
            {!uploading && <input type="file" accept="image/*" multiple className="hidden" onChange={handle} />}
          </label>
        )}
      </div>
    </div>
  )
}
