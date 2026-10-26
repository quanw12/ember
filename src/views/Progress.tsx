import { useLiveQuery } from 'dexie-react-hooks'
import { db, movingAvg } from '../db'
import { TrendIcon } from '../components/icons'

export default function Progress() {
  const bodyLogs = useLiveQuery(() => db.bodyLogs.orderBy('date').toArray())
  if (!bodyLogs) return null

  const weights = bodyLogs.filter(l => l.weightKg != null)
  const latest = weights.length > 0 ? weights[weights.length - 1] : null
  const avg = movingAvg(weights.map(l => l.weightKg!))

  if (weights.length === 0) {
    return (
      <div className="place" style={{ paddingTop: 80 }}>
        <TrendIcon />
        <b>Chưa có dữ liệu cân nặng</b>
        Ghi cân nặng đầu tiên ở bước Onboarding, hoặc đợi biểu đồ tiến trình ở commit kế tiếp.
      </div>
    )
  }

  return (
    <>
      <div style={{ paddingTop: 22 }}>
        <div className="eyebrow">TIẾN TRÌNH</div>
        <h1 className="h">Con số đang đi đúng hướng chưa?</h1>
      </div>
      <div className="card">
        <div className="kv"><b>Cân gần nhất</b><span className="ringnum">{latest!.weightKg} kg · {latest!.date}</span></div>
        <div className="kv"><b>Trung bình trượt 7 ngày</b><span className="ringnum">{avg?.toFixed(1)} kg</span></div>
        <div className="kv"><b>Số lần ghi</b><span className="ringnum">{weights.length}</span></div>
        <p className="note">Đánh giá trend theo trung bình trượt — cân đột biến do nước sẽ không làm bạn hoảng. Biểu đồ, số đo và ảnh progress lên ở các commit kế tiếp.</p>
      </div>
    </>
  )
}
