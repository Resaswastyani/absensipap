# PAP Attendance

Sistem absensi karyawan **PT Pandawa Amerta Packindo** — check-in/check-out dengan verifikasi **foto wajah** dan **lokasi GPS (geofence)**, panel admin HR, serta portal karyawan.

Produksi: https://absensi.pandawaamerta.co.id

## Fitur

**Karyawan** (`/karyawan`)
- Check-in & check-out dengan kamera + validasi radius lokasi kantor (dicek di server)
- Status otomatis *hadir / terlambat* berdasarkan shift & toleransi
- Riwayat absensi bulanan + foto verifikasi
- Pengajuan izin, sakit, cuti, koreksi absensi
- Profil & ganti kata sandi

**Admin** (`/admin`)
- Dashboard: statistik hari ini, tren 7 hari, kehadiran per divisi, aktivitas terbaru
- Manajemen karyawan (tambah, ubah, nonaktifkan, reset kata sandi, peran admin/karyawan)
- Rekap absensi harian, lihat foto, koreksi manual (wajib alasan), ekspor CSV bulanan
- Persetujuan pengajuan (yang disetujui otomatis tercatat di absensi)
- Pengaturan: lokasi kantor & radius, shift kerja, divisi, log aktivitas (audit)

## Keamanan
- Password di-hash **bcrypt** (cost 12); kata sandi awal wajib diganti saat login pertama
- Sesi **JWT HS256** di cookie `httpOnly`, `Secure`, `SameSite=Lax`, berlaku 12 jam; dapat dicabut (token version) saat ganti sandi / reset / nonaktif
- Akses berbasis peran di 3 lapis: `proxy.ts`, layout server, dan setiap API route
- Proteksi CSRF (cek `Origin` + header `X-Requested-With`)
- Rate limit login (5 gagal/15 menit per akun, 20 per IP) + `limit_req` Nginx
- Validasi input dengan **zod**, query terparameter (anti SQL injection)
- Foto disimpan di luar folder publik, nama acak, hanya bisa dilihat pemilik/admin
- Waktu & geofence dihitung di server (bukan dari jam/lokasi klien semata)
- Header keamanan: CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy
- Audit log untuk semua aksi penting; ekspor CSV aman dari formula injection

## Teknologi
Next.js 16 (App Router, Route Handlers sebagai API) · React 19 · MariaDB/MySQL (`mysql2`) · `jose` · `bcryptjs` · `zod` · CSS kustom responsif (mobile, tablet, desktop, mode gelap)

## Pengembangan lokal
```bash
cp .env.example .env        # isi DB_*, SESSION_SECRET, SEED_ADMIN_PASSWORD
pnpm install
pnpm db:migrate             # buat tabel + admin awal
pnpm dev
```

## Struktur API
| Method | Endpoint | Akses |
|---|---|---|
| POST | `/api/auth/login`, `/api/auth/logout`, `/api/auth/change-password` | publik / login |
| GET | `/api/auth/me` | login |
| GET | `/api/attendance/today`, `/api/attendance/history?month=YYYY-MM` | karyawan |
| POST | `/api/attendance/check-in`, `/api/attendance/check-out` | karyawan |
| GET | `/api/attendance/:id/photo?kind=in\|out` | pemilik / admin |
| GET, POST | `/api/leave-requests` · DELETE `/api/leave-requests/:id` | karyawan |
| PATCH | `/api/profile` | login |
| GET | `/api/admin/dashboard`, `/api/admin/options`, `/api/admin/audit-logs` | admin |
| GET, POST | `/api/admin/employees` · PATCH, DELETE `/:id` · POST `/:id/reset-password` | admin |
| GET, POST | `/api/admin/attendance` · GET `/api/admin/attendance/export?month=` | admin |
| GET | `/api/admin/leave-requests` · PATCH `/:id` | admin |
| CRUD | `/api/admin/locations`, `/api/admin/shifts`, `/api/admin/departments` | admin |

## Deploy (VPS)
Konfigurasi ada di folder [`deploy/`](deploy): service systemd (`pap-absensi`, port 3002), konfigurasi Nginx, dan `deploy.sh` untuk update.

```bash
bash /home/absensi/app/deploy/deploy.sh
```
