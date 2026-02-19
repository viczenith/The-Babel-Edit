import { PrismaClient } from '@prisma/client';

const prismaOptions = {};

if (process.env.DATABASE_URL) {
  prismaOptions.datasources = { db: { url: process.env.DATABASE_URL } };
}

prismaOptions.log = process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'];

const prisma = new PrismaClient(prismaOptions);

export default prisma;