import { assertProductionConfig, config, configWarnings } from './config.js';
import { createApp } from './app.js';
import { pool } from './db/pool.js';
import { paymentModes } from './services/payments.js';
import { startBackgroundJobs } from './services/jobs.js';

assertProductionConfig();

const server = createApp().listen(config.port, () => {
  console.log(`ZawadiMart API listening on port ${config.port} (${config.nodeEnv})`);
  const modes = paymentModes();
  const label = { live: 'live', mock: 'TEST MODE (no money charged)', off: 'not configured' };
  console.log(`Payments: M-Pesa: ${label[modes.mpesa.mode]}, cards: ${label[modes.card.mode]}, cash on delivery: enabled`);
  configWarnings().forEach((warning) => console.warn(`WARNING: ${warning}`));
});

const stopJobs = startBackgroundJobs();

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  stopJobs();
  server.close(() => pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
