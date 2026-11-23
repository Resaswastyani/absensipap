import 'server-only'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { ApiError } from './api'

const MAX_BYTES = 1.5 * 1024 * 1024

function uploadDir() {
  return path.resolve(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'storage', 'photos'))
}

/** Simpan foto verifikasi (data URL JPEG) di luar folder publik dengan nama acak. */
export async function savePhoto(dataUrl: string, prefix: string) {
  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!match) throw new ApiError(422, 'Foto harus berformat JPEG.')
  const buffer = Buffer.from(match[1], 'base64')
  if (buffer.length > MAX_BYTES) throw new ApiError(413, 'Ukuran foto terlalu besar.')
  if (buffer.length < 2000 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    throw new ApiError(422, 'Foto tidak valid.')
  }
  const now = new Date()
  const sub = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const dir = path.join(uploadDir(), sub)
  await mkdir(dir, { recursive: true, mode: 0o750 })
  const name = `${prefix}-${randomBytes(12).toString('hex')}.jpg`
  await writeFile(path.join(dir, name), buffer, { mode: 0o640 })
  return `${sub}/${name}`
}

export async function readPhoto(relative: string) {
  if (!/^\d{4}-\d{2}\/[a-z0-9-]+\.jpg$/.test(relative)) throw new ApiError(404, 'Foto tidak ditemukan.')
  const full = path.join(uploadDir(), relative)
  if (!full.startsWith(uploadDir() + path.sep)) throw new ApiError(404, 'Foto tidak ditemukan.')
  try {
    return await readFile(full)
  } catch {
    throw new ApiError(404, 'Foto tidak ditemukan.')
  }
}
