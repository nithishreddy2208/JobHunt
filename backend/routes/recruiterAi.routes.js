import express from 'express';
import { authentication, recruiterOnly } from '../middleware/authMiddleware.js';
import {
  matchScoresForJob,
  candidateSummary,
  autoShortlist,
  jobAnalytics,
  optimizeJobDescription,
  generateEmail
} from '../controllers/recruiterAi.controller.js';

const router = express.Router();

// All recruiter AI endpoints require an authenticated recruiter.
router.use(authentication, recruiterOnly);

// Match-score listing per job
router.get('/match-score/:jobId', matchScoresForJob);

// AI-generated candidate summary (per application)
router.get('/candidate-summary/:applicationId', candidateSummary);
router.post('/candidate-summary/:applicationId', candidateSummary);

// Smart shortlist for a job
router.get('/shortlist/:jobId', autoShortlist);

// Recruiter analytics for a job
router.get('/analytics/:jobId', jobAnalytics);

// JD optimizer
router.post('/optimize-jd', optimizeJobDescription);

// Recruiter email generator
router.post('/generate-email', generateEmail);

export default router;
