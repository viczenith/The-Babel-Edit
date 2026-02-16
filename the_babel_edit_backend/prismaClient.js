// Support using a separate sqlite-generated client for local dev when DATABASE_URL is not provided
let PrismaClient;
const prismaOptions = {};

if (process.env.DATABASE_URL) {
  const pkg = await import('@prisma/client');
  PrismaClient = pkg.PrismaClient;
  prismaOptions.datasources = { db: { url: process.env.DATABASE_URL } };
} else {
  try {
    const sqlitePkg = await import('./node_modules/.prisma/client-sqlite/index.js');
    PrismaClient = sqlitePkg.PrismaClient;
  } catch (e) {
    const pkg = await import('@prisma/client');
    PrismaClient = pkg.PrismaClient;
  }
}

prismaOptions.log = process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'];

const prisma = new PrismaClient(prismaOptions);

export default prisma;