import { useState, useEffect } from 'react'

export default function useDraftSave(key, initialData) {
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved ? { ...initialData, ...JSON.parse(saved) } : initialData
    } catch { return initialData }
  })
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!isDirty) return
    try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
  }, [data, key, isDirty])

  useEffect(() => {
    const handler = (e) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const update = (newData) => { setData(newData); setIsDirty(true) }
  const clearDraft = () => {
    try { localStorage.removeItem(key) } catch {}
    setIsDirty(false)
  }
  const hasDraft = (() => {
    try { return !!localStorage.getItem(key) } catch { return false }
  })()

  return { data, update, clearDraft, isDirty, hasDraft }
}
