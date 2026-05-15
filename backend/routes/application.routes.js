import express from 'express';
import { authentication, jobSeekerOnly, recruiterOnly } from '../middleware/authMiddleware.js';
import { applicationLimit } from '../middleware/subscription.js';
import { applyJob, getApplicants, getAppliedJobs, updateStatus, getApplicantResume } from '../controllers/application.controller.js';

const router=express.Router();

router.post('/apply/:id',authentication,jobSeekerOnly,applicationLimit,applyJob);
router.get('/get',authentication,jobSeekerOnly,getAppliedJobs);
router.get('/:id/applicants',authentication,recruiterOnly,getApplicants);
router.put('/status/:id/update',authentication,recruiterOnly,updateStatus);
router.get('/:id/resume',authentication,recruiterOnly,getApplicantResume);

export default router;