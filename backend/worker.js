import dotenv from 'dotenv';
import { connectDb } from './config/db.js';
import { startAllWorkers, stopAllWorkers } from './workers/index.js';
import { closeBullConnection } from './config/queue.js';

dotenv.config();

const main = async () => {
  await connectDb();
  console.log('[worker-process] MongoDB connected');

  startAllWorkers();
  console.log('[worker-process] workers running. Press Ctrl+C to stop.');
};

const shutdown = async () => {
  console.log('\n[worker-process] shutting down...');
  try {
    await stopAllWorkers();
    await closeBullConnection();
  } catch (err) {
    console.error('[worker-process] shutdown error:', err?.message || err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error('[worker-process] failed to start:', err);
  process.exit(1);
});
