import { API_BASE } from '@/context/constants'
import heritApi from '@/helpers/heritApi'

/** Root-relative upload URLs need the API host in development. */
export const mediaSrc = (url) => (!url ? '' : /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`)

/** Smallest variant URL for a thumbnail. */
export const thumbSrc = (m) => {
  const set = m?.public?.srcset || []
  return mediaSrc(set[0]?.url || m?.public?.url)
}

const MAX_SIDE = 2400

/**
 * Shrink a large photo to 2400px on its longest side before upload (less to
 * send, less server memory). The server re-encodes every upload anyway, which
 * also removes EXIF and GPS data. Files that are small enough go as they are.
 */
export const downscale = async (file) => {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') return file
  let bmp
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  const { width, height } = bmp
  if (Math.max(width, height) <= MAX_SIDE) {
    bmp.close?.()
    return file
  }
  const scale = MAX_SIDE / Math.max(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close?.()
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise((r) => canvas.toBlob(r, type, 0.9))
  if (!blob) return file
  return new File([blob], file.name.replace(/\.\w+$/, type === 'image/png' ? '.png' : '.jpg'), { type })
}

/** Upload one image with its alt text; resolves the media record. */
export const uploadImage = async (file, alt = '') => {
  const small = await downscale(file)
  const r = await heritApi.cms.mediaUpload(small, { alt_text: alt })
  return r.media
}
