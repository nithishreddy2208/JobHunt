import { Trie } from '../utils/trie.js';
import { Job } from '../models/job.model.js';

class JobSearchService {
  constructor() {
    this.trie = new Trie();
    this.ready = false;
    this.refreshTimer = null;
  }

  async init({ refreshMs } = {}) {
    await this.refreshFromDb();

    if (refreshMs && Number(refreshMs) > 0) {
      this.refreshTimer = setInterval(() => {
        this.refreshFromDb().catch((err) => {
          console.error("Trie refresh failed:", err);
        });
      }, Number(refreshMs));
    }
  }

  async refreshFromDb() {
    const docs = await Job.find({}, { title: 1 }).lean();

    this.trie.clear();

    for (const doc of docs) {
      const title = doc?.title;
      if (!title || typeof title !== 'string') continue;

      this.trie.insert(title, {
        title: title.trim(),
        jobId: doc._id.toString()
      });
    }

    this.ready = true;
  }

  insertTitle(doc) {
    const title = doc?.title;
    if (!title || typeof title !== 'string') return;

    this.trie.insert(title, {
      title: title.trim(),
      jobId: doc._id.toString()
    });
  }

  suggest(prefix, { limit = 10 } = {}) {
    if (!this.ready) return [];

    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 10));
    return this.trie.searchByPrefix(prefix, safeLimit);
  }

  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const jobSearchService = new JobSearchService();