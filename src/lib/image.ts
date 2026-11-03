import type { StoredImage } from '../db'

export function imageBlob(image: StoredImage): Blob {
  return image instanceof Blob ? image : new Blob([image.data], { type: image.type })
}

export async function imageBytes(blob: Blob): Promise<StoredImage> {
  return { data: new Uint8Array(await blob.arrayBuffer()), type: blob.type }
}

/** Compress to 1024px JPEG and store bytes: some WebKit IDB builds reject Blobs. */
export async function compressImage(file: File): Promise<StoredImage> {
  const bitmap = await createImageBitmap(file)
  const max = 1024
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close(); throw new Error('Thiết bị không hỗ trợ xử lý ảnh. Hãy thử trình duyệt khác.') }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Không thể nén ảnh. Thử một ảnh khác.')), 'image/jpeg', 0.85))
  return imageBytes(blob)
}
