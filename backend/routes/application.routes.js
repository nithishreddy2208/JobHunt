import express from 'express';
import { authentication, jobSeekerOnly, recruiterOnly } from '../middleware/authMiddleware.js';
import { applyJob, getApplicants, getAppliedJobs, updateStatus } from '../controllers/application.controller.js';

const router=express.Router();

router.post('/apply/:id',authentication,jobSeekerOnly,applyJob);
router.get('/get',authentication,jobSeekerOnly,getAppliedJobs);
router.get('/:id/applicants',authentication,recruiterOnly,getApplicants);
router.put('/status/:id/update',authentication,recruiterOnly,updateStatus);

export default router;