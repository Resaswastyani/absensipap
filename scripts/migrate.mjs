// Menjalankan db/schema.sql lalu membuat akun admin awal bila belum ada.
// Pemakaian:  node --env-file=.env scripts/migrate.mjs
// Variabel admin awal (opsional): SEED_ADMIN_NIK, SEED_ADMIN_NAME, SEED_ADMIN_PASSWORD
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const sql = await readFile(path.join(root, 'db', 'schema.sql'), 'utf8')

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
})

await conn.query(sql)
console.log('Skema database siap.')

const [admins] = await conn.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")
if (admins[0].n === 0) {
  const nik = process.env.SEED_ADMIN_NIK ?? 'admin'
  const name = process.env.SEED_ADMIN_NAME ?? 'Administrator'
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password || password.length < 10) {
    console.error('SEED_ADMIN_PASSWORD wajib diisi (min. 10 karakter) untuk membuat admin awal.')
    process.exitCode = 1
  } else {
    const hash = await bcrypt.hash(password, 12)
    await conn.query(
      "INSERT INTO users (nik, name, password_hash, role, must_change_password) VALUES (?, ?, ?, 'admin', 0)",
      [nik, name, hash],
    )
    console.log(`Admin awal dibuat dengan NIK "${nik}". Ganti kata sandi melalui menu Profil.`)
  }
}

await conn.end()
