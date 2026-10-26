import { useState } from 'react'
import RunTracker from './run/RunTracker'

type RunView = { kind: 'home' } | { kind: 'track' }

export default function Run() {
  const [view, setView] = useState<RunView>({ kind: 'home' })

  if (view.kind === 'track') {
    return <RunTracker onSaved={() => setView({ kind: 'home' })} />
  }

  return (
    <>
      <div style={{ paddingTop: 22 }}>
        <div className="eyebrow">CHẠY BỘ</div>
        <h1 className="h">Lửa chạy chờ sẵn.</h1>
        <button className="btn" style={{ marginTop: 12 }} onClick={() => setView({ kind: 'track' })}>BẮT ĐẦU CHẠY</button>
        <p className="note">GPS + bản đồ vẽ đường real-time. Lịch sử buổi chạy lên ở commit kế tiếp.</p>
      </div>
    </>
  )
}
