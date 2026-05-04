import express from 'express';
import { authentication } from '../middleware/authMiddleware.js';
import { aiUsageLimit } from '../middleware/subscription.js';
import {
  analyzeResume,
  generateCoverLetter,
  interviewPrep,
  recommendJobs,
  semanticJobSearch
} from '../controllers/ai.controller.js';

const router = express.Router();

// Free + unrestricted: semantic search is always available
router.post('/search', semanticJobSearch);

// Auth + per-day quota for FREE users (PRO bypasses)
router.post('/recommend-jobs', authentication, aiUsageLimit, recommendJobs);
router.post('/analyze-resume', authentication, aiUsageLimit, analyzeResume);
router.post('/generate-cover-letter', authentication, aiUsageLimit, generateCoverLetter);
router.post('/interview-prep', authentication, aiUsageLimit, interviewPrep);

export default router;
