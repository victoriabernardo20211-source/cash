import pg from 'pg'

/**
 * Pool único por instância da função. Em produção use a connection string
 * *pooled* do Neon (host com "-pooler"), que aguenta muitas conexões curtas.
 */
let pool: pg.Pool | undefined

export function db(): pg.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL não configurada.')
    pool = new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 })
  }
  return pool
}

export async function transacao<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await db().connect()
  try {
    await c.query('begin')
    const r = await fn(c)
    await c.query('commit')
    return r
  } catch (e) {
    await c.query('rollback').catch(() => {})
    throw e
  } finally {
    c.release()
  }
}
