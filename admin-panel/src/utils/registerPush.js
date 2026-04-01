import api from './api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function registerPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
    // Register dedicated push service worker for admin panel
    const reg = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' })
    await navigator.serviceWorker.ready
    const { data } = await api.get('/notifications/vapid-public-key')
    if (!data.publicKey) return
    const existing = await reg.pushManager.getSubscription()
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey)
    })
    await api.post('/notifications/subscribe', sub.toJSON())
  } catch (_) {}
}
