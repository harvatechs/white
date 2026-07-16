import { PrismaClient } from '@prisma/client'

// Cache-bust key: bump this when the Prisma schema changes to force a fresh
// client instance in dev mode (otherwise the global singleton keeps the old
// generated client that may not know about new models).
const SCHEMA_VERSION = 'v5-algorithm'

const globalForPrisma = globalThis as unknown as {
  __wsPrisma?: { version: string; client: PrismaClient }
}

export const db =
  !globalForPrisma.__wsPrisma || globalForPrisma.__wsPrisma.version !== SCHEMA_VERSION
    ? (() => {
        const client = new PrismaClient({ log: ['query'] })
        if (process.env.NODE_ENV !== 'production') {
          globalForPrisma.__wsPrisma = { version: SCHEMA_VERSION, client }
        }
        return client
      })()
    : globalForPrisma.__wsPrisma.client
