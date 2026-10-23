import { assertProductionConfig, config, configWarnings } from './config.js';
import { createApp } from './app.js';
import { pool } from './db/pool.js';
import { mpesaConfigured } from './services/mpesa.js';
import { paystackConfigured } from './services/paystack.js';
import { startBackgroundJobs } from './services/jobs.js';

assertProductionConfig();

const server = createApp().listen(config.port, () => {
  console.log(`ZawadiMart API listening on port ${config.port} (${config.nodeEnv})`);
  const gateway = (name, ready) => `${name}: ${ready ? 'configured' : 'not configured'}`;
  console.log(config.paymentSimulation
    ? 'Payments: SIMULATION mode (development only)'
    : `Payments: ${gateway('M-Pesa', mpesaConfigured())}, ${gateway('Paystack cards', paystackConfigured())}, cash on delivery: enabled`);
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
