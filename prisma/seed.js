// npm run db:seed — demo clients. Idempotent (upsert on websiteUrl).
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CLIENTS = [
  {
    name: 'Example Dental Clinic',
    websiteUrl: 'https://example-dental-clinic.com', // the domain used by the brief's mock data (not a live site)
    businessType: 'Dental Clinic',
    city: 'Pune',
    state: 'Maharashtra',
    whatsapp: '+919800000001',
    email: 'demo@example-dental-clinic.com',
  },
  {
    name: 'Clove Dental',
    websiteUrl: 'https://www.clovedental.in',
    businessType: 'Dental Clinic',
    city: 'Pune',
    state: 'Maharashtra',
    whatsapp: '+919800000002',
    email: 'demo@clovedental.test',
  },
  {
    name: 'Sabka Dentist',
    websiteUrl: 'https://www.sabkadentist.com',
    businessType: 'Dental Clinic',
    city: 'Mumbai',
    state: 'Maharashtra',
    whatsapp: '+919800000003',
    email: 'demo@sabkadentist.test',
  },
];

async function main() {
  for (const c of CLIENTS) {
    await prisma.client.upsert({ where: { websiteUrl: c.websiteUrl }, create: c, update: c });
    console.log('Seeded', c.name);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
