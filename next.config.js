/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Node-only packages used by the shared src/ modules; keep them out of the webpack bundle.
    serverComponentsExternalPackages: ['@prisma/client', 'bullmq', 'ioredis', 'puppeteer', 'cheerio', '@anthropic-ai/sdk'],
  },
};

module.exports = nextConfig;
