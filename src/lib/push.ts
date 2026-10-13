import { supabase } from './supabase'

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window

export async function enablePush() {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications are blocked for this site.')
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  })
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint: sub.endpoint, subscription: sub.toJSON() }, { onConflict: 'endpoint' })
  if (error) throw error
}
