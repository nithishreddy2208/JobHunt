import express from 'express';
import { authentication } from '../middleware/authMiddleware.js';
import {
  analyzeResume,
  generateCoverLetter,
  interviewPrep,
  recommendJobs,
  semanticJobSearch
} from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/search', semanticJobSearch);
router.post('/recommend-jobs', authentication, recommendJobs);
router.post('/analyze-resume', authentication, analyzeResume);
router.post('/generate-cover-letter', authentication, generateCoverLetter);
router.post('/interview-prep', authentication, interviewPrep);

export default router;
