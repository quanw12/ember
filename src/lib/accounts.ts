import PocketBase from 'pocketbase'
import { activateSlotDb, createSlot, getActiveSlot, listSlots, setActiveSlot } from '../db'

const SAVED_URL_KEY = 'ember-backend-url'

export function envBackendUrl(): string | undefined {
  const value = import.meta.env.VITE_BACKEND_URL
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function savedBackendUrl(): string | undefined {
  try {
    const value = localStorage.getItem(SAVED_URL_KEY)?.trim()
    return value || undefined
  } catch {
    return undefined
  }
}

/** Địa chỉ đang dùng: địa chỉ người dùng lưu trên máy, rồi tới địa chỉ gắn lúc build. */
export function resolveBackendUrl(): string | undefined {
  return savedBackendUrl() || envBackendUrl()
}

export function normalizeBackendUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let url: URL
  try { url = new URL(trimmed) } catch { return null }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  const path = url.pathname.replace(/\/$/, '')
  return url.origin + (path === '/' ? '' : path)
}

export function isLoopbackUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.replace(/^\[|\]$/g, '').toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1'
  } catch {
    return false
  }
}

/** Máy trong mạng nhà: IP riêng hoặc tên .local. Điện thoại gọi được bằng HTTP nội bộ. */
export function isPrivateLanUrl(raw: string): boolean {
  if (isLoopbackUrl(raw)) return true
  try {
    const host = new URL(raw).hostname.replace(/^\[|\]$/g, '').toLowerCase()
    if (host.endsWith('.local')) return true
    const parts = host.split('.').map(Number)
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false
    const [a, b] = parts
    return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
  } catch {
    return false
  }
}

export const accounts = new PocketBase(resolveBackendUrl() || 'http://127.0.0.1:8090')

export function applyBackendUrl(raw: string): string {
  const url = normalizeBackendUrl(raw)
  if (!url) throw new Error('Địa chỉ máy chủ cần là http:// hoặc https:// và không kèm mật khẩu trong URL.')
  localStorage.setItem(SAVED_URL_KEY, url)
  if (accounts.baseURL.replace(/\/$/, '') !== url) {
    accounts.authStore.clear()
    accounts.baseURL = url
  }
  return url
}

export function clearSavedBackendUrl(): void {
  localStorage.removeItem(SAVED_URL_KEY)
  accounts.authStore.clear()
  accounts.baseURL = resolveBackendUrl() || 'http://127.0.0.1:8090'
}

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
