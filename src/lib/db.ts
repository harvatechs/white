import { PrismaClient } from '@prisma/client'

// Cache-bust key: bump this when the Prisma schema changes to force a fresh
// client instance in dev mode (otherwise the global singleton keeps the old
// generated client that may not know about new models).
const SCHEMA_VERSION = 'v8-production'

const globalForPrisma = globalThis as unknown as {
  __wsPrisma?: { version: string; client: PrismaClient }
  __wsDbInitPromise?: Promise<void>
}

// Self-healing database initialization: guarantees all tables exist on cold boot (Docker / fresh clones)
async function ensureTables(client: PrismaClient) {
  try {
    await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
    await client.$queryRawUnsafe('PRAGMA synchronous = NORMAL;')
    await client.$queryRawUnsafe('PRAGMA busy_timeout = 5000;')

    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SearchHistory" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL DEFAULT '',
        "query" TEXT NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'web',
        "resultsCount" INTEGER NOT NULL DEFAULT 0,
        "clicked" BOOLEAN NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchHistory_sessionId_idx" ON "SearchHistory"("sessionId");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchHistory_query_idx" ON "SearchHistory"("query");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchHistory_createdAt_idx" ON "SearchHistory"("createdAt");`)

    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SearchClick" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL DEFAULT '',
        "query" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "host" TEXT NOT NULL,
        "position" INTEGER NOT NULL,
        "category" TEXT NOT NULL DEFAULT 'web',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchClick_sessionId_idx" ON "SearchClick"("sessionId");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchClick_query_idx" ON "SearchClick"("query");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SearchClick_host_idx" ON "SearchClick"("host");`)

    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarkovNode" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "token" TEXT NOT NULL,
        "frequency" INTEGER NOT NULL DEFAULT 0,
        "startCount" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarkovNode_token_key" ON "MarkovNode"("token");`)

    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MarkovEdge" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "fromToken" TEXT NOT NULL,
        "toToken" TEXT NOT NULL,
        "weight" INTEGER NOT NULL DEFAULT 1,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "MarkovEdge_fromToken_toToken_key" ON "MarkovEdge"("fromToken", "toToken");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarkovEdge_fromToken_idx" ON "MarkovEdge"("fromToken");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "MarkovEdge_toToken_idx" ON "MarkovEdge"("toToken");`)

    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Preferences" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL,
        "theme" TEXT NOT NULL DEFAULT 'pure',
        "density" TEXT NOT NULL DEFAULT 'comfortable',
        "fontScale" TEXT NOT NULL DEFAULT 'base',
        "safeSearch" BOOLEAN NOT NULL DEFAULT 1,
        "openNewTab" BOOLEAN NOT NULL DEFAULT 1,
        "showFavicons" BOOLEAN NOT NULL DEFAULT 1,
        "markovEnabled" BOOLEAN NOT NULL DEFAULT 1,
        "suggestionCount" INTEGER NOT NULL DEFAULT 8,
        "accent" TEXT NOT NULL DEFAULT 'graphite',
        "customAccent" TEXT,
        "searchAlgorithm" TEXT NOT NULL DEFAULT 'relevance',
        "searchProvider" TEXT NOT NULL DEFAULT 'ddg',
        "searxngInstance" TEXT NOT NULL DEFAULT 'https://searx.be',
        "localFirst" BOOLEAN NOT NULL DEFAULT 1,
        "weightRecency" INTEGER NOT NULL DEFAULT 0,
        "weightDiversity" INTEGER NOT NULL DEFAULT 0,
        "weightPersonal" INTEGER NOT NULL DEFAULT 0,
        "spamFilter" BOOLEAN NOT NULL DEFAULT 1,
        "customBangs" TEXT DEFAULT '[]',
        "customSpamDomains" TEXT DEFAULT '[]',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Preferences_sessionId_key" ON "Preferences"("sessionId");`)

    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Bookmark" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL,
        "query" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "host" TEXT NOT NULL,
        "snippet" TEXT NOT NULL DEFAULT '',
        "category" TEXT NOT NULL DEFAULT 'web',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Bookmark_sessionId_url_key" ON "Bookmark"("sessionId", "url");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Bookmark_sessionId_idx" ON "Bookmark"("sessionId");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Bookmark_query_idx" ON "Bookmark"("query");`)

    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DomainRule" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL,
        "host" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await client.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "DomainRule_sessionId_host_key" ON "DomainRule"("sessionId", "host");`)
    await client.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "DomainRule_sessionId_idx" ON "DomainRule"("sessionId");`)
  } catch {
    // Database or tables already locked or initialized
  }
}

export const db =
  !globalForPrisma.__wsPrisma || globalForPrisma.__wsPrisma.version !== SCHEMA_VERSION
    ? (() => {
        const client = new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] })
        
        if (!globalForPrisma.__wsDbInitPromise) {
          globalForPrisma.__wsDbInitPromise = ensureTables(client)
        }
        
        if (process.env.NODE_ENV !== 'production') {
          globalForPrisma.__wsPrisma = { version: SCHEMA_VERSION, client }
        }
        return client
      })()
    : globalForPrisma.__wsPrisma.client
