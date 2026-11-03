import PocketBase from 'pocketbase'
import { activateSlotDb, createSlot, getActiveSlot, listSlots, setActiveSlot } from '../db'

export const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined
export const accounts = new PocketBase(backendUrl || 'http://127.0.0.1:8090')
export function openAccountProfile() {
  const user = accounts.authStore.record
  if (!user) throw new Error('Bạn cần đăng nhập trước.')
  const key = `ember-account-slot:${accounts.baseURL}:${user.id}`
  let id = localStorage.getItem(key)
  if (!listSlots().some(slot => slot.id === id)) {
    id = createSlot(String(user.name || user.email)).id
    localStorage.setItem(key, id)
  } else { setActiveSlot(id!); activateSlotDb(id!) }
}
export function isAccountProfile() {
  const user = accounts.authStore.record
  return Boolean(user && localStorage.getItem(`ember-account-slot:${accounts.baseURL}:${user.id}`) === getActiveSlot()?.id)
}
