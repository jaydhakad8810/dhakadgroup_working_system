import api from './api'

export const uploadFile = async (file, folder = 'dgsystem') => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('folder', folder)
  const { data } = await api.post('/upload/single', fd)
  return data.url
}

export const uploadBase64 = async (base64, folder = 'dgsystem') => {
  const { data } = await api.post('/upload/base64', { data: base64, folder })
  return data.url
}

// Reusable photo upload button component logic
export const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})
