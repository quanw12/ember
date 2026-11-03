import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { FlameIcon } from './icons'

interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function AppStatus({ busy = false }: { busy?: boolean }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const [help, setHelp] = useState(false)
  const [error, setError] = useState('')
  const { needRefresh: [refresh], offlineReady: [ready], updateServiceWorker } = useRegisterSW()
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine)
    const beforeInstall = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent) }
    const installed = () => { setInstall(null); setHelp(false) }
    const rejected = (event: PromiseRejectionEvent) => {
      setError(event.reason instanceof Error ? event.reason.message : 'Thao tác chưa hoàn tất. Vui lòng thử lại.')
    }
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', installed)
    window.addEventListener('unhandledrejection', rejected)
    return () => {
      window.removeEventListener('online', connectivity)
      window.removeEventListener('offline', connectivity)
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', installed)
      window.removeEventListener('unhandledrejection', rejected)
    }
  }, [])
  const standalone = matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return <>
    <header className="brandbar">
      <a className="brandmark" href="#main-content" aria-label="EMBER — đến nội dung"><FlameIcon /><span>EMBER<small>KEEP THE FIRE · BETA</small></span></a>
      <div className="brand-actions">
        <span className={`connection ${online ? '' : 'offline'}`}><i />{!online ? 'Ngoại tuyến' : ready ? 'Sẵn sàng offline' : 'Trên thiết bị'}</span>
        {!standalone && <button className="install-button" onClick={() => setHelp(!help)} aria-expanded={help}>Cài app ↗</button>}
      </div>
    </header>
    {help && <section className="card install-card" aria-label="Cài EMBER">
      <div className="eyebrow">LUÔN SẴN SÀNG BÊN BẠN</div>
      <h2 className="h">Mang EMBER ra màn hình chính.</h2>
      <p className="meta">iPhone: mở bằng Safari → Chia sẻ → Thêm vào Màn hình chính.<br />Android: mở bằng Chrome → menu ⋮ → Cài đặt ứng dụng.</p>
      {install && <button className="btn" onClick={async () => { try { await install.prompt(); await install.userChoice; setInstall(null) } catch { setError('Chưa thể cài app. Hãy thử menu của trình duyệt.') } }}>Cài EMBER</button>}
      <p className="note">Mở app có mạng lần đầu để chuẩn bị dùng offline. Dữ liệu nằm trên trình duyệt và thiết bị này; hãy giữ một bản backup.</p>
    </section>}
    {!online && <p className="status-banner" role="status">Bạn đang offline. Nhật ký vẫn lưu trên máy; bản đồ và ảnh chưa tải cần có mạng.</p>}
    {refresh && <div className="status-banner" role="status">
      {busy ? 'Có bản mới. Bạn có thể cập nhật sau khi lưu buổi chạy.' : 'Phiên bản mới đã sẵn sàng. Lưu nội dung đang nhập trước khi cập nhật.'}
      <button disabled={busy} onClick={() => { if (window.confirm('Đã lưu nội dung đang nhập? Cập nhật sẽ tải lại app.')) void updateServiceWorker(true).catch(() => setError('Cập nhật chưa thành công. Thử lại khi có mạng.')) }}>Cập nhật</button>
    </div>}
    {error && <div className="status-banner error" role="alert"><span>Chưa lưu được thao tác: {error}</span><button onClick={() => setError('')}>Đóng</button></div>}
  </>
}
