import 'server-only'
import { z } from 'zod'

export const employeeFields = {
  nik: z.string().trim().min(3, 'NIK minimal 3 karakter.').max(30).regex(/^[A-Za-z0-9._-]+$/, 'NIK hanya boleh huruf, angka, titik, strip.'),
  name: z.string().trim().min(2, 'Nama wajib diisi.').max(120),
  email: z.union([z.string().trim().toLowerCase().email('Email tidak valid.').max(150), z.literal('')]).optional(),
  role: z.enum(['admin', 'employee']).default('employee'),
  can_attend: z.boolean().optional(),
  department_id: z.number().int().positive().nullable().optional(),
  shift_id: z.number().int().positive().nullable().optional(),
  position: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).regex(/^[0-9+\-\s]*$/, 'Nomor telepon tidak valid.').optional(),
}

export const locationSchema = z.object({
  name: z.string().trim().min(2, 'Nama lokasi wajib diisi.').max(120),
  address: z.string().trim().max(255).optional(),
  latitude: z.number({ message: 'Latitude wajib diisi.' }).min(-90).max(90),
  longitude: z.number({ message: 'Longitude wajib diisi.' }).min(-180).max(180),
  radius_m: z.number().int().min(20, 'Radius minimal 20 m.').max(5000, 'Radius maksimal 5000 m.'),
  is_active: z.boolean().optional(),
})

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format jam tidak valid.')
export const shiftSchema = z.object({
  name: z.string().trim().min(2, 'Nama shift wajib diisi.').max(60),
  start_time: time,
  end_time: time,
  late_tolerance_minutes: z.number().int().min(0).max(240),
})

export const departmentSchema = z.object({
  name: z.string().trim().min(2, 'Nama divisi wajib diisi.').max(100),
})
