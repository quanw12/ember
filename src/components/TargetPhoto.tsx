import { useEffect, useState } from 'react'

/** Ảnh Blob hiển thị gọn (mục tiêu body,…) — tự giải phóng object URL. */
export default function TargetPhoto({ blob, size = 64 }: { blob: Blob; size?: number }) {
  const [url, setUrl] = useState<string | undefined>()

  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])

  if (!url) return null
  return <img src={url} alt="Body mục tiêu" style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--line-2)' }} />
}
