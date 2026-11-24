const { join } = require('path');

// Keep Chrome inside the project so hosts like Render ship it with the build.
// Vercel never runs Puppeteer (the worker does), so skip the ~150MB download there.
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  skipDownload: process.env.VERCEL === '1',
};
