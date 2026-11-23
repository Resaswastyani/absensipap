import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter.')
  .max(100, 'Kata sandi terlalu panjang.')
  .regex(/[A-Za-z]/, 'Kata sandi harus mengandung huruf.')
  .regex(/[0-9]/, 'Kata sandi harus mengandung angka.')

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid.')
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format bulan tidak valid.')
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format jam tidak valid.')
