import dotenv from 'dotenv';
import { enqueueAiTask, aiQueue } from '../queues/ai.queue.js';
import { closeBullConnection } from '../config/queue.js';

dotenv.config();

const main = async () => {
  const id = await enqueueAiTask('noop', { hello: 'world', ts: Date.now() });
  console.log(`enqueued ai job id=${id}`);

  await aiQueue.close();
  await closeBullConnection();
  process.exit(0);
};

main().catch((err) => {
  console.error('test-ai-queue failed:', err);
  process.exit(1);
});
