import express from 'express';
import { authentication, recruiterOnly } from '../middleware/authMiddleware.js';
import { getAdminJobs, getAllJobs, getJobById, postJob, suggestJobTitles } from '../controllers/job.controller.js';

const router=express.Router();

router.post('/post',authentication,recruiterOnly,postJob);
router.get('/get',authentication,getAllJobs);
router.get('/getadminjobs',authentication,recruiterOnly,getAdminJobs);
router.get('/suggest',suggestJobTitles);
router.get('/get/:id',authentication,getJobById);

export default router;