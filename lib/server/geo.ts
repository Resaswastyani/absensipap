import 'server-only'
import { query } from './db'

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}

type Location = { id: number; name: string; latitude: number; longitude: number; radius_m: number }

/** Mencari lokasi kantor aktif terdekat dan menilai apakah titik berada dalam radius. */
export async function nearestOffice(lat: number, lng: number) {
  const offices = await query<Location>('SELECT id, name, latitude, longitude, radius_m FROM office_locations WHERE is_active = 1')
  if (offices.length === 0) return null
  let best: (Location & { distance: number }) | null = null
  for (const o of offices) {
    const distance = distanceMeters(lat, lng, Number(o.latitude), Number(o.longitude))
    if (!best || distance - o.radius_m < best.distance - best.radius_m) best = { ...o, distance }
  }
  return best ? { ...best, inside: best.distance <= best.radius_m } : null
}
