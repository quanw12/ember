import { useEffect, useState } from 'react'
import { accounts, backendUrl, isAccountProfile, openAccountProfile } from '../lib/accounts'
import { exportBackup, parseBackup, restoreBackup } from '../lib/backup'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

export default function AccountPanel({ onChanged }: { onChanged: () => void }) {
  const [user, setUser] = useState(accounts.authStore.record)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [name, setName] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [google, setGoogle] = useState(false)
  useEffect(() => accounts.authStore.onChange(() => setUser(accounts.authStore.record)), [])
  useEffect(() => {
    if (!backendUrl) return
    accounts.collection('users').listAuthMethods().then(methods => setGoogle(methods.oauth2.providers.some(p => p.name === 'google'))).catch(() => {})
  }, [])
  const perform = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('')
    try { await action() } catch { setMessage('Thao tác chưa thành công. Kiểm tra kết nối, thông tin đăng nhập hoặc cấu hình máy chủ.') }
    finally { setBusy(false) }
  }
  const signIn = () => perform(async () => {
    if (mode === 'register') await accounts.collection('users').create({ email, password, passwordConfirm: password, name })
    await accounts.collection('users').authWithPassword(email, password)
    setPassword(''); openAccountProfile(); onChanged()
  })
  const sync = (restore: boolean) => perform(async () => {
    await accounts.collection('users').authRefresh()
    if (!isAccountProfile()) throw new Error('Wrong local profile')
    const userId = accounts.authStore.record!.id
    const rows = await accounts.collection('snapshots').getList(1, 1, { filter: accounts.filter('owner = {:owner}', { owner: userId }) })
    const row = rows.items[0]
    if (restore) {
      if (!row) { setMessage('Chưa có bản sao trên máy chủ.'); return }
      const token = await accounts.files.getToken()
      const response = await fetch(accounts.files.getURL(row, row.backup, { token }))
      if (!response.ok) throw new Error('Download failed')
      const backup = parseBackup(await response.text())
      if (!confirm('Thay thế dữ liệu hồ sơ tài khoản trên máy này bằng bản sao máy chủ? Hãy xuất backup trước nếu cần.')) return
      await restoreBackup(backup); onChanged()
    } else {
      if (row && !confirm('Thay thế bản sao đang có trên máy chủ bằng dữ liệu thiết bị này?')) return
      const json = await exportBackup()
      const file = new File([json], 'ember-backup.json', { type: 'application/json' })
      if (file.size > 50 * 1024 * 1024) throw new Error('Backup exceeds 50 MB')
      if (row) await accounts.collection('snapshots').update(row.id, { backup: file })
      else await accounts.collection('snapshots').create({ owner: userId, backup: file })
      setMessage('Đã lưu bản sao trên máy chủ của bạn.')
    }
  })
  return <section className="card" aria-label="Tài khoản EMBER">
    <div className="eyebrow">TÀI KHOẢN & MÁY CHỦ RIÊNG</div>
    {!backendUrl ? <p className="note">Đăng nhập máy chủ chưa khả dụng trong bản này. Bạn có thể tạo hồ sơ trên thiết bị để dùng ngay.</p> : <>
      {user ? <>
        <p className="meta">Đã đăng nhập: {String(user.email)}</p>
        <button className="btn ghost" disabled={busy} onClick={() => { openAccountProfile(); onChanged() }}>Mở hồ sơ tài khoản</button>
        <p className="note">Bản sao trên máy chủ được lưu/khôi phục theo thao tác của bạn, chưa tự đồng bộ liên tục giữa nhiều máy.</p>
        <button className="btn" disabled={busy || !isAccountProfile()} onClick={() => void sync(false)}>Lưu lên máy chủ</button>
        <button className="btn ghost" disabled={busy || !isAccountProfile()} onClick={() => void sync(true)}>Khôi phục từ máy chủ</button>
        <button className="btn ghost" disabled={busy} onClick={() => { accounts.authStore.clear(); setMessage('Đã đăng xuất. Dữ liệu trên thiết bị vẫn được giữ lại.'); setPassword('') }}>Đăng xuất</button>
      </> : <>
        <div className="seg" style={{ marginTop: 12 }}><button onClick={() => setMode('login')}>Đăng nhập</button><button onClick={() => setMode('register')}>Đăng ký</button></div>
        <form onSubmit={e => { e.preventDefault(); void signIn() }}>
          {mode === 'register' && <><label className="f" htmlFor="account-name">Tên hiển thị</label><input id="account-name" type="text" maxLength={60} required value={name} onChange={e => setName(e.target.value)} /></>}
          <label className="f" htmlFor="account-email">Email</label><input id="account-email" type="text" inputMode="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <label className="f" htmlFor="account-password">Mật khẩu (ít nhất 10 ký tự)</label><input id="account-password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={10} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn" style={{ marginTop: 12 }} disabled={busy}>{busy ? 'Đang xử lý…' : mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập email'}</button>
        </form>
        <button className="btn ghost" disabled={busy || !google} onClick={() => void perform(async () => {
          try {
            await accounts.collection('users').authWithOAuth2({ provider: 'google', ...(Capacitor.isNativePlatform() ? { urlCallback: async (url: string) => { await Browser.open({ url }) } } : {}) })
            openAccountProfile(); onChanged()
          } finally { if (Capacitor.isNativePlatform()) await Browser.close().catch(() => {}) }
        })}>Đăng nhập bằng Google</button>
        {!google && <p className="note">Google login cần chủ máy chủ cấu hình OAuth trước.</p>}
      </>}
    </>}
    {message && <p className="note" role="status">{message}</p>}
  </section>
}
