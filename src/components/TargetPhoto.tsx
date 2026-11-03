import { useEffect, useState } from 'react'
import type { StoredImage } from '../db'
import { imageBlob } from '../lib/image'

/** Ảnh Blob hiển thị gọn (mục tiêu body,…) — tự giải phóng object URL. */
export default function TargetPhoto({ blob, size = 64 }: { blob: StoredImage; size?: number }) {
  const [url, setUrl] = useState<string | undefined>()

  useEffect(() => {
    const u = URL.createObjectURL(imageBlob(blob))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])

  if (!url) return null
  return <img src={url} alt="Body mục tiêu" style={{ width: size, height: size, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--line-2)' }} />
}
