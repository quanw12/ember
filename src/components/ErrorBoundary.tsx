import { Component, type ReactNode, type ErrorInfo } from 'react'

export function RecoveryScreen({ message }: { message?: string }) {
  return <main className="app recovery-screen">
    <div className="eyebrow">EMBER · KHÔI PHỤC</div>
    <h1 className="h">Cùng đưa bạn trở lại.</h1>
    <p className="meta">App chưa thể mở dữ liệu. Thử tải lại; dữ liệu tập luyện vẫn được giữ trên thiết bị.</p>
    {message && <p className="note" role="alert">{message}</p>}
    <button className="btn" onClick={() => location.reload()}>Thử mở lại</button>
    <p className="note">Nếu lỗi lặp lại, giữ nguyên dữ liệu trình duyệt và gửi nội dung lỗi cho người phát triển.</p>
  </main>
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('EMBER render error:', error.stack, info.componentStack) }
  render() { return this.state.error ? <RecoveryScreen message={this.state.error.message} /> : this.props.children }
}
