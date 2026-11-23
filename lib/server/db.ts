import 'server-only'
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'

declare global {
  // eslint-disable-next-line no-var
  var __papPool: Pool | undefined
}

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    waitForConnections: true,
    dateStrings: true,
    decimalNumbers: true,
    timezone: '+07:00',
    charset: 'utf8mb4',
  })
}

export const pool: Pool = globalThis.__papPool ?? createPool()
if (process.env.NODE_ENV !== 'production') globalThis.__papPool = pool

type Param = string | number | boolean | null | Date
export async function query<T = RowDataPacket>(sql: string, params: Param[] = []): Promise<T[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params)
  return rows as T[]
}

export async function queryOne<T = RowDataPacket>(sql: string, params: Param[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

export async function execute(sql: string, params: Param[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params)
  return result
}
