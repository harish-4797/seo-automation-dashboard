const { PrismaClient } = require('@prisma/client');

// One client per process (Next.js dev hot-reload would otherwise leak connections).
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = prisma;

module.exports = { prisma };
